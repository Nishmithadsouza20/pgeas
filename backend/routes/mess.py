from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company
from datetime import datetime

mess_bp = Blueprint('mess', __name__)
DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

@mess_bp.route('/', methods=['GET'])
@jwt_required()
def get_menu():
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    week = request.args.get('week', 1)
    db   = get_company_db(company_id)
    menu = db.execute('SELECT * FROM mess_menu WHERE week_number=? ORDER BY id', [week]).fetchall()
    db.close()
    return jsonify([dict(m) for m in menu])

@mess_bp.route('/today', methods=['GET'])
@jwt_required()
def today_menu():
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'day': DAYS[datetime.utcnow().weekday()], 'menu': []})
    today = DAYS[datetime.utcnow().weekday()]
    db    = get_company_db(company_id)
    menu  = db.execute(
        'SELECT * FROM mess_menu WHERE day_of_week=? AND week_number=1 ORDER BY meal_type',
        [today]
    ).fetchall()
    db.close()
    return jsonify({'day': today, 'menu': [dict(m) for m in menu]})

@mess_bp.route('/', methods=['POST'])
@jwt_required()
def create_menu_item():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    for f in ['day_of_week','meal_type','items']:
        if not data.get(f):
            return jsonify({'error': f'{f} required'}), 400
    db  = get_company_db(company_id)
    cur = db.execute(
        'INSERT INTO mess_menu (day_of_week,meal_type,items,timing,special_note,week_number) VALUES (?,?,?,?,?,?)',
        [data['day_of_week'], data['meal_type'], data['items'],
         data.get('timing',''), data.get('special_note',''), data.get('week_number',1)]
    )
    db.commit()
    item = db.execute('SELECT * FROM mess_menu WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(item)), 201

@mess_bp.route('/<int:mid>', methods=['PUT'])
@jwt_required()
def update_menu_item(mid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    db      = get_company_db(company_id)
    fields  = ['day_of_week','meal_type','items','timing','special_note','week_number']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE mess_menu SET {sets} WHERE id=?', list(updates.values()) + [mid])
        db.commit()
    item = db.execute('SELECT * FROM mess_menu WHERE id=?', [mid]).fetchone()
    db.close()
    return jsonify(dict(item))

@mess_bp.route('/<int:mid>', methods=['DELETE'])
@jwt_required()
def delete_menu_item(mid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db = get_company_db(company_id)
    db.execute('DELETE FROM mess_menu WHERE id=?', [mid])
    db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})
