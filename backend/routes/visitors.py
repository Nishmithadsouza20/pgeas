from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company
from datetime import datetime

visitors_bp = Blueprint('visitors', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

@visitors_bp.route('/', methods=['GET'])
@jwt_required()
def get_visitors():
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db = get_company_db(company_id)

    if role == 'customer':
        res = db.execute('SELECT id FROM residents WHERE user_id=? AND status="active"', [uid]).fetchone()
        if not res:
            db.close()
            return jsonify([])
        visitors = db.execute(
            '''SELECT v.*, r.name as resident_name FROM visitors v
               JOIN residents r ON v.resident_id=r.id WHERE v.resident_id=?
               ORDER BY v.created_at DESC''',
            [res['id']]
        ).fetchall()
    else:
        visitors = db.execute(
            '''SELECT v.*, r.name as resident_name, rm.room_number
               FROM visitors v JOIN residents r ON v.resident_id=r.id
               LEFT JOIN rooms rm ON r.room_id=rm.id
               ORDER BY v.created_at DESC LIMIT 200'''
        ).fetchall()

    db.close()
    return jsonify([dict(v) for v in visitors])

@visitors_bp.route('/active', methods=['GET'])
@jwt_required()
def active_visitors():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db = get_company_db(company_id)
    visitors = db.execute(
        '''SELECT v.*, r.name as resident_name, rm.room_number
           FROM visitors v JOIN residents r ON v.resident_id=r.id
           LEFT JOIN rooms rm ON r.room_id=rm.id
           WHERE v.out_time IS NULL ORDER BY v.in_time DESC'''
    ).fetchall()
    db.close()
    return jsonify([dict(v) for v in visitors])

@visitors_bp.route('/', methods=['POST'])
@jwt_required()
def log_visitor():
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    if not data.get('visitor_name') or not data.get('resident_id'):
        return jsonify({'error': 'visitor_name and resident_id required'}), 400
    db  = get_company_db(company_id)
    cur = db.execute(
        'INSERT INTO visitors (resident_id,visitor_name,purpose,in_time) VALUES (?,?,?,?)',
        [data['resident_id'], data['visitor_name'],
         data.get('purpose',''), data.get('in_time', datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))]
    )
    db.commit()
    v = db.execute('SELECT * FROM visitors WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(v)), 201

@visitors_bp.route('/<int:vid>', methods=['PUT'])
@jwt_required()
def update_visitor(vid):
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    db   = get_company_db(company_id)
    out  = data.get('out_time', datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))
    db.execute('UPDATE visitors SET out_time=? WHERE id=?', [out, vid])
    db.commit()
    v = db.execute('SELECT * FROM visitors WHERE id=?', [vid]).fetchone()
    db.close()
    return jsonify(dict(v))
