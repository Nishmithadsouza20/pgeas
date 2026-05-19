from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company
from datetime import datetime

payments_bp = Blueprint('payments', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

@payments_bp.route('/', methods=['GET'])
@jwt_required()
def get_payments():
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db     = get_company_db(company_id)
    month  = request.args.get('month')
    year   = request.args.get('year')
    status = request.args.get('status')

    if role == 'customer':
        res = db.execute('SELECT id FROM residents WHERE user_id=? AND status="active"', [uid]).fetchone()
        if not res:
            db.close()
            return jsonify([])
        query  = '''SELECT p.*, r.name as resident_name, rm.room_number
                    FROM payments p JOIN residents r ON p.resident_id=r.id
                    LEFT JOIN rooms rm ON r.room_id=rm.id
                    WHERE p.resident_id=?'''
        params = [res['id']]
    else:
        query  = '''SELECT p.*, r.name as resident_name, rm.room_number
                    FROM payments p JOIN residents r ON p.resident_id=r.id
                    LEFT JOIN rooms rm ON r.room_id=rm.id WHERE 1=1'''
        params = []

    if month:
        query += ' AND p.month=?'; params.append(month)
    if year:
        query += ' AND p.year=?'; params.append(year)
    if status:
        query += ' AND p.status=?'; params.append(status)
    query += ' ORDER BY p.year DESC, p.month DESC, r.name'

    payments = db.execute(query, params).fetchall()
    db.close()
    return jsonify([dict(p) for p in payments])

@payments_bp.route('/', methods=['POST'])
@jwt_required()
def create_payment():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    for f in ['resident_id', 'month', 'year', 'amount']:
        if not data.get(f):
            return jsonify({'error': f'{f} required'}), 400
    db = get_company_db(company_id)
    existing = db.execute(
        'SELECT id FROM payments WHERE resident_id=? AND month=? AND year=?',
        [data['resident_id'], data['month'], data['year']]
    ).fetchone()
    if existing:
        db.close()
        return jsonify({'error': 'Payment record already exists for this month'}), 409
    cur = db.execute(
        'INSERT INTO payments (resident_id,month,year,amount,status,penalty) VALUES (?,?,?,?,?,?)',
        [data['resident_id'], data['month'], data['year'], data['amount'],
         data.get('status','pending'), data.get('penalty', 0)]
    )
    db.commit()
    pay = db.execute('SELECT * FROM payments WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(pay)), 201

@payments_bp.route('/<int:pid>', methods=['PUT'])
@jwt_required()
def update_payment(pid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    db   = get_company_db(company_id)
    pay  = db.execute('SELECT * FROM payments WHERE id=?', [pid]).fetchone()
    if not pay:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    fields  = ['status', 'paid_date', 'penalty', 'reminder_sent', 'amount']
    updates = {f: data[f] for f in fields if f in data}
    if data.get('status') == 'paid' and not data.get('paid_date'):
        updates['paid_date'] = datetime.utcnow().strftime('%Y-%m-%d')
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE payments SET {sets} WHERE id=?', list(updates.values()) + [pid])
        db.commit()
    pay = db.execute('SELECT * FROM payments WHERE id=?', [pid]).fetchone()
    db.close()
    return jsonify(dict(pay))

@payments_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    month = request.args.get('month', datetime.utcnow().month)
    year  = request.args.get('year',  datetime.utcnow().year)
    db    = get_company_db(company_id)
    total = db.execute('SELECT COUNT(*) as c FROM payments WHERE month=? AND year=?', [month, year]).fetchone()['c']
    paid  = db.execute('SELECT COALESCE(SUM(amount+penalty),0) as s FROM payments WHERE month=? AND year=? AND status="paid"', [month, year]).fetchone()['s']
    pend  = db.execute('SELECT COUNT(*) as c FROM payments WHERE month=? AND year=? AND status="pending"', [month, year]).fetchone()['c']
    over  = db.execute('SELECT COUNT(*) as c FROM payments WHERE month=? AND year=? AND status="overdue"', [month, year]).fetchone()['c']
    db.close()
    return jsonify({'month': month, 'year': year, 'total_records': total,
                    'collected': paid, 'pending': pend, 'overdue': over})

@payments_bp.route('/remind/<int:pid>', methods=['POST'])
@jwt_required()
def mark_reminded(pid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db = get_company_db(company_id)
    pay = db.execute(
        '''SELECT p.*, r.name as res_name, r.email as res_email, r.phone as res_phone,
                  rm.room_number
           FROM payments p
           JOIN residents r ON p.resident_id=r.id
           LEFT JOIN rooms rm ON r.room_id=rm.id
           WHERE p.id=?''', [pid]
    ).fetchone()
    if not pay:
        db.close()
        return jsonify({'error': 'Not found'}), 404

    MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    period = f"{MONTHS[int(pay['month'])-1]} {pay['year']}"
    total  = float(pay['amount']) + float(pay['penalty'] or 0)

    email_subject = f"[PGease] Rent Payment Reminder — {period}"
    email_body = f"""Dear {pay['res_name']},

This is a friendly reminder that your rent payment of ₹{total:,.0f} for {period} is currently {pay['status'].upper()}.

  Room        : {pay['room_number'] or 'N/A'}
  Period      : {period}
  Rent Amount : ₹{float(pay['amount']):,.0f}
  Late Fee    : ₹{float(pay['penalty'] or 0):,.0f}
  TOTAL DUE   : ₹{total:,.0f}

Please make the payment at your earliest convenience.

Regards,
PGease Management System"""

    sms_body = (f"[PGease] Hi {pay['res_name'].split()[0]}, your rent of Rs.{total:,.0f}"
                f" for {period} is {pay['status']}. Please pay via PGease portal.")

    print("\n" + "="*60)
    print(f"[EMAIL] To: {pay['res_email']}")
    print(f"[EMAIL] Subject: {email_subject}")
    print(email_body)
    print("="*60)
    print(f"[SMS] To: {pay['res_phone']}")
    print(f"[SMS] {sms_body}")
    print("="*60 + "\n")

    db.execute(
        '''INSERT INTO notifications_log (type,recipient_name,recipient_email,recipient_phone,subject,body)
           VALUES (?,?,?,?,?,?)''',
        ['email', pay['res_name'], pay['res_email'], pay['res_phone'], email_subject, email_body]
    )
    db.execute(
        '''INSERT INTO notifications_log (type,recipient_name,recipient_email,recipient_phone,subject,body)
           VALUES (?,?,?,?,?,?)''',
        ['sms', pay['res_name'], pay['res_email'], pay['res_phone'], 'SMS Reminder', sms_body]
    )
    db.execute('UPDATE payments SET reminder_sent=1 WHERE id=?', [pid])
    db.commit()
    db.close()
    return jsonify({'message': f'Reminder sent to {pay["res_email"]} and {pay["res_phone"]}'})

@payments_bp.route('/gateway/pay', methods=['POST'])
@jwt_required()
def gateway_pay():
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data       = request.get_json()
    payment_id = data.get('payment_id')
    method     = data.get('method', 'upi')
    db         = get_company_db(company_id)
    pay = db.execute('SELECT * FROM payments WHERE id=?', [payment_id]).fetchone()
    if not pay:
        db.close()
        return jsonify({'error': 'Payment not found'}), 404
    if pay['status'] == 'paid':
        db.close()
        return jsonify({'error': 'Already paid'}), 400
    import random, string
    tx_ref = 'PGEASE' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
    today  = datetime.utcnow().strftime('%Y-%m-%d')
    db.execute('UPDATE payments SET status="paid", paid_date=? WHERE id=?', [today, payment_id])
    db.execute(
        '''INSERT INTO payment_transactions
           (payment_id, resident_id, amount, payment_method, transaction_ref, upi_id, card_last4, bank_name)
           VALUES (?,?,?,?,?,?,?,?)''',
        [payment_id, pay['resident_id'],
         float(pay['amount']) + float(pay['penalty'] or 0),
         method, tx_ref,
         data.get('upi_id',''), data.get('card_last4',''), data.get('bank_name','')]
    )
    db.commit()
    db.close()
    return jsonify({'success': True, 'transaction_ref': tx_ref,
                    'amount': float(pay['amount']) + float(pay['penalty'] or 0)})

@payments_bp.route('/gateway/history', methods=['GET'])
@jwt_required()
def gateway_history():
    uid = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db  = get_company_db(company_id)
    res = db.execute('SELECT id FROM residents WHERE user_id=? AND status="active"', [uid]).fetchone()
    if not res:
        db.close()
        return jsonify([])
    txns = db.execute(
        '''SELECT pt.*, p.month, p.year
           FROM payment_transactions pt
           JOIN payments p ON pt.payment_id=p.id
           WHERE pt.resident_id=?
           ORDER BY pt.paid_at DESC''',
        [res['id']]
    ).fetchall()
    db.close()
    return jsonify([dict(t) for t in txns])
