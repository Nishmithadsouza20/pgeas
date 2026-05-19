from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company
from datetime import datetime

complaints_bp = Blueprint('complaints', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

@complaints_bp.route('/', methods=['GET'])
@jwt_required()
def get_complaints():
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db     = get_company_db(company_id)
    status = request.args.get('status')
    cat    = request.args.get('category')

    if role == 'customer':
        res = db.execute('SELECT id FROM residents WHERE user_id=? AND status="active"', [uid]).fetchone()
        if not res:
            db.close()
            return jsonify([])
        query  = '''SELECT c.*, r.name as resident_name, rm.room_number
                    FROM complaints c JOIN residents r ON c.resident_id=r.id
                    LEFT JOIN rooms rm ON r.room_id=rm.id
                    WHERE c.resident_id=?'''
        params = [res['id']]
    else:
        query  = '''SELECT c.*, r.name as resident_name, rm.room_number
                    FROM complaints c JOIN residents r ON c.resident_id=r.id
                    LEFT JOIN rooms rm ON r.room_id=rm.id WHERE 1=1'''
        params = []

    if status:
        query += ' AND c.status=?'; params.append(status)
    if cat:
        query += ' AND c.category=?'; params.append(cat)
    query += ' ORDER BY c.created_at DESC'

    complaints = db.execute(query, params).fetchall()
    db.close()
    return jsonify([dict(c) for c in complaints])

@complaints_bp.route('/', methods=['POST'])
@jwt_required()
def create_complaint():
    uid  = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'Not assigned to a PG'}), 400
    data = request.get_json()
    db   = get_company_db(company_id)

    if role == 'customer':
        res = db.execute('SELECT id FROM residents WHERE user_id=? AND status="active"', [uid]).fetchone()
        if not res:
            db.close()
            return jsonify({'error': 'No active residency'}), 400
        resident_id = res['id']
    else:
        resident_id = data.get('resident_id')
        if not resident_id:
            db.close()
            return jsonify({'error': 'resident_id required'}), 400

    if not data.get('category') or not data.get('description'):
        db.close()
        return jsonify({'error': 'category and description required'}), 400

    cur = db.execute(
        'INSERT INTO complaints (resident_id,category,description,priority,status) VALUES (?,?,?,?,?)',
        [resident_id, data['category'], data['description'],
         data.get('priority','medium'), 'open']
    )
    db.commit()
    comp = db.execute('SELECT * FROM complaints WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(comp)), 201

@complaints_bp.route('/<int:cid>', methods=['PUT'])
@jwt_required()
def update_complaint(cid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    db   = get_company_db(company_id)
    comp = db.execute('SELECT * FROM complaints WHERE id=?', [cid]).fetchone()
    if not comp:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    fields  = ['status','response','priority']
    updates = {f: data[f] for f in fields if f in data}
    if data.get('status') == 'resolved' and not comp['resolved_at']:
        updates['resolved_at'] = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE complaints SET {sets} WHERE id=?', list(updates.values()) + [cid])
        db.commit()
    comp = db.execute('SELECT * FROM complaints WHERE id=?', [cid]).fetchone()
    db.close()
    return jsonify(dict(comp))

@complaints_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db = get_company_db(company_id)
    by_status = db.execute('SELECT status, COUNT(*) as count FROM complaints GROUP BY status').fetchall()
    by_cat    = db.execute('SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC').fetchall()
    total     = db.execute('SELECT COUNT(*) as c FROM complaints').fetchone()['c']
    resolved  = db.execute('SELECT COUNT(*) as c FROM complaints WHERE status="resolved"').fetchone()['c']
    db.close()
    return jsonify({
        'total': total, 'resolved': resolved,
        'by_status':   [dict(r) for r in by_status],
        'by_category': [dict(r) for r in by_cat]
    })
