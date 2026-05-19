from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company
from datetime import date as dt_date

attendance_bp = Blueprint('attendance', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

@attendance_bp.route('/', methods=['GET'])
@jwt_required()
def get_attendance():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400

    date_filter = request.args.get('date', dt_date.today().isoformat())
    month       = request.args.get('month')
    year        = request.args.get('year')
    staff_id    = request.args.get('staff_id')

    if staff_id and month and year:
        rows = db.execute(
            '''SELECT sa.*, s.name as staff_name, s.role as staff_role
               FROM staff_attendance sa JOIN staff s ON sa.staff_id=s.id
               WHERE sa.staff_id=? AND strftime('%m',sa.date)=? AND strftime('%Y',sa.date)=?
               ORDER BY sa.date''',
            [staff_id, str(month).zfill(2), str(year)]
        ).fetchall()
    elif month and year:
        rows = db.execute(
            '''SELECT s.id as staff_id, s.name as staff_name, s.role as staff_role,
               COUNT(CASE WHEN sa.status='present' THEN 1 END) as present,
               COUNT(CASE WHEN sa.status='absent' THEN 1 END) as absent,
               COUNT(CASE WHEN sa.status='late' THEN 1 END) as late,
               COUNT(CASE WHEN sa.status='half_day' THEN 1 END) as half_day,
               COUNT(sa.id) as total_marked
               FROM staff s
               LEFT JOIN staff_attendance sa ON s.id=sa.staff_id
                   AND strftime('%m',sa.date)=? AND strftime('%Y',sa.date)=?
               WHERE s.status='active'
               GROUP BY s.id ORDER BY s.name''',
            [str(month).zfill(2), str(year)]
        ).fetchall()
    else:
        rows = db.execute(
            '''SELECT s.id as staff_id, s.name as staff_name, s.role as staff_role,
               sa.id, sa.status, sa.check_in, sa.check_out, sa.notes, sa.date
               FROM staff s
               LEFT JOIN staff_attendance sa ON s.id=sa.staff_id AND sa.date=?
               WHERE s.status='active' ORDER BY s.name''',
            [date_filter]
        ).fetchall()

    db.close()
    return jsonify([dict(r) for r in rows])

@attendance_bp.route('/', methods=['POST'])
@jwt_required()
def mark_attendance():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    records = data if isinstance(data, list) else [data]

    for rec in records:
        sid       = rec.get('staff_id')
        att_date  = rec.get('date', dt_date.today().isoformat())
        status    = rec.get('status', 'present')
        check_in  = rec.get('check_in', '')
        check_out = rec.get('check_out', '')
        notes     = rec.get('notes', '')
        existing  = db.execute('SELECT id FROM staff_attendance WHERE staff_id=? AND date=?', [sid, att_date]).fetchone()
        if existing:
            db.execute('UPDATE staff_attendance SET status=?,check_in=?,check_out=?,notes=? WHERE id=?',
                       [status, check_in, check_out, notes, existing['id']])
        else:
            db.execute('INSERT INTO staff_attendance (staff_id,date,status,check_in,check_out,notes) VALUES (?,?,?,?,?,?)',
                       [sid, att_date, status, check_in, check_out, notes])
    db.commit()
    db.close()
    return jsonify({'message': 'Attendance saved'})

@attendance_bp.route('/summary', methods=['GET'])
@jwt_required()
def monthly_summary():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    month = request.args.get('month', dt_date.today().strftime('%m'))
    year  = request.args.get('year',  dt_date.today().strftime('%Y'))
    rows  = db.execute(
        '''SELECT s.id as staff_id, s.name, s.role as staff_role, s.salary,
           COUNT(CASE WHEN sa.status IN ('present','late') THEN 1 END) as present_days,
           COUNT(CASE WHEN sa.status='half_day' THEN 1 END) as half_days,
           COUNT(CASE WHEN sa.status='absent' THEN 1 END) as absent_days,
           COUNT(sa.id) as total_marked
           FROM staff s
           LEFT JOIN staff_attendance sa ON s.id=sa.staff_id
               AND strftime('%m',sa.date)=? AND strftime('%Y',sa.date)=?
           WHERE s.status='active' GROUP BY s.id ORDER BY s.name''',
        [str(month).zfill(2), str(year)]
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])
