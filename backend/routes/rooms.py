from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company

rooms_bp = Blueprint('rooms', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

@rooms_bp.route('/', methods=['GET'])
@jwt_required()
def get_rooms():
    uid = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db = get_company_db(company_id)
    rooms = db.execute(
        '''SELECT r.*,
                  GROUP_CONCAT(res.name, ' | ') as resident_names,
                  GROUP_CONCAT(res.id,   ' | ') as resident_ids,
                  GROUP_CONCAT(res.phone,' | ') as resident_phones,
                  COUNT(res.id) as resident_count
           FROM rooms r
           LEFT JOIN residents res ON r.id = res.room_id AND res.status = 'active'
           GROUP BY r.id
           ORDER BY r.floor, r.room_number'''
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rooms])

@rooms_bp.route('/stats', methods=['GET'])
@jwt_required()
def room_stats():
    uid = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'total': 0, 'occupied': 0, 'vacant': 0, 'maintenance': 0})
    db = get_company_db(company_id)
    total    = db.execute('SELECT COUNT(*) as c FROM rooms').fetchone()['c']
    occupied = db.execute('SELECT COUNT(*) as c FROM rooms WHERE status="occupied"').fetchone()['c']
    vacant   = db.execute('SELECT COUNT(*) as c FROM rooms WHERE status="vacant"').fetchone()['c']
    maint    = db.execute('SELECT COUNT(*) as c FROM rooms WHERE status="maintenance"').fetchone()['c']
    db.close()
    return jsonify({'total': total, 'occupied': occupied, 'vacant': vacant, 'maintenance': maint})

@rooms_bp.route('/', methods=['POST'])
@jwt_required()
def create_room():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    for f in ['room_number', 'floor', 'type', 'rent_amount']:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400
    db = get_company_db(company_id)
    existing = db.execute('SELECT id FROM rooms WHERE room_number=?', [data['room_number']]).fetchone()
    if existing:
        db.close()
        return jsonify({'error': 'Room number already exists'}), 409
    cur = db.execute(
        'INSERT INTO rooms (room_number,floor,type,rent_amount,amenities,photo_url,status) VALUES (?,?,?,?,?,?,?)',
        [data['room_number'], data['floor'], data['type'], data['rent_amount'],
         data.get('amenities',''), data.get('photo_url',''), data.get('status','vacant')]
    )
    db.commit()
    room = db.execute('SELECT * FROM rooms WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(room)), 201

@rooms_bp.route('/<int:rid>', methods=['PUT'])
@jwt_required()
def update_room(rid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    db   = get_company_db(company_id)
    room = db.execute('SELECT * FROM rooms WHERE id=?', [rid]).fetchone()
    if not room:
        db.close()
        return jsonify({'error': 'Room not found'}), 404
    fields  = ['room_number','floor','type','rent_amount','amenities','photo_url','status']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE rooms SET {sets} WHERE id=?', list(updates.values()) + [rid])
        db.commit()
    room = db.execute('SELECT * FROM rooms WHERE id=?', [rid]).fetchone()
    db.close()
    return jsonify(dict(room))

@rooms_bp.route('/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_room(rid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db = get_company_db(company_id)
    db.execute('DELETE FROM rooms WHERE id=?', [rid])
    db.commit()
    db.close()
    return jsonify({'message': 'Room deleted'})
