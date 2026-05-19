from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company

gatepass_bp = Blueprint('gatepass', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

@gatepass_bp.route('/', methods=['GET'])
@jwt_required()
def get_passes():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])

    if role == 'customer':
        r = db.execute('SELECT id FROM residents WHERE user_id=? AND status="active"', [uid]).fetchone()
        rows = db.execute('SELECT * FROM gate_passes WHERE resident_id=? ORDER BY id DESC', [r['id']]).fetchall() if r else []
    else:
        status = request.args.get('status', '')
        rows   = db.execute('SELECT * FROM gate_passes WHERE status=? ORDER BY id DESC', [status]).fetchall() if status \
                 else db.execute('SELECT * FROM gate_passes ORDER BY id DESC').fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@gatepass_bp.route('/', methods=['POST'])
@jwt_required()
def create_pass():
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()

    resident_id   = data.get('resident_id')
    resident_name = data.get('resident_name', '')
    if role == 'customer' and not resident_id:
        r = db.execute('SELECT id, name FROM residents WHERE user_id=? AND status="active"', [uid]).fetchone()
        if r:
            resident_id, resident_name = r['id'], r['name']

    status = 'approved' if role in ('owner', 'super_admin') else 'pending'
    cur = db.execute(
        'INSERT INTO gate_passes (resident_id,resident_name,purpose,destination,from_date,to_date,status) VALUES (?,?,?,?,?,?,?)',
        [resident_id, resident_name, data.get('purpose',''), data.get('destination',''),
         data['from_date'], data['to_date'], status]
    )
    db.commit()
    row = db.execute('SELECT * FROM gate_passes WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(row)), 201

@gatepass_bp.route('/<int:gid>', methods=['PUT'])
@jwt_required()
def update_pass(gid):
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    fields  = ['status', 'approved_by', 'purpose', 'destination', 'from_date', 'to_date']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE gate_passes SET {sets} WHERE id=?', list(updates.values()) + [gid])
        db.commit()
    row = db.execute('SELECT * FROM gate_passes WHERE id=?', [gid]).fetchone()
    db.close()
    return jsonify(dict(row))

@gatepass_bp.route('/<int:gid>', methods=['DELETE'])
@jwt_required()
def delete_pass(gid):
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company'}), 400
    db.execute('DELETE FROM gate_passes WHERE id=?', [gid])
    db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})
