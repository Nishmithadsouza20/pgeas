import bcrypt
import datetime as dt
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_all_company_dbs

companies_bp = Blueprint('companies', __name__)

def require_super_admin(uid):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] == 'super_admin'

@companies_bp.route('/', methods=['GET'])
@jwt_required()
def get_companies():
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    db        = get_db()
    companies = db.execute('SELECT * FROM pg_companies ORDER BY registered_at DESC').fetchall()
    db.close()
    return jsonify([dict(c) for c in companies])

@companies_bp.route('/stats', methods=['GET'])
@jwt_required()
def platform_stats():
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    db = get_db()
    total_companies  = db.execute('SELECT COUNT(*) as c FROM pg_companies').fetchone()['c']
    active_companies = db.execute('SELECT COUNT(*) as c FROM pg_companies WHERE status="active"').fetchone()['c']
    trial_companies  = db.execute('SELECT COUNT(*) as c FROM pg_companies WHERE status="trial"').fetchone()['c']
    mrr              = db.execute('SELECT COALESCE(SUM(subscription_amount),0) as s FROM pg_companies WHERE status="active"').fetchone()['s']
    by_plan = db.execute('SELECT plan, COUNT(*) as count FROM pg_companies GROUP BY plan').fetchall()
    by_city = db.execute('SELECT city, COUNT(*) as count FROM pg_companies GROUP BY city ORDER BY count DESC LIMIT 5').fetchall()
    recent  = db.execute('SELECT * FROM pg_companies ORDER BY registered_at DESC LIMIT 5').fetchall()
    db.close()

    # Aggregate operational stats across all company DBs
    total_residents = 0
    total_rooms     = 0
    occupied_rooms  = 0
    open_complaints = 0
    for cid, cdb in get_all_company_dbs():
        total_residents += cdb.execute('SELECT COUNT(*) as c FROM residents WHERE status="active"').fetchone()['c']
        total_rooms     += cdb.execute('SELECT COUNT(*) as c FROM rooms').fetchone()['c']
        occupied_rooms  += cdb.execute('SELECT COUNT(*) as c FROM rooms WHERE status="occupied"').fetchone()['c']
        open_complaints += cdb.execute('SELECT COUNT(*) as c FROM complaints WHERE status IN ("open","in-progress")').fetchone()['c']
        cdb.close()

    return jsonify({
        'total_companies':  total_companies,
        'active_companies': active_companies,
        'trial_companies':  trial_companies,
        'mrr':              mrr,
        'arr':              mrr * 12,
        'total_residents':  total_residents,
        'total_rooms':      total_rooms,
        'occupied_rooms':   occupied_rooms,
        'open_complaints':  open_complaints,
        'by_plan':          [dict(r) for r in by_plan],
        'by_city':          [dict(r) for r in by_city],
        'recent_clients':   [dict(r) for r in recent],
    })

