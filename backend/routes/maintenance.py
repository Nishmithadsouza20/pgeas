from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company
from datetime import datetime

maintenance_bp = Blueprint('maintenance', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

def _get_name(uid):
    db = get_db()
    u  = db.execute('SELECT name FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return u['name'] if u else ''

@maintenance_bp.route('/', methods=['GET'])
@jwt_required()
def get_requests():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    status = request.args.get('status', '')
    if role == 'customer':
        r = db.execute('SELECT id FROM residents WHERE user_id=? AND status="active"', [uid]).fetchone()
        if r:
            rows = db.execute('SELECT * FROM maintenance_requests WHERE reported_by_resident_id=? ORDER BY id DESC', [r['id']]).fetchall()
        else:
            rows = []
    elif status:
        rows = db.execute('SELECT * FROM maintenance_requests WHERE status=? ORDER BY id DESC', [status]).fetchall()
    else:
        rows = db.execute('SELECT * FROM maintenance_requests ORDER BY id DESC').fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@maintenance_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({})
    stats = {
        'open':        db.execute('SELECT COUNT(*) as c FROM maintenance_requests WHERE status="open"').fetchone()['c'],
        'assigned':    db.execute('SELECT COUNT(*) as c FROM maintenance_requests WHERE status="assigned"').fetchone()['c'],
        'in_progress': db.execute('SELECT COUNT(*) as c FROM maintenance_requests WHERE status="in-progress"').fetchone()['c'],
        'completed':   db.execute('SELECT COUNT(*) as c FROM maintenance_requests WHERE status="completed"').fetchone()['c'],
        'total_cost':  db.execute('SELECT COALESCE(SUM(actual_cost),0) as s FROM maintenance_requests WHERE status="completed"').fetchone()['s'],
    }
    db.close()
    return jsonify(stats)

@maintenance_bp.route('/', methods=['POST'])
@jwt_required()
def create_request():
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    name = _get_name(uid)

    res_id = None
    if role == 'customer':
        r = db.execute('SELECT id FROM residents WHERE user_id=? AND status="active"', [uid]).fetchone()
        if r:
            res_id = r['id']

    cur = db.execute(
        '''INSERT INTO maintenance_requests
           (title,description,category,priority,reported_by_resident_id,reported_by_name,room_id)
           VALUES (?,?,?,?,?,?,?)''',
        [data['title'], data.get('description',''), data.get('category','other'),
         data.get('priority','medium'), res_id or data.get('reported_by_resident_id'),
         name, data.get('room_id')]
    )
    db.commit()
    row = db.execute('SELECT * FROM maintenance_requests WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(row)), 201

@maintenance_bp.route('/<int:rid>', methods=['PUT'])
@jwt_required()
def update_request(rid):
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    fields  = ['title','description','category','priority','status','assigned_to','estimated_cost','actual_cost']
    updates = {f: data[f] for f in fields if f in data}

    if 'assigned_to' in data and data['assigned_to']:
        s = db.execute('SELECT name FROM staff WHERE id=?', [data['assigned_to']]).fetchone()
        if s:
            updates['assigned_to_name'] = s['name']
        if data.get('status','') not in ('in-progress','completed','closed'):
            updates['status'] = 'assigned'

    if updates.get('status') == 'completed':
        updates['resolved_at'] = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE maintenance_requests SET {sets} WHERE id=?', list(updates.values()) + [rid])
        db.commit()

    row = db.execute('SELECT * FROM maintenance_requests WHERE id=?', [rid]).fetchone()
    db.close()
    return jsonify(dict(row))

@maintenance_bp.route('/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_request(rid):
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company'}), 400
    db.execute('DELETE FROM maintenance_requests WHERE id=?', [rid])
    db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})
