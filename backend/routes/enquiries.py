from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company

enquiries_bp = Blueprint('enquiries', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

@enquiries_bp.route('/', methods=['GET'])
@jwt_required()
def get_enquiries():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    status = request.args.get('status', '')
    rows   = db.execute('SELECT * FROM enquiries WHERE status=? ORDER BY id DESC', [status]).fetchall() if status \
             else db.execute('SELECT * FROM enquiries ORDER BY id DESC').fetchall()
    stats  = {
        'new':       db.execute("SELECT COUNT(*) as c FROM enquiries WHERE status='new'").fetchone()['c'],
        'follow_up': db.execute("SELECT COUNT(*) as c FROM enquiries WHERE status='follow-up'").fetchone()['c'],
        'interested':db.execute("SELECT COUNT(*) as c FROM enquiries WHERE status='interested'").fetchone()['c'],
        'converted': db.execute("SELECT COUNT(*) as c FROM enquiries WHERE status='converted'").fetchone()['c'],
        'lost':      db.execute("SELECT COUNT(*) as c FROM enquiries WHERE status='lost'").fetchone()['c'],
    }
    db.close()
    return jsonify({'enquiries': [dict(r) for r in rows], 'stats': stats})

@enquiries_bp.route('/', methods=['POST'])
@jwt_required()
def create_enquiry():
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    cur  = db.execute(
        'INSERT INTO enquiries (name,phone,email,room_type_preference,budget,source,status,notes,follow_up_date) VALUES (?,?,?,?,?,?,?,?,?)',
        [data['name'], data.get('phone',''), data.get('email',''),
         data.get('room_type_preference',''), float(data.get('budget', 0) or 0),
         data.get('source','walk-in'), data.get('status','new'),
         data.get('notes',''), data.get('follow_up_date','')]
    )
    db.commit()
    row = db.execute('SELECT * FROM enquiries WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(row)), 201

@enquiries_bp.route('/<int:eid>', methods=['PUT'])
@jwt_required()
def update_enquiry(eid):
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    fields  = ['name','phone','email','room_type_preference','budget','source','status','notes','follow_up_date']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE enquiries SET {sets} WHERE id=?', list(updates.values()) + [eid])
        db.commit()
    row = db.execute('SELECT * FROM enquiries WHERE id=?', [eid]).fetchone()
    db.close()
    return jsonify(dict(row))

@enquiries_bp.route('/<int:eid>', methods=['DELETE'])
@jwt_required()
def delete_enquiry(eid):
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company'}), 400
    db.execute('DELETE FROM enquiries WHERE id=?', [eid])
    db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})
