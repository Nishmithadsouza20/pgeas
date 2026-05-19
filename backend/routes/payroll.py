from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company
from datetime import date as dt_date
import calendar

payroll_bp = Blueprint('payroll', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

@payroll_bp.route('/', methods=['GET'])
@jwt_required()
def get_payroll():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    month = int(request.args.get('month', dt_date.today().month))
    year  = int(request.args.get('year',  dt_date.today().year))
    rows  = db.execute(
        '''SELECT p.*, s.name as staff_name, s.role as staff_role, s.phone as staff_phone
           FROM payroll p JOIN staff s ON p.staff_id=s.id
           WHERE p.month=? AND p.year=? ORDER BY s.name''',
        [month, year]
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@payroll_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_payroll():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data  = request.get_json() or {}
    month = int(data.get('month', dt_date.today().month))
    year  = int(data.get('year',  dt_date.today().year))

    working_days = calendar.monthrange(year, month)[1]
    staff_list   = db.execute("SELECT * FROM staff WHERE status='active'").fetchall()

    for s in staff_list:
        present = db.execute(
            "SELECT COUNT(*) as c FROM staff_attendance WHERE staff_id=? AND strftime('%m',date)=? AND strftime('%Y',date)=? AND status IN ('present','late')",
            [s['id'], str(month).zfill(2), str(year)]
        ).fetchone()['c']
        half_days = db.execute(
            "SELECT COUNT(*) as c FROM staff_attendance WHERE staff_id=? AND strftime('%m',date)=? AND strftime('%Y',date)=? AND status='half_day'",
            [s['id'], str(month).zfill(2), str(year)]
        ).fetchone()['c']

        daily_rate = (s['salary'] or 0) / working_days if working_days else 0
        earned     = (present * daily_rate) + (half_days * daily_rate * 0.5)
        net        = round(earned, 2)

        existing = db.execute('SELECT id, advances, deductions, bonus FROM payroll WHERE staff_id=? AND month=? AND year=?',
                              [s['id'], month, year]).fetchone()
        if existing:
            adv = existing['advances'] or 0
            ded = existing['deductions'] or 0
            bon = existing['bonus'] or 0
            db.execute(
                'UPDATE payroll SET base_salary=?,working_days=?,present_days=?,net_salary=? WHERE id=?',
                [s['salary'], working_days, present + half_days * 0.5, round(net + bon - adv - ded, 2), existing['id']]
            )
        else:
            db.execute(
                'INSERT INTO payroll (staff_id,month,year,base_salary,working_days,present_days,net_salary) VALUES (?,?,?,?,?,?,?)',
                [s['id'], month, year, s['salary'], working_days, present + half_days * 0.5, net]
            )
    db.commit()
    db.close()
    return jsonify({'message': f'Payroll generated for {month}/{year}'})

@payroll_bp.route('/<int:pid>', methods=['PUT'])
@jwt_required()
def update_payroll(pid):
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data   = request.get_json()
    fields = ['advances', 'deductions', 'bonus', 'status', 'paid_date', 'notes']
    updates = {f: data[f] for f in fields if f in data}

    row = db.execute('SELECT * FROM payroll WHERE id=?', [pid]).fetchone()
    if row:
        adv  = float(data.get('advances',  row['advances']  or 0))
        ded  = float(data.get('deductions', row['deductions'] or 0))
        bon  = float(data.get('bonus',     row['bonus']     or 0))
        wd   = row['working_days'] or 1
        pd   = row['present_days'] or 0
        base = row['base_salary'] or 0
        earned = base * (pd / wd)
        updates['net_salary'] = round(earned + bon - adv - ded, 2)

    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE payroll SET {sets} WHERE id=?', list(updates.values()) + [pid])
        db.commit()

    row = db.execute('SELECT p.*, s.name as staff_name FROM payroll p JOIN staff s ON p.staff_id=s.id WHERE p.id=?', [pid]).fetchone()
    db.close()
    return jsonify(dict(row))
