from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company
from datetime import date as dt_date

deposits_bp = Blueprint('deposits', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

@deposits_bp.route('/', methods=['GET'])
@jwt_required()
def get_deposits():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    rows = db.execute(
        '''SELECT sd.*, rm.room_number
           FROM security_deposits sd
           LEFT JOIN residents r ON sd.resident_id=r.id
           LEFT JOIN rooms rm ON r.room_id=rm.id
           ORDER BY sd.id DESC'''
    ).fetchall()
    total_held     = db.execute("SELECT COALESCE(SUM(amount),0) as s FROM security_deposits WHERE status='held'").fetchone()['s']
    total_refunded = db.execute("SELECT COALESCE(SUM(refund_amount),0) as s FROM security_deposits WHERE status='refunded'").fetchone()['s']
    db.close()
    return jsonify({'deposits': [dict(r) for r in rows], 'total_held': total_held, 'total_refunded': total_refunded})

@deposits_bp.route('/', methods=['POST'])
@jwt_required()
def create_deposit():
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    name = data.get('resident_name', '')
    if not name and data.get('resident_id'):
        r = db.execute('SELECT name FROM residents WHERE id=?', [data['resident_id']]).fetchone()
        if r:
            name = r['name']
    cur = db.execute(
        'INSERT INTO security_deposits (resident_id,resident_name,amount,paid_date,notes) VALUES (?,?,?,?,?)',
        [data.get('resident_id'), name, float(data['amount']),
         data.get('paid_date', dt_date.today().isoformat()), data.get('notes', '')]
    )
    db.commit()
    row = db.execute('SELECT * FROM security_deposits WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(row)), 201

@deposits_bp.route('/<int:did>', methods=['PUT'])
@jwt_required()
def update_deposit(did):
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    fields  = ['amount', 'paid_date', 'status', 'refund_amount', 'refund_date', 'notes']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE security_deposits SET {sets} WHERE id=?', list(updates.values()) + [did])
        db.commit()
    row = db.execute('SELECT * FROM security_deposits WHERE id=?', [did]).fetchone()
    db.close()
    return jsonify(dict(row))

@deposits_bp.route('/<int:did>', methods=['DELETE'])
@jwt_required()
def delete_deposit(did):
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company'}), 400
    db.execute('DELETE FROM security_deposits WHERE id=?', [did])
    db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})