@companies_bp.route('/', methods=['POST'])
@jwt_required()
def create_company():
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    db   = get_db()
    cur  = db.execute(
        '''INSERT INTO pg_companies
           (company_name,owner_name,owner_email,city,address,phone,plan,status,total_rooms,subscription_amount)
           VALUES (?,?,?,?,?,?,?,?,?,?)''',
        [data['company_name'], data['owner_name'], data['owner_email'],
         data.get('city',''), data.get('address',''), data.get('phone',''),
         data.get('plan','basic'), data.get('status','active'),
         data.get('total_rooms',0), data.get('subscription_amount',2999)]
    )
    db.commit()
    company = db.execute('SELECT * FROM pg_companies WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    # Create the isolated company DB
    get_company_db(cur.lastrowid)
    return jsonify(dict(company)), 201

PLAN_PRICES = {'basic': 2999, 'premium': 4999, 'enterprise': 7999}

def _log_email(db, company_id, to_email, to_name, subject, body, email_type='general'):
    db.execute(
        'INSERT INTO platform_emails (company_id,to_email,to_name,subject,body,email_type) VALUES (?,?,?,?,?,?)',
        [company_id, to_email, to_name, subject, body, email_type]
    )
    print(f"\n[EMAIL → {to_email}] {subject}\n{body}\n")

@companies_bp.route('/<int:cid>', methods=['PUT'])
@jwt_required()
def update_company(cid):
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    data    = request.get_json()
    db      = get_db()
    old     = db.execute('SELECT * FROM pg_companies WHERE id=?', [cid]).fetchone()
    fields  = ['company_name','owner_name','owner_email','city','address','phone',
               'plan','status','total_rooms','subscription_amount',
               'accent_color','pg_logo','pg_tagline','contact_email','contact_phone',
               'property_type','website','gst_number','floors_count','contract_months',
               'onboarding_notes','billing_cycle_day','next_due_date']
    updates = {f: data[f] for f in fields if f in data}
    if 'plan' in data and 'subscription_amount' not in data:
        updates['subscription_amount'] = PLAN_PRICES.get(data['plan'], 2999)
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE pg_companies SET {sets} WHERE id=?', list(updates.values()) + [cid])
        db.commit()
    company = db.execute('SELECT * FROM pg_companies WHERE id=?', [cid]).fetchone()
    if company and company['owner_user_id']:
        user_fields = {}
        if 'owner_name'  in data: user_fields['name']  = data['owner_name']
        if 'owner_email' in data: user_fields['email'] = data['owner_email']
        if user_fields:
            sets = ', '.join(f'{k}=?' for k in user_fields)
            db.execute(f'UPDATE users SET {sets} WHERE id=?', list(user_fields.values()) + [company['owner_user_id']])
            db.commit()
    # Notify owner on plan or status change
    if old and company:
        if 'plan' in data and old['plan'] != company['plan']:
            _log_email(db, cid, company['owner_email'], company['owner_name'],
                f"Your PGease plan has been upgraded to {company['plan'].upper()}",
                f"Hi {company['owner_name']},\n\nYour PGease subscription has been updated from {old['plan'].upper()} to {company['plan'].upper()}.\n\nNew monthly fee: Rs {PLAN_PRICES.get(company['plan'], 2999)}/month\n\nThank you for using PGease!\n\nTeam PGease",
                'plan_change')
            db.commit()
        if 'status' in data and old['status'] != company['status']:
            status_map = {'active': 'activated', 'trial': 'moved to trial', 'inactive': 'suspended'}
            _log_email(db, cid, company['owner_email'], company['owner_name'],
                f"Your PGease account has been {status_map.get(company['status'], 'updated')}",
                f"Hi {company['owner_name']},\n\nYour PGease account status has been updated to: {company['status'].upper()}.\n\nIf you have questions, contact PGease support.\n\nTeam PGease",
                'status_change')
            db.commit()
    company = db.execute('SELECT * FROM pg_companies WHERE id=?', [cid]).fetchone()
    db.close()
    return jsonify(dict(company))

@companies_bp.route('/<int:cid>/reset-password', methods=['POST'])
@jwt_required()
def reset_owner_password(cid):
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    data         = request.get_json() or {}
    new_password = data.get('new_password', '')
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    db      = get_db()
    company = db.execute('SELECT * FROM pg_companies WHERE id=?', [cid]).fetchone()
    if not company:
        db.close()
        return jsonify({'error': 'Company not found'}), 404
    user = None
    if company['owner_user_id']:
        user = db.execute('SELECT id FROM users WHERE id=?', [company['owner_user_id']]).fetchone()
    if not user:
        user = db.execute('SELECT id FROM users WHERE email=?', [company['owner_email']]).fetchone()
    if not user:
        db.close()
        return jsonify({'error': 'Owner user account not found'}), 404
    pw_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    db.execute('UPDATE users SET password_hash=? WHERE id=?', [pw_hash, user['id']])
    db.commit()
    db.close()
    print(f"\n[EMAIL] Password reset for {company['owner_email']}\n")
    return jsonify({'message': 'Password reset successfully'})

@companies_bp.route('/<int:cid>', methods=['DELETE'])
@jwt_required()
def delete_company(cid):
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    db = get_db()
    db.execute('DELETE FROM pg_companies WHERE id=?', [cid])
    db.commit()
    db.close()
    return jsonify({'message': 'Client removed'})

@companies_bp.route('/provision', methods=['POST'])
@jwt_required()
def provision_client():
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    for f in ['company_name', 'owner_name', 'owner_email', 'owner_password', 'city', 'plan']:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400
    db = get_db()
    if db.execute('SELECT id FROM users WHERE email=?', [data['owner_email']]).fetchone():
        db.close()
        return jsonify({'error': 'A user with this email already exists'}), 409

    pw_hash  = bcrypt.hashpw(data['owner_password'].encode(), bcrypt.gensalt()).decode()
    user_cur = db.execute(
        'INSERT INTO users (name,email,password_hash,phone,role,is_verified) VALUES (?,?,?,?,?,?)',
        [data['owner_name'], data['owner_email'], pw_hash, data.get('phone',''), 'owner', 1]
    )
    user_id = user_cur.lastrowid

    sub_amount = PLAN_PRICES.get(data.get('plan','basic'), 2999)
    today = dt.date.today()
    billing_day = int(data.get('billing_cycle_day', 1))
    try:
        next_due = today.replace(day=billing_day)
        if next_due <= today:
            mo = today.month + 1 if today.month < 12 else 1
            yr = today.year if today.month < 12 else today.year + 1
            next_due = today.replace(year=yr, month=mo, day=billing_day)
    except Exception:
        next_due = today.replace(day=1)

    comp_cur = db.execute(
        '''INSERT INTO pg_companies
           (company_name,owner_name,owner_email,city,address,phone,plan,status,
            total_rooms,subscription_amount,accent_color,pg_logo,pg_tagline,
            contact_email,contact_phone,owner_user_id,property_type,
            website,gst_number,floors_count,contract_months,onboarding_notes,
            billing_cycle_day,next_due_date)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        [data['company_name'], data['owner_name'], data['owner_email'],
         data.get('city',''), data.get('address',''), data.get('phone',''),
         data.get('plan','basic'), data.get('status','trial'),
         data.get('total_rooms', 0), sub_amount,
         data.get('accent_color','#FF6B35'), data.get('pg_logo','🏠'),
         data.get('pg_tagline',''), data['owner_email'], data.get('phone',''),
         user_id, data.get('property_type','pg'),
         data.get('website',''), data.get('gst_number',''),
         int(data.get('floors_count', 1)), int(data.get('contract_months', 12)),
         data.get('onboarding_notes',''), billing_day, str(next_due)]
    )
    company_id = comp_cur.lastrowid

    db.execute('UPDATE users SET company_id=? WHERE id=?', [company_id, user_id])

    # Generate first billing entry
    db.execute(
        '''INSERT INTO subscription_payments
           (company_id,amount,plan,period_month,period_year,status,due_date,invoice_number)
           VALUES (?,?,?,?,?,?,?,?)''',
        [company_id, sub_amount, data.get('plan','basic'),
         next_due.month, next_due.year, 'pending',
         str(next_due), f'INV-{company_id}-{next_due.strftime("%Y%m")}']
    )

    # Welcome email
    if data.get('send_welcome_email', True):
        welcome_body = (
            f"Hi {data['owner_name']},\n\n"
            f"Welcome to PGease! Your account has been created.\n\n"
            f"Login URL  : http://localhost:3000/login\n"
            f"Email      : {data['owner_email']}\n"
            f"Password   : {data['owner_password']}\n"
            f"Plan       : {data.get('plan','basic').upper()} — Rs {sub_amount}/month\n"
            f"First bill due: {next_due}\n\n"
            f"Please change your password after first login.\n\n"
            f"Team PGease"
        )
        _log_email(db, company_id, data['owner_email'], data['owner_name'],
                   f"Welcome to PGease — Your account is ready, {data['owner_name']}!",
                   welcome_body, 'welcome')

    db.commit()
    company = db.execute('SELECT * FROM pg_companies WHERE id=?', [company_id]).fetchone()
    db.close()

    get_company_db(company_id)

    print(f"\n{'='*60}")
    print(f"[PROVISION] {dt.datetime.now()}")
    print(f"Company : {data['company_name']} (id={company_id})")
    print(f"Owner   : {data['owner_name']} <{data['owner_email']}>")
    print(f"Password: [REDACTED]")
    print(f"Plan    : {data.get('plan','basic').upper()} — Rs {sub_amount}/mo")
    print(f"DB      : company_{company_id}.db")
    print(f"{'='*60}\n")

    return jsonify({'message': 'Client provisioned successfully',
                    'company': dict(company), 'user_id': user_id}), 201

@companies_bp.route('/stats/activity', methods=['GET'])
@jwt_required()
def platform_activity():
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    db = get_db()
    # Recent 8 clients
    recent = db.execute(
        'SELECT id,company_name,owner_name,plan,status,registered_at,city FROM pg_companies ORDER BY registered_at DESC LIMIT 8'
    ).fetchall()
    # MRR by month (last 6) using registered_at as proxy
    from datetime import date, timedelta
    mrr_trend = []
    today = date.today()
    for i in range(5, -1, -1):
        mo = (today.replace(day=1) - timedelta(days=i*30))
        label = mo.strftime('%b %Y')
        # All companies active on or before this month
        mrr_val = db.execute(
            "SELECT COALESCE(SUM(subscription_amount),0) as s FROM pg_companies WHERE status='active' AND substr(registered_at,1,7) <= ?",
            [mo.strftime('%Y-%m')]
        ).fetchone()['s']
        mrr_trend.append({'month': mo.strftime('%b'), 'mrr': mrr_val})
    # Users count
    total_users = db.execute('SELECT COUNT(*) as c FROM users').fetchone()['c']
    owners      = db.execute("SELECT COUNT(*) as c FROM users WHERE role='owner'").fetchone()['c']
    db.close()
    return jsonify({
        'recent_clients': [dict(r) for r in recent],
        'mrr_trend':      mrr_trend,
        'total_users':    total_users,
        'owners':         owners,
    })

@companies_bp.route('/my-settings', methods=['GET'])
@jwt_required()
def my_company_settings():
    uid  = int(get_jwt_identity())
    db   = get_db()
    user = db.execute('SELECT role, email, company_id FROM users WHERE id=?', [uid]).fetchone()
    if not user or user['role'] not in ('owner', 'super_admin'):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    company = None
    if user['company_id']:
        company = db.execute('SELECT * FROM pg_companies WHERE id=?', [user['company_id']]).fetchone()
    if not company:
        company = db.execute('SELECT * FROM pg_companies WHERE owner_user_id=?', [uid]).fetchone()
    if not company:
        company = db.execute('SELECT * FROM pg_companies WHERE owner_email=?', [user['email']]).fetchone()
    db.close()
    if not company:
        return jsonify({'error': 'No company found for this account'}), 404
    return jsonify(dict(company))

@companies_bp.route('/<int:cid>/billing', methods=['GET'])
@jwt_required()
def get_billing(cid):
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    db  = get_db()
    rows = db.execute(
        'SELECT * FROM subscription_payments WHERE company_id=? ORDER BY period_year DESC, period_month DESC',
        [cid]
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@companies_bp.route('/<int:cid>/billing', methods=['POST'])
@jwt_required()
def create_billing(cid):
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    db   = get_db()
    comp = db.execute('SELECT * FROM pg_companies WHERE id=?', [cid]).fetchone()
    if not comp:
        db.close()
        return jsonify({'error': 'Company not found'}), 404
    amount  = data.get('amount', comp['subscription_amount'])
    plan    = data.get('plan', comp['plan'])
    today   = dt.date.today()
    month   = int(data.get('month', today.month))
    year    = int(data.get('year',  today.year))
    due     = data.get('due_date', f'{year}-{month:02d}-01')
    inv_num = f"INV-{cid}-{year}{month:02d}"
    existing = db.execute(
        'SELECT id FROM subscription_payments WHERE company_id=? AND period_month=? AND period_year=?',
        [cid, month, year]
    ).fetchone()
    if existing:
        db.close()
        return jsonify({'error': 'Billing entry already exists for this period'}), 409
    cur = db.execute(
        '''INSERT INTO subscription_payments
           (company_id,amount,plan,period_month,period_year,status,due_date,invoice_number,notes)
           VALUES (?,?,?,?,?,?,?,?,?)''',
        [cid, amount, plan, month, year, data.get('status','pending'), due, inv_num, data.get('notes','')]
    )
    db.commit()
    row = db.execute('SELECT * FROM subscription_payments WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(row)), 201

@companies_bp.route('/<int:cid>/billing/<int:pid>', methods=['PUT'])
@jwt_required()
def update_billing(cid, pid):
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    db   = get_db()
    comp = db.execute('SELECT * FROM pg_companies WHERE id=?', [cid]).fetchone()
    fields  = ['status','paid_date','payment_method','transaction_ref','notes','amount']
    updates = {f: data[f] for f in fields if f in data}
    if data.get('status') == 'paid' and 'paid_date' not in updates:
        updates['paid_date'] = str(dt.date.today())
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE subscription_payments SET {sets} WHERE id=? AND company_id=?',
                   list(updates.values()) + [pid, cid])
        db.commit()
    # Send payment confirmation email
    if data.get('status') == 'paid' and comp:
        row = db.execute('SELECT * FROM subscription_payments WHERE id=?', [pid]).fetchone()
        if row:
            body = (
                f"Hi {comp['owner_name']},\n\n"
                f"Payment received for {row['invoice_number']}.\n\n"
                f"Amount   : Rs {row['amount']:,.0f}\n"
                f"Plan     : {row['plan'].upper()}\n"
                f"Period   : {row['period_month']:02d}/{row['period_year']}\n"
                f"Paid on  : {updates.get('paid_date','')}\n\n"
                f"Thank you! Your subscription is active.\n\nTeam PGease"
            )
            _log_email(db, cid, comp['owner_email'], comp['owner_name'],
                       f"Payment Confirmed — {row['invoice_number']}",
                       body, 'payment_receipt')
            db.commit()
    row = db.execute('SELECT * FROM subscription_payments WHERE id=?', [pid]).fetchone()
    db.close()
    return jsonify(dict(row) if row else {})

@companies_bp.route('/<int:cid>/send-email', methods=['POST'])
@jwt_required()
def send_email(cid):
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    if not data.get('subject') or not data.get('body'):
        return jsonify({'error': 'Subject and body required'}), 400
    db   = get_db()
    comp = db.execute('SELECT * FROM pg_companies WHERE id=?', [cid]).fetchone()
    if not comp:
        db.close()
        return jsonify({'error': 'Company not found'}), 404
    to_email = data.get('to_email', comp['owner_email'])
    to_name  = data.get('to_name',  comp['owner_name'])
    _log_email(db, cid, to_email, to_name, data['subject'], data['body'], data.get('email_type','general'))
    db.commit()
    db.close()
    return jsonify({'message': f'Email sent to {to_email}', 'to': to_email})

@companies_bp.route('/<int:cid>/emails', methods=['GET'])
@jwt_required()
def get_client_emails(cid):
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    db   = get_db()
    rows = db.execute(
        'SELECT * FROM platform_emails WHERE company_id=? ORDER BY created_at DESC',
        [cid]
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@companies_bp.route('/email-logs', methods=['GET'])
@jwt_required()
def email_logs():
    uid = int(get_jwt_identity())
    if not require_super_admin(uid):
        return jsonify({'error': 'Forbidden'}), 403
    db   = get_db()
    rows = db.execute(
        '''SELECT e.*, c.company_name FROM platform_emails e
           LEFT JOIN pg_companies c ON c.id=e.company_id
           ORDER BY e.created_at DESC LIMIT 100'''
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@companies_bp.route('/my-settings', methods=['PUT'])
@jwt_required()
def update_my_settings():
    uid  = int(get_jwt_identity())
    data = request.get_json()
    db   = get_db()
    user = db.execute('SELECT role, email, company_id FROM users WHERE id=?', [uid]).fetchone()
    if not user or user['role'] not in ('owner', 'super_admin'):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    company = None
    if user['company_id']:
        company = db.execute('SELECT * FROM pg_companies WHERE id=?', [user['company_id']]).fetchone()
    if not company:
        company = db.execute('SELECT * FROM pg_companies WHERE owner_user_id=?', [uid]).fetchone()
    if not company:
        company = db.execute('SELECT * FROM pg_companies WHERE owner_email=?', [user['email']]).fetchone()
    if not company:
        db.close()
        return jsonify({'error': 'No company found'}), 404
    fields  = ['company_name','pg_logo','accent_color','pg_tagline','contact_email','contact_phone','address','city','property_type']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE pg_companies SET {sets} WHERE id=?', list(updates.values()) + [company['id']])
        db.commit()
    company = db.execute('SELECT * FROM pg_companies WHERE id=?', [company['id']]).fetchone()
    db.close()
    return jsonify(dict(company))
