from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company
from datetime import datetime

expenses_bp = Blueprint('expenses', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

@expenses_bp.route('/', methods=['GET'])
@jwt_required()
def get_expenses():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    month    = request.args.get('month')
    year     = request.args.get('year')
    category = request.args.get('category')
    query    = 'SELECT * FROM expenses WHERE 1=1'
    params   = []
    if month:
        query += ' AND strftime("%m", expense_date)=?'
        params.append(f'{int(month):02d}')
    if year:
        query += ' AND strftime("%Y", expense_date)=?'
        params.append(str(year))
    if category:
        query += ' AND category=?'
        params.append(category)
    query += ' ORDER BY expense_date DESC'
    db       = get_company_db(company_id)
    expenses = db.execute(query, params).fetchall()
    db.close()
    return jsonify([dict(e) for e in expenses])

@expenses_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'total_expenses': 0, 'revenue': 0, 'net_profit': 0, 'by_category': [], 'trend': []})
    now   = datetime.utcnow()
    month = request.args.get('month', now.month)
    year  = request.args.get('year',  now.year)
    mm    = f'{int(month):02d}'
    yy    = str(year)
    db    = get_company_db(company_id)
    total = db.execute(
        'SELECT COALESCE(SUM(amount),0) as s FROM expenses WHERE strftime("%m",expense_date)=? AND strftime("%Y",expense_date)=?',
        [mm, yy]
    ).fetchone()['s']
    by_cat = db.execute(
        'SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE strftime("%m",expense_date)=? AND strftime("%Y",expense_date)=? GROUP BY category ORDER BY total DESC',
        [mm, yy]
    ).fetchall()
    revenue = db.execute(
        'SELECT COALESCE(SUM(amount+penalty),0) as s FROM payments WHERE month=? AND year=? AND status="paid"',
        [month, year]
    ).fetchone()['s']
    trend = db.execute(
        'SELECT strftime("%Y-%m", expense_date) as month, SUM(amount) as total FROM expenses GROUP BY month ORDER BY month DESC LIMIT 6'
    ).fetchall()
    db.close()
    return jsonify({
        'total_expenses': round(total, 2),
        'revenue':        round(revenue, 2),
        'net_profit':     round(revenue - total, 2),
        'by_category':    [dict(c) for c in by_cat],
        'trend':          [dict(t) for t in reversed(trend)],
    })

@expenses_bp.route('/', methods=['POST'])
@jwt_required()
def create_expense():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    if not data.get('category') or not data.get('amount') or not data.get('expense_date'):
        return jsonify({'error': 'category, amount, expense_date required'}), 400
    db  = get_company_db(company_id)
    cur = db.execute(
        'INSERT INTO expenses (category,description,amount,expense_date,payment_mode,vendor) VALUES (?,?,?,?,?,?)',
        [data['category'], data.get('description',''), float(data['amount']),
         data['expense_date'], data.get('payment_mode','cash'), data.get('vendor','')]
    )
    db.commit()
    e = db.execute('SELECT * FROM expenses WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(e)), 201

@expenses_bp.route('/<int:eid>', methods=['PUT'])
@jwt_required()
def update_expense(eid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    db      = get_company_db(company_id)
    fields  = ['category','description','amount','expense_date','payment_mode','vendor']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE expenses SET {sets} WHERE id=?', list(updates.values()) + [eid])
        db.commit()
    e = db.execute('SELECT * FROM expenses WHERE id=?', [eid]).fetchone()
    db.close()
    if not e:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(e))

@expenses_bp.route('/<int:eid>', methods=['DELETE'])
@jwt_required()
def delete_expense(eid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db = get_company_db(company_id)
    db.execute('DELETE FROM expenses WHERE id=?', [eid])
    db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})
