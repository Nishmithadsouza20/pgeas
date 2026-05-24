from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company

notif_bp = Blueprint('notifications', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

@notif_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    rows = db.execute('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50', [uid]).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@notif_bp.route('/count', methods=['GET'])
@jwt_required()
def unread_count():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'count': 0})
    count = db.execute('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0', [uid]).fetchone()['c']
    db.close()
    return jsonify({'count': count})

@notif_bp.route('/<int:nid>/read', methods=['PUT'])
@jwt_required()
def mark_read(nid):
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company'}), 400
    db.execute('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [nid, uid])
    db.commit()
    db.close()
    return jsonify({'message': 'Marked read'})

@notif_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company'}), 400
    db.execute('UPDATE notifications SET is_read=1 WHERE user_id=?', [uid])
    db.commit()
    db.close()
    return jsonify({'message': 'All marked read'})

@notif_bp.route('/', methods=['POST'])
@jwt_required()
def create_notification():
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    db.execute('INSERT INTO notifications (user_id,type,title,body,link) VALUES (?,?,?,?,?)',
               [uid, data.get('type','info'),
                data['title'], data.get('body',''), data.get('link','')])
    db.commit()
    db.close()
    return jsonify({'message': 'Created'}), 201
