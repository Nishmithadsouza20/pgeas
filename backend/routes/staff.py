from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company

staff_bp = Blueprint('staff', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

@staff_bp.route('/', methods=['GET'])
@jwt_required()
def get_staff():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db    = get_company_db(company_id)
    staff = db.execute('SELECT * FROM staff ORDER BY role, name').fetchall()
    db.close()
    return jsonify([dict(s) for s in staff])

@staff_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'total_active': 0, 'monthly_salary': 0, 'by_role': []})
    db      = get_company_db(company_id)
    total   = db.execute('SELECT COUNT(*) as c FROM staff WHERE status="active"').fetchone()['c']
    salary  = db.execute('SELECT COALESCE(SUM(salary),0) as s FROM staff WHERE status="active"').fetchone()['s']
    by_role = db.execute('SELECT role, COUNT(*) as count FROM staff GROUP BY role ORDER BY count DESC').fetchall()
    db.close()
    return jsonify({'total_active': total, 'monthly_salary': salary,
                    'by_role': [dict(r) for r in by_role]})

@staff_bp.route('/', methods=['POST'])
@jwt_required()
def create_staff():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    if not data.get('name') or not data.get('role'):
        return jsonify({'error': 'name and role required'}), 400
    db  = get_company_db(company_id)
    cur = db.execute(
        'INSERT INTO staff (name,role,phone,email,salary,join_date,shift,status,notes) VALUES (?,?,?,?,?,?,?,?,?)',
        [data['name'], data['role'], data.get('phone',''), data.get('email',''),
         data.get('salary',0), data.get('join_date',''), data.get('shift','day'),
         data.get('status','active'), data.get('notes','')]
    )
    db.commit()
    s = db.execute('SELECT * FROM staff WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(s)), 201

@staff_bp.route('/<int:sid>', methods=['PUT'])
@jwt_required()
def update_staff(sid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    db      = get_company_db(company_id)
    fields  = ['name','role','phone','email','salary','join_date','shift','status','notes']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE staff SET {sets} WHERE id=?', list(updates.values()) + [sid])
        db.commit()
    s = db.execute('SELECT * FROM staff WHERE id=?', [sid]).fetchone()
    db.close()
    if not s:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(s))

@staff_bp.route('/<int:sid>', methods=['DELETE'])
@jwt_required()
def delete_staff(sid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db = get_company_db(company_id)
    db.execute('DELETE FROM staff WHERE id=?', [sid])
    db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})
