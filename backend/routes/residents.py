import csv
import io
import bcrypt
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company

residents_bp = Blueprint('residents', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

@residents_bp.route('/', methods=['GET'])
@jwt_required()
def get_residents():
    uid = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    search = request.args.get('search', '')
    occ    = request.args.get('occupation', '')

    db     = get_company_db(company_id)
    query  = '''SELECT r.*, rm.room_number, rm.floor, rm.type as room_type
                FROM residents r
                LEFT JOIN rooms rm ON r.room_id = rm.id
                WHERE r.status = "active"'''
    params = []
    if search:
        query += ' AND (r.name LIKE ? OR r.email LIKE ? OR r.phone LIKE ?)'
        like = f'%{search}%'
        params += [like, like, like]
    if occ:
        query += ' AND r.occupation = ?'
        params.append(occ)
    query += ' ORDER BY r.id DESC'

    residents = db.execute(query, params).fetchall()
    db.close()
    return jsonify([dict(r) for r in residents])

@residents_bp.route('/unassigned', methods=['GET'])
@jwt_required()
def get_unassigned():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db = get_company_db(company_id)
    rows = db.execute(
        "SELECT id, name, phone, food_preference FROM residents WHERE status='active' AND (room_id IS NULL OR room_id=0)"
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@residents_bp.route('/my', methods=['GET'])
@jwt_required()
def my_profile():
    uid = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'Not assigned to a PG yet'}), 404
    db = get_company_db(company_id)
    r  = db.execute(
        '''SELECT res.*, rm.room_number, rm.floor, rm.type as room_type, rm.rent_amount, rm.amenities
           FROM residents res LEFT JOIN rooms rm ON res.room_id=rm.id
           WHERE res.user_id=? AND res.status="active"''',
        [uid]
    ).fetchone()
    db.close()
    if not r:
        return jsonify({'error': 'No active residency found'}), 404
    return jsonify(dict(r))

@residents_bp.route('/export', methods=['GET'])
@jwt_required()
def export_residents():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db = get_company_db(company_id)
    rows = db.execute(
        '''SELECT r.name,r.email,r.phone,r.occupation,r.id_proof_type,r.emergency_contact,
                  r.move_in_date,r.status,rm.room_number
           FROM residents r LEFT JOIN rooms rm ON r.room_id=rm.id
           WHERE r.status="active"'''
    ).fetchall()
    db.close()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Name','Email','Phone','Occupation','ID Proof','Emergency Contact','Move-in Date','Status','Room'])
    for row in rows:
        writer.writerow(list(row))
    output.seek(0)
    return Response(output.getvalue(), mimetype='text/csv',
                    headers={'Content-Disposition': 'attachment; filename=residents.csv'})

@residents_bp.route('/<int:rid>', methods=['GET'])
@jwt_required()
def get_resident(rid):
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'Forbidden'}), 403
    db = get_company_db(company_id)
    if role == 'customer':
        me = db.execute('SELECT id FROM residents WHERE user_id=?', [uid]).fetchone()
        if not me or me['id'] != rid:
            db.close()
            return jsonify({'error': 'Forbidden'}), 403
    r = db.execute(
        '''SELECT res.*, rm.room_number, rm.floor, rm.type as room_type, rm.rent_amount
           FROM residents res LEFT JOIN rooms rm ON res.room_id=rm.id WHERE res.id=?''',
        [rid]
    ).fetchone()
    db.close()
    if not r:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(r))

@residents_bp.route('/', methods=['POST'])
@jwt_required()
def create_resident():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()

    new_user_id = data.get('user_id')

    # If a password is provided, create a login account in the platform DB
    if data.get('password') and data.get('email'):
        pdb = get_db()
        existing = pdb.execute('SELECT id FROM users WHERE email=?', [data['email']]).fetchone()
        if existing:
            pdb.close()
            return jsonify({'error': 'An account with this email already exists'}), 409
        pw_hash = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
        new_user_id = pdb.execute(
            'INSERT INTO users (name,email,password_hash,phone,role,company_id,is_verified) VALUES (?,?,?,?,?,?,?)',
            [data.get('name',''), data['email'], pw_hash, data.get('phone',''), 'customer', company_id, 1]
        ).lastrowid
        pdb.commit()
        pdb.close()

    db = get_company_db(company_id)
    cur = db.execute(
        '''INSERT INTO residents (user_id,room_id,id_proof_type,id_proof_number,emergency_contact,
           move_in_date,occupation,photo_url,status,name,email,phone,food_preference,is_away,away_until)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        [new_user_id, data.get('room_id'), data.get('id_proof_type','Aadhar'),
         data.get('id_proof_number',''), data.get('emergency_contact',''), data.get('move_in_date'),
         data.get('occupation',''), data.get('photo_url',''),
         'active', data.get('name',''), data.get('email',''), data.get('phone',''),
         data.get('food_preference','veg'), data.get('is_away', 0), data.get('away_until','')]
    )
    if data.get('room_id'):
        db.execute('UPDATE rooms SET status="occupied" WHERE id=?', [data['room_id']])
    db.commit()
    res = db.execute('SELECT * FROM residents WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()

    return jsonify(dict(res)), 201

@residents_bp.route('/<int:rid>', methods=['PUT'])
@jwt_required()
def update_resident(rid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    db   = get_company_db(company_id)
    fields  = ['room_id','id_proof_type','id_proof_number','emergency_contact','move_in_date',
               'occupation','photo_url','status','name','email','phone',
               'food_preference','is_away','away_until']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE residents SET {sets} WHERE id=?', list(updates.values()) + [rid])
        db.commit()
    res = db.execute('SELECT * FROM residents WHERE id=?', [rid]).fetchone()
    db.close()
    return jsonify(dict(res))

@residents_bp.route('/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_resident(rid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db  = get_company_db(company_id)
    res = db.execute('SELECT room_id FROM residents WHERE id=?', [rid]).fetchone()
    if res and res['room_id']:
        occupied = db.execute(
            'SELECT COUNT(*) as c FROM residents WHERE room_id=? AND status="active" AND id!=?',
            [res['room_id'], rid]
        ).fetchone()['c']
        if occupied == 0:
            db.execute('UPDATE rooms SET status="vacant" WHERE id=?', [res['room_id']])
    db.execute('UPDATE residents SET status="inactive" WHERE id=?', [rid])
    db.commit()
    db.close()
    return jsonify({'message': 'Resident removed'})
