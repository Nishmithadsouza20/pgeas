from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db

leads_bp = Blueprint('leads', __name__)

def _admin(uid):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] == 'super_admin'

FIELDS = ['name','company','email','phone','property_type','city',
          'source','status','plan_interest','rooms_count','notes','follow_up_date']

@leads_bp.route('/', methods=['GET'])
@jwt_required()
def get_leads():
    uid = int(get_jwt_identity())
    if not _admin(uid): return jsonify({'error':'Forbidden'}), 403
    db    = get_db()
    rows  = db.execute('SELECT * FROM platform_leads ORDER BY created_at DESC').fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@leads_bp.route('/stats', methods=['GET'])
@jwt_required()
def lead_stats():
    uid = int(get_jwt_identity())
    if not _admin(uid): return jsonify({'error':'Forbidden'}), 403
    db       = get_db()
    total    = db.execute('SELECT COUNT(*) as c FROM platform_leads').fetchone()['c']
    by_stat  = db.execute('SELECT status, COUNT(*) as count FROM platform_leads GROUP BY status').fetchall()
    today_n  = db.execute("SELECT COUNT(*) as c FROM platform_leads WHERE date(created_at)=date('now')").fetchone()['c']
    follow_u = db.execute(
        "SELECT * FROM platform_leads WHERE follow_up_date=date('now') AND status NOT IN ('converted','lost') ORDER BY name"
    ).fetchall()
    db.close()
    return jsonify({
        'total': total, 'today_new': today_n,
        'by_status': [dict(r) for r in by_stat],
        'follow_ups': [dict(r) for r in follow_u],
    })

@leads_bp.route('/', methods=['POST'])
@jwt_required()
def create_lead():
    uid = int(get_jwt_identity())
    if not _admin(uid): return jsonify({'error':'Forbidden'}), 403
    data = request.get_json()
    if not data.get('name'): return jsonify({'error':'Name is required'}), 400
    db  = get_db()
    cur = db.execute(
        f"INSERT INTO platform_leads ({','.join(FIELDS)}) VALUES ({','.join('?'*len(FIELDS))})",
        [data.get(f,'') for f in FIELDS]
    )
    db.commit()
    lead = db.execute('SELECT * FROM platform_leads WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(lead)), 201

@leads_bp.route('/<int:lid>', methods=['PUT'])
@jwt_required()
def update_lead(lid):
    uid = int(get_jwt_identity())
    if not _admin(uid): return jsonify({'error':'Forbidden'}), 403
    data    = request.get_json()
    db      = get_db()
    updates = {f: data[f] for f in FIELDS if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE platform_leads SET {sets}, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                   list(updates.values()) + [lid])
        db.commit()
    lead = db.execute('SELECT * FROM platform_leads WHERE id=?', [lid]).fetchone()
    db.close()
    return jsonify(dict(lead))

@leads_bp.route('/demo-request', methods=['POST'])
def demo_request():
    """Public endpoint — no JWT. Prospective clients fill this form and it auto-creates a lead."""
    data = request.get_json() or {}
    if not data.get('name') or not data.get('phone'):
        return jsonify({'error': 'Name and phone are required'}), 400
    db  = get_db()
    cur = db.execute(
        f"INSERT INTO platform_leads ({','.join(FIELDS)}) VALUES ({','.join('?'*len(FIELDS))})",
        [data.get('name',''), data.get('company',''), data.get('email',''),
         data.get('phone',''), data.get('property_type','pg'),
         data.get('city',''), 'demo-request', 'new',
         data.get('plan_interest','basic'), data.get('rooms_count',''),
         data.get('notes','I submitted a demo request from the PGease website'), '']
    )
    db.commit()
    lead = db.execute('SELECT id,name FROM platform_leads WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    print(f"\n[DEMO REQUEST] {data.get('name')} <{data.get('phone')}> — auto-added to pipeline\n")
    return jsonify({'message': 'Thank you! Our team will contact you within 24 hours.', 'id': lead['id']}), 201

@leads_bp.route('/<int:lid>', methods=['DELETE'])
@jwt_required()
def delete_lead(lid):
    uid = int(get_jwt_identity())
    if not _admin(uid): return jsonify({'error':'Forbidden'}), 403
    db = get_db()
    db.execute('DELETE FROM platform_leads WHERE id=?', [lid])
    db.commit()
    db.close()
    return jsonify({'message':'Lead deleted'})
