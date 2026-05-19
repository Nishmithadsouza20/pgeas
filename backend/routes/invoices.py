from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company
from datetime import date as dt_date

invoices_bp = Blueprint('invoices', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

@invoices_bp.route('/', methods=['GET'])
@jwt_required()
def get_invoices():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    month = int(request.args.get('month', dt_date.today().month))
    year  = int(request.args.get('year',  dt_date.today().year))

    rows = db.execute(
        '''SELECT r.id as resident_id, r.name as resident_name, r.phone, r.email,
           r.move_in_date, rm.room_number, rm.rent_amount, rm.type as room_type,
           p.id as payment_id, p.amount, p.penalty, p.status as payment_status, p.paid_date,
           COALESCE(ub.total_amount,0) as utility_amount,
           COALESCE(ub.electricity_amount,0) as electricity_amount,
           COALESCE(ub.water_amount,0) as water_amount,
           COALESCE(ub.other_amount,0) as other_amount,
           COALESCE(sd.amount,0) as deposit_held
           FROM residents r
           JOIN rooms rm ON r.room_id=rm.id
           LEFT JOIN payments p ON p.resident_id=r.id AND p.month=? AND p.year=?
           LEFT JOIN utility_bills ub ON ub.resident_id=r.id AND ub.month=? AND ub.year=?
           LEFT JOIN security_deposits sd ON sd.resident_id=r.id AND sd.status='held'
           WHERE r.status="active" ORDER BY rm.room_number''',
        [month, year, month, year]
    ).fetchall()
    db.close()
    return jsonify({'month': month, 'year': year, 'invoices': [dict(r) for r in rows]})

@invoices_bp.route('/<int:resident_id>', methods=['GET'])
@jwt_required()
def get_single_invoice(resident_id):
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    month = int(request.args.get('month', dt_date.today().month))
    year  = int(request.args.get('year',  dt_date.today().year))

    row = db.execute(
        '''SELECT r.id as resident_id, r.name as resident_name, r.phone, r.email,
           r.move_in_date, rm.room_number, rm.rent_amount, rm.type as room_type,
           p.id as payment_id, p.amount, p.penalty, p.status as payment_status, p.paid_date
           FROM residents r JOIN rooms rm ON r.room_id=rm.id
           LEFT JOIN payments p ON p.resident_id=r.id AND p.month=? AND p.year=?
           WHERE r.id=?''',
        [month, year, resident_id]
    ).fetchone()
    db.close()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(row))
