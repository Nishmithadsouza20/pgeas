from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company

notices_bp = Blueprint('notices', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

def get_user_name(uid):
    db   = get_db()
    user = db.execute('SELECT name FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user['name'] if user else ''

@notices_bp.route('/', methods=['GET'])
@jwt_required()
def get_notices():
    uid = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db = get_company_db(company_id)
    notices = db.execute(
        '''SELECT n.*,
           CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END as is_read
           FROM notices n
           LEFT JOIN notice_reads nr ON nr.notice_id=n.id AND nr.user_id=?
           WHERE n.is_active=1
           ORDER BY n.is_important DESC, n.created_at DESC''',
        [uid]
    ).fetchall()
    db.close()
    return jsonify([dict(n) for n in notices])

@notices_bp.route('/', methods=['POST'])
@jwt_required()
def create_notice():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    if not data.get('title') or not data.get('content'):
        return jsonify({'error': 'title and content required'}), 400
    poster_name = get_user_name(uid)
    db  = get_company_db(company_id)
    cur = db.execute(
        'INSERT INTO notices (title,content,category,posted_by,posted_by_name,is_important) VALUES (?,?,?,?,?,?)',
        [data['title'], data['content'], data.get('category','general'),
         uid, poster_name, int(data.get('is_important', 0))]
    )
    db.commit()
    notice = db.execute('SELECT * FROM notices WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(notice)), 201

@notices_bp.route('/<int:nid>', methods=['PUT'])
@jwt_required()
def update_notice(nid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    db      = get_company_db(company_id)
    fields  = ['title','content','category','is_active','is_important']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE notices SET {sets} WHERE id=?', list(updates.values()) + [nid])
        db.commit()
    notice = db.execute('SELECT * FROM notices WHERE id=?', [nid]).fetchone()
    db.close()
    return jsonify(dict(notice))

@notices_bp.route('/<int:nid>', methods=['DELETE'])
@jwt_required()
def delete_notice(nid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db = get_company_db(company_id)
    db.execute('UPDATE notices SET is_active=0 WHERE id=?', [nid])
    db.commit()
    db.close()
    return jsonify({'message': 'Notice removed'})

@notices_bp.route('/<int:nid>/read', methods=['POST'])
@jwt_required()
def mark_read(nid):
    uid = int(get_jwt_identity())
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'message': 'ok'})
    db = get_company_db(company_id)
    try:
        db.execute('INSERT OR IGNORE INTO notice_reads (notice_id,user_id) VALUES (?,?)', [nid, uid])
        db.commit()
    except Exception:
        pass
    db.close()
    return jsonify({'message': 'Marked as read'})
