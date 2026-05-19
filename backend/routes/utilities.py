from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_company_db, get_user_company
from datetime import date as dt_date

utilities_bp = Blueprint('utilities', __name__)

def _cdb(uid):
    role, company_id = get_user_company(uid)
    if not company_id:
        return None, None, None
    return role, company_id, get_company_db(company_id)

@utilities_bp.route('/', methods=['GET'])
@jwt_required()
def get_utilities():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    month = int(request.args.get('month', dt_date.today().month))
    year  = int(request.args.get('year',  dt_date.today().year))
    rows  = db.execute(
        '''SELECT ub.*, rm.room_number as room_no
           FROM utility_bills ub LEFT JOIN rooms rm ON ub.room_id=rm.id
           WHERE ub.month=? AND ub.year=? ORDER BY rm.room_number''',
        [month, year]
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@utilities_bp.route('/rooms', methods=['GET'])
@jwt_required()
def get_rooms_for_utility():
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify([])
    month = int(request.args.get('month', dt_date.today().month))
    year  = int(request.args.get('year',  dt_date.today().year))
    rows  = db.execute(
        '''SELECT rm.id as room_id, rm.room_number, res.id as resident_id, res.name as resident_name,
           ub.id as bill_id, ub.electricity_units, ub.electricity_amount,
           ub.water_amount, ub.other_amount, ub.total_amount, ub.status
           FROM rooms rm
           LEFT JOIN residents res ON res.room_id=rm.id AND res.status='active'
           LEFT JOIN utility_bills ub ON ub.room_id=rm.id AND ub.month=? AND ub.year=?
           WHERE rm.status='occupied' ORDER BY rm.room_number''',
        [month, year]
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@utilities_bp.route('/', methods=['POST'])
@jwt_required()
def upsert_utility():
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data  = request.get_json()
    month = int(data.get('month', dt_date.today().month))
    year  = int(data.get('year',  dt_date.today().year))

    elec_amt  = float(data.get('electricity_amount', 0))
    water_amt = float(data.get('water_amount', 0))
    other_amt = float(data.get('other_amount', 0))
    total     = round(elec_amt + water_amt + other_amt, 2)

    room = db.execute('SELECT * FROM rooms WHERE id=?', [data['room_id']]).fetchone()
    res  = db.execute('SELECT id, name FROM residents WHERE room_id=? AND status="active"', [data['room_id']]).fetchone()

    existing = db.execute('SELECT id FROM utility_bills WHERE room_id=? AND month=? AND year=?',
                          [data['room_id'], month, year]).fetchone()
    if existing:
        db.execute(
            'UPDATE utility_bills SET electricity_units=?,electricity_amount=?,water_amount=?,other_amount=?,total_amount=? WHERE id=?',
            [data.get('electricity_units', 0), elec_amt, water_amt, other_amt, total, existing['id']]
        )
        bid = existing['id']
    else:
        cur = db.execute(
            '''INSERT INTO utility_bills
               (room_id,resident_id,resident_name,room_number,month,year,
                electricity_units,electricity_amount,water_amount,other_amount,total_amount)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
            [data['room_id'], res['id'] if res else None, res['name'] if res else '',
             room['room_number'] if room else '', month, year,
             data.get('electricity_units', 0), elec_amt, water_amt, other_amt, total]
        )
        bid = cur.lastrowid
    db.commit()
    row = db.execute('SELECT * FROM utility_bills WHERE id=?', [bid]).fetchone()
    db.close()
    return jsonify(dict(row)), 201

@utilities_bp.route('/<int:bid>', methods=['PUT'])
@jwt_required()
def update_utility(bid):
    uid  = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    fields  = ['electricity_units','electricity_amount','water_amount','other_amount','total_amount','status','paid_date']
    updates = {f: data[f] for f in fields if f in data}
    if any(k in data for k in ('electricity_amount','water_amount','other_amount')):
        row = db.execute('SELECT * FROM utility_bills WHERE id=?', [bid]).fetchone()
        if row:
            updates['total_amount'] = round(
                float(data.get('electricity_amount', row['electricity_amount'] or 0)) +
                float(data.get('water_amount',       row['water_amount']       or 0)) +
                float(data.get('other_amount',        row['other_amount']        or 0)), 2)
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE utility_bills SET {sets} WHERE id=?', list(updates.values()) + [bid])
        db.commit()
    row = db.execute('SELECT * FROM utility_bills WHERE id=?', [bid]).fetchone()
    db.close()
    return jsonify(dict(row))

@utilities_bp.route('/<int:bid>', methods=['DELETE'])
@jwt_required()
def delete_utility(bid):
    uid = int(get_jwt_identity())
    role, company_id, db = _cdb(uid)
    if not db:
        return jsonify({'error': 'No company'}), 400
    db.execute('DELETE FROM utility_bills WHERE id=?', [bid])
    db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})
