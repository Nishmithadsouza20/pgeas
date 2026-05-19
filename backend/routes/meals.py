from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company
from datetime import date as dt_date
import calendar

meals_bp = Blueprint('meals', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

def _get_settings(db):
    row = db.execute('SELECT * FROM meal_settings ORDER BY id LIMIT 1').fetchone()
    if not row:
        db.execute('INSERT INTO meal_settings (breakfast_rate,lunch_rate,dinner_rate) VALUES (30,50,50)')
        db.commit()
        row = db.execute('SELECT * FROM meal_settings ORDER BY id LIMIT 1').fetchone()
    return dict(row)

@meals_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    uid = int(get_jwt_identity())
    _, _, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    s = _get_settings(db)
    db.close()
    return jsonify(s)

@meals_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    uid = int(get_jwt_identity())
    _, _, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    s = _get_settings(db)
    db.execute(
        'UPDATE meal_settings SET breakfast_rate=?,lunch_rate=?,dinner_rate=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [data.get('breakfast_rate', s['breakfast_rate']),
         data.get('lunch_rate',    s['lunch_rate']),
         data.get('dinner_rate',   s['dinner_rate']),
         s['id']]
    )
    db.commit()
    db.close()
    return jsonify({'message': 'Settings updated'})

@meals_bp.route('/', methods=['GET'])
@jwt_required()
def get_meal_attendance():
    uid = int(get_jwt_identity())
    _, _, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400

    date = request.args.get('date', dt_date.today().isoformat())

    rows = db.execute(
        '''SELECT r.id as resident_id, r.name as resident_name,
               rm.room_number,
               COALESCE(ma.breakfast, 1) as breakfast,
               COALESCE(ma.lunch,     1) as lunch,
               COALESCE(ma.dinner,    1) as dinner,
               ma.notes
           FROM residents r
           LEFT JOIN rooms rm ON r.room_id = rm.id
           LEFT JOIN meal_attendance ma ON ma.resident_id = r.id AND ma.date = ?
           WHERE r.status = 'active'
           ORDER BY rm.room_number, r.name''',
        [date]
    ).fetchall()

    s = _get_settings(db)
    db.close()
    return jsonify({'date': date, 'residents': [dict(r) for r in rows], 'settings': s})

@meals_bp.route('/', methods=['POST'])
@jwt_required()
def save_meal_attendance():
    uid = int(get_jwt_identity())
    _, _, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400

    data    = request.get_json()
    records = data if isinstance(data, list) else [data]

    for rec in records:
        rid   = rec.get('resident_id')
        date  = rec.get('date', dt_date.today().isoformat())
        b     = 1 if rec.get('breakfast', True) else 0
        l     = 1 if rec.get('lunch',     True) else 0
        d     = 1 if rec.get('dinner',    True) else 0
        notes = rec.get('notes', '')
        rname = rec.get('resident_name', '')
        rno   = rec.get('room_number', '')

        existing = db.execute('SELECT id FROM meal_attendance WHERE resident_id=? AND date=?', [rid, date]).fetchone()
        if existing:
            db.execute(
                'UPDATE meal_attendance SET breakfast=?,lunch=?,dinner=?,notes=? WHERE id=?',
                [b, l, d, notes, existing['id']]
            )
        else:
            db.execute(
                'INSERT INTO meal_attendance (resident_id,resident_name,room_number,date,breakfast,lunch,dinner,notes) VALUES (?,?,?,?,?,?,?,?)',
                [rid, rname, rno, date, b, l, d, notes]
            )
    db.commit()
    db.close()
    return jsonify({'message': 'Meal attendance saved'})

@meals_bp.route('/monthly', methods=['GET'])
@jwt_required()
def monthly_summary():
    uid = int(get_jwt_identity())
    _, _, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400

    month = request.args.get('month', dt_date.today().strftime('%m'))
    year  = request.args.get('year',  dt_date.today().strftime('%Y'))
    s     = _get_settings(db)

    rows = db.execute(
        '''SELECT r.id as resident_id, r.name as resident_name, rm.room_number,
               COUNT(ma.id)                              as days_marked,
               SUM(COALESCE(ma.breakfast, 0))            as breakfast_days,
               SUM(COALESCE(ma.lunch, 0))                as lunch_days,
               SUM(COALESCE(ma.dinner, 0))               as dinner_days
           FROM residents r
           LEFT JOIN rooms rm ON r.room_id = rm.id
           LEFT JOIN meal_attendance ma ON ma.resident_id = r.id
               AND strftime('%m', ma.date) = ?
               AND strftime('%Y', ma.date) = ?
           WHERE r.status = 'active'
           GROUP BY r.id ORDER BY rm.room_number, r.name''',
        [str(month).zfill(2), str(year)]
    ).fetchall()

    result = []
    for r in rows:
        d = dict(r)
        d['meal_cost'] = round(
            d['breakfast_days'] * s['breakfast_rate'] +
            d['lunch_days']     * s['lunch_rate']     +
            d['dinner_days']    * s['dinner_rate'], 2
        )
        result.append(d)

    _, days_in_month = calendar.monthrange(int(year), int(month))
    db.close()
    return jsonify({'month': month, 'year': year, 'days_in_month': days_in_month,
                    'settings': s, 'residents': result})
