from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company
from datetime import datetime, timedelta

analytics_bp = Blueprint('analytics', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

def _get_cdb(uid):
    """Returns (role, company_id, db) or raises."""
    role, company_id = get_user_company(uid)
    if not company_id:
        return role, None, None
    return role, company_id, get_company_db(company_id)

@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard_stats():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id, db = _get_cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    now = datetime.utcnow()

    total_residents   = db.execute('SELECT COUNT(*) as c FROM residents WHERE status="active"').fetchone()['c']
    total_rooms       = db.execute('SELECT COUNT(*) as c FROM rooms').fetchone()['c']
    occupied_rooms    = db.execute('SELECT COUNT(*) as c FROM rooms WHERE status="occupied"').fetchone()['c']
    vacant_rooms      = db.execute('SELECT COUNT(*) as c FROM rooms WHERE status="vacant"').fetchone()['c']
    maintenance_rooms = db.execute('SELECT COUNT(*) as c FROM rooms WHERE status="maintenance"').fetchone()['c']
    monthly_revenue   = db.execute(
        'SELECT COALESCE(SUM(amount+penalty),0) as s FROM payments WHERE month=? AND year=? AND status="paid"',
        [now.month, now.year]
    ).fetchone()['s']
    pending_complaints = db.execute(
        'SELECT COUNT(*) as c FROM complaints WHERE status IN ("open","in-progress")'
    ).fetchone()['c']
    pending_payments = db.execute(
        'SELECT COUNT(*) as c FROM payments WHERE month=? AND year=? AND status="pending"',
        [now.month, now.year]
    ).fetchone()['c']
    recent_reg = db.execute(
        '''SELECT r.name, r.occupation, r.move_in_date, rm.room_number
           FROM residents r LEFT JOIN rooms rm ON r.room_id=rm.id
           WHERE r.status="active" ORDER BY r.id DESC LIMIT 5'''
    ).fetchall()
    pending_pay_list = db.execute(
        '''SELECT p.*, r.name as resident_name, rm.room_number
           FROM payments p JOIN residents r ON p.resident_id=r.id
           LEFT JOIN rooms rm ON r.room_id=rm.id
           WHERE p.month=? AND p.year=? AND p.status="pending"
           ORDER BY r.name LIMIT 10''',
        [now.month, now.year]
    ).fetchall()
    db.close()
    return jsonify({
        'total_residents':      total_residents,
        'total_rooms':          total_rooms,
        'occupied_rooms':       occupied_rooms,
        'vacant_rooms':         vacant_rooms,
        'maintenance_rooms':    maintenance_rooms,
        'monthly_revenue':      monthly_revenue,
        'pending_complaints':   pending_complaints,
        'pending_payments':     pending_payments,
        'recent_registrations': [dict(r) for r in recent_reg],
        'pending_payments_list':[dict(p) for p in pending_pay_list]
    })

@analytics_bp.route('/occupancy', methods=['GET'])
@jwt_required()
def occupancy_trend():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id, db = _get_cdb(uid)
    if not db:
        return jsonify([])
    now  = datetime.utcnow()
    data = []
    for i in range(5, -1, -1):
        dt    = now - timedelta(days=30*i)
        month = dt.strftime('%b %Y')
        count = db.execute(
            'SELECT COUNT(*) as c FROM payments WHERE month=? AND year=?',
            [dt.month, dt.year]
        ).fetchone()['c']
        data.append({'month': month, 'occupancy': count})
    db.close()
    return jsonify(data)

@analytics_bp.route('/revenue', methods=['GET'])
@jwt_required()
def revenue_trend():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id, db = _get_cdb(uid)
    if not db:
        return jsonify([])
    now  = datetime.utcnow()
    data = []
    for i in range(5, -1, -1):
        dt  = now - timedelta(days=30*i)
        rev = db.execute(
            'SELECT COALESCE(SUM(amount+penalty),0) as s FROM payments WHERE month=? AND year=? AND status="paid"',
            [dt.month, dt.year]
        ).fetchone()['s']
        data.append({'month': dt.strftime('%b %Y'), 'revenue': rev})
    db.close()
    return jsonify(data)

@analytics_bp.route('/complaints-breakdown', methods=['GET'])
@jwt_required()
def complaints_breakdown():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id, db = _get_cdb(uid)
    if not db:
        return jsonify([])
    rows = db.execute('SELECT category as name, COUNT(*) as value FROM complaints GROUP BY category').fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@analytics_bp.route('/resident-ratio', methods=['GET'])
@jwt_required()
def resident_ratio():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id, db = _get_cdb(uid)
    if not db:
        return jsonify([])
    rows = db.execute(
        'SELECT occupation as name, COUNT(*) as value FROM residents WHERE status="active" GROUP BY occupation'
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@analytics_bp.route('/payment-rate', methods=['GET'])
@jwt_required()
def payment_rate():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id, db = _get_cdb(uid)
    if not db:
        return jsonify({'total': 0, 'paid': 0, 'rate': 0})
    now   = datetime.utcnow()
    total = db.execute('SELECT COUNT(*) as c FROM payments WHERE month=? AND year=?', [now.month, now.year]).fetchone()['c']
    paid  = db.execute('SELECT COUNT(*) as c FROM payments WHERE month=? AND year=? AND status="paid"', [now.month, now.year]).fetchone()['c']
    db.close()
    return jsonify({'total': total, 'paid': paid, 'rate': round((paid/total*100) if total else 0, 1)})

@analytics_bp.route('/room-status', methods=['GET'])
@jwt_required()
def room_status_chart():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id, db = _get_cdb(uid)
    if not db:
        return jsonify([])
    rows = db.execute('SELECT status as name, COUNT(*) as value FROM rooms GROUP BY status').fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])
