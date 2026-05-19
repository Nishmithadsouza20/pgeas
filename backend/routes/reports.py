from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company
from datetime import date as dt_date

reports_bp = Blueprint('reports', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

@reports_bp.route('/pl', methods=['GET'])
@jwt_required()
def pl_report():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    month = int(request.args.get('month', dt_date.today().month))
    year  = int(request.args.get('year',  dt_date.today().year))

    rent_income    = db.execute("SELECT COALESCE(SUM(amount+penalty),0) as s FROM payments WHERE month=? AND year=? AND status='paid'",   [month, year]).fetchone()['s']
    utility_income = db.execute("SELECT COALESCE(SUM(total_amount),0) as s FROM utility_bills WHERE month=? AND year=? AND status='paid'", [month, year]).fetchone()['s']
    total_income   = rent_income + utility_income

    expenses_by_cat = db.execute(
        "SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE strftime('%m',expense_date)=? AND strftime('%Y',expense_date)=? GROUP BY category",
        [str(month).zfill(2), str(year)]
    ).fetchall()
    total_expenses = sum(r['total'] for r in expenses_by_cat)

    payroll_cost = db.execute("SELECT COALESCE(SUM(net_salary),0) as s FROM payroll WHERE month=? AND year=? AND status='paid'", [month, year]).fetchone()['s']
    total_expenses += payroll_cost

    pending = db.execute("SELECT COUNT(*) as c, COALESCE(SUM(amount+penalty),0) as s FROM payments WHERE month=? AND year=? AND status='pending'", [month, year]).fetchone()

    db.close()
    return jsonify({
        'month': month, 'year': year,
        'rent_income':        rent_income,
        'utility_income':     utility_income,
        'total_income':       round(total_income, 2),
        'expenses_breakdown': [dict(r) for r in expenses_by_cat],
        'payroll_cost':       payroll_cost,
        'total_expenses':     round(total_expenses, 2),
        'net_profit':         round(total_income - total_expenses, 2),
        'pending_count':      pending['c'],
        'pending_amount':     pending['s'],
    })

@reports_bp.route('/rent-roll', methods=['GET'])
@jwt_required()
def rent_roll():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    month = int(request.args.get('month', dt_date.today().month))
    year  = int(request.args.get('year',  dt_date.today().year))
    rows  = db.execute(
        '''SELECT r.name, r.phone, r.email, rm.room_number, rm.rent_amount,
           p.amount, p.penalty, p.status as payment_status, p.paid_date,
           COALESCE(ub.total_amount,0) as utility_amount
           FROM residents r JOIN rooms rm ON r.room_id=rm.id
           LEFT JOIN payments p ON p.resident_id=r.id AND p.month=? AND p.year=?
           LEFT JOIN utility_bills ub ON ub.resident_id=r.id AND ub.month=? AND ub.year=?
           WHERE r.status="active" ORDER BY rm.room_number''',
        [month, year, month, year]
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@reports_bp.route('/defaulters', methods=['GET'])
@jwt_required()
def defaulters():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    rows = db.execute(
        '''SELECT r.name, r.phone, r.email, rm.room_number,
           p.amount, p.penalty, p.month, p.year,
           CAST(julianday('now') - julianday(p.created_at) AS INTEGER) as days_overdue
           FROM residents r JOIN rooms rm ON r.room_id=rm.id
           JOIN payments p ON p.resident_id=r.id
           WHERE r.status="active" AND p.status="pending"
           ORDER BY days_overdue DESC'''
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@reports_bp.route('/occupancy', methods=['GET'])
@jwt_required()
def occupancy_report():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({})
    total  = db.execute('SELECT COUNT(*) as c FROM rooms').fetchone()['c']
    occ    = db.execute('SELECT COUNT(*) as c FROM rooms WHERE status="occupied"').fetchone()['c']
    vacant = db.execute('SELECT COUNT(*) as c FROM rooms WHERE status="vacant"').fetchone()['c']
    maint  = db.execute('SELECT COUNT(*) as c FROM rooms WHERE status="maintenance"').fetchone()['c']
    by_floor = db.execute(
        'SELECT floor, COUNT(*) as total, SUM(CASE WHEN status="occupied" THEN 1 ELSE 0 END) as occupied FROM rooms GROUP BY floor ORDER BY floor'
    ).fetchall()
    db.close()
    return jsonify({
        'total': total, 'occupied': occ, 'vacant': vacant, 'maintenance': maint,
        'rate': round(occ / total * 100 if total else 0, 1),
        'by_floor': [dict(r) for r in by_floor]
    })
