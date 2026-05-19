import datetime as dt
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company

whatsapp_bp = Blueprint('whatsapp', __name__)

# WhatsApp message log table lives in each company DB.
# Table is created lazily here via _ensure_wa_table().

def _ensure_wa_table(cdb):
    cdb.execute('''CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        to_name    TEXT DEFAULT '',
        to_phone   TEXT NOT NULL,
        message    TEXT NOT NULL,
        msg_type   TEXT DEFAULT 'manual',
        status     TEXT DEFAULT 'sent',
        sent_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    cdb.commit()


def _owner_company(uid):
    role, cid = get_user_company(uid)
    if role not in ('owner', 'super_admin') or not cid:
        return None, None
    return role, cid


# ── Send a single WhatsApp ──────────────────────────────────────────────
@whatsapp_bp.route('/send', methods=['POST'])
@jwt_required()
def send_one():
    uid  = int(get_jwt_identity())
    role, cid = _owner_company(uid)
    if not cid:
        return jsonify({'error': 'Forbidden'}), 403
    data  = request.get_json() or {}
    phone = data.get('phone', '').strip()
    name  = data.get('name', '')
    msg   = data.get('message', '').strip()
    mtype = data.get('msg_type', 'manual')
    if not phone or not msg:
        return jsonify({'error': 'phone and message required'}), 400

    cdb = get_company_db(cid)
    _ensure_wa_table(cdb)
    cur = cdb.execute(
        'INSERT INTO whatsapp_messages (to_name,to_phone,message,msg_type) VALUES (?,?,?,?)',
        [name, phone, msg, mtype]
    )
    cdb.commit()
    row = cdb.execute('SELECT * FROM whatsapp_messages WHERE id=?', [cur.lastrowid]).fetchone()
    cdb.close()

    print(f"\n[WhatsApp → {phone} ({name})]\n{msg}\n")
    return jsonify(dict(row)), 201


# ── Blast to many numbers ───────────────────────────────────────────────
@whatsapp_bp.route('/blast', methods=['POST'])
@jwt_required()
def blast():
    uid  = int(get_jwt_identity())
    role, cid = _owner_company(uid)
    if not cid:
        return jsonify({'error': 'Forbidden'}), 403
    data  = request.get_json() or {}
    msg   = data.get('message', '').strip()
    mtype = data.get('msg_type', 'blast')
    if not msg:
        return jsonify({'error': 'message required'}), 400

    cdb = get_company_db(cid)
    _ensure_wa_table(cdb)

    # Fetch all active residents with phones
    residents = cdb.execute(
        "SELECT name, phone FROM residents WHERE status='active' AND phone != '' AND phone IS NOT NULL"
    ).fetchall()

    sent = 0
    for r in residents:
        cdb.execute(
            'INSERT INTO whatsapp_messages (to_name,to_phone,message,msg_type) VALUES (?,?,?,?)',
            [r['name'], r['phone'], msg, mtype]
        )
        print(f"[WhatsApp blast → {r['phone']} ({r['name']})]\n{msg}")
        sent += 1

    cdb.commit()
    cdb.close()
    return jsonify({'sent': sent, 'message': f'Blast sent to {sent} residents'})


# ── Payment reminder blast ──────────────────────────────────────────────
@whatsapp_bp.route('/payment-reminder', methods=['POST'])
@jwt_required()
def payment_reminder():
    uid  = int(get_jwt_identity())
    role, cid = _owner_company(uid)
    if not cid:
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json() or {}

    cdb = get_company_db(cid)
    _ensure_wa_table(cdb)

    db  = get_db()
    company = db.execute('SELECT company_name FROM pg_companies WHERE id=?', [cid]).fetchone()
    db.close()
    pg_name = company['company_name'] if company else 'Your PG'

    today = dt.date.today()
    month = data.get('month', today.month)
    year  = data.get('year',  today.year)
    custom_msg = data.get('custom_message', '')

    # Find pending payments for this month
    pending = cdb.execute(
        '''SELECT p.id, p.amount, r.name, r.phone
           FROM payments p
           JOIN residents r ON r.id = p.resident_id
           WHERE p.month=? AND p.year=? AND p.status != 'paid'
             AND r.phone != '' AND r.phone IS NOT NULL''',
        [month, year]
    ).fetchall()

    sent = 0
    for p in pending:
        msg = custom_msg or (
            f"Hi {p['name']},\n\n"
            f"This is a payment reminder from {pg_name}.\n\n"
            f"Rent due : Rs {p['amount']:,.0f}\n"
            f"Month    : {str(month).zfill(2)}/{year}\n\n"
            f"Please pay at your earliest convenience.\nThank you!"
        )
        cdb.execute(
            'INSERT INTO whatsapp_messages (to_name,to_phone,message,msg_type) VALUES (?,?,?,?)',
            [p['name'], p['phone'], msg, 'payment_reminder']
        )
        print(f"[WA Reminder → {p['phone']} ({p['name']})]\n{msg}")
        sent += 1

    cdb.commit()
    cdb.close()
    return jsonify({'sent': sent, 'message': f'Payment reminders sent to {sent} residents'})


# ── Message history ─────────────────────────────────────────────────────
@whatsapp_bp.route('/history', methods=['GET'])
@jwt_required()
def history():
    uid  = int(get_jwt_identity())
    role, cid = _owner_company(uid)
    if not cid:
        return jsonify({'error': 'Forbidden'}), 403
    cdb  = get_company_db(cid)
    _ensure_wa_table(cdb)
    rows = cdb.execute(
        'SELECT * FROM whatsapp_messages ORDER BY sent_at DESC LIMIT 200'
    ).fetchall()
    cdb.close()
    return jsonify([dict(r) for r in rows])


# ── Stats ────────────────────────────────────────────────────────────────
@whatsapp_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    uid  = int(get_jwt_identity())
    role, cid = _owner_company(uid)
    if not cid:
        return jsonify({'error': 'Forbidden'}), 403
    cdb  = get_company_db(cid)
    _ensure_wa_table(cdb)
    total  = cdb.execute('SELECT COUNT(*) as c FROM whatsapp_messages').fetchone()['c']
    today  = str(dt.date.today())
    today_count = cdb.execute(
        "SELECT COUNT(*) as c FROM whatsapp_messages WHERE DATE(sent_at)=?", [today]
    ).fetchone()['c']
    by_type = cdb.execute(
        'SELECT msg_type, COUNT(*) as count FROM whatsapp_messages GROUP BY msg_type'
    ).fetchall()
    cdb.close()
    return jsonify({'total': total, 'today': today_count, 'by_type': [dict(r) for r in by_type]})
