from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company
import bcrypt
import random
import string
import os
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

SUPER_ADMIN_EMAIL = os.getenv('SUPER_ADMIN_EMAIL', '').lower()
OWNER_EMAIL = os.getenv('OWNER_EMAIL', '').lower()

def assign_role(email):
    e = email.lower()
    if e == SUPER_ADMIN_EMAIL:
        return 'super_admin'
    if e == OWNER_EMAIL:
        return 'owner'
    return None  # caller sets default

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name  = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    pwd   = data.get('password', '')
    phone = data.get('phone', '').strip()
    role  = data.get('role', 'customer')

    if not all([name, email, pwd]):
        return jsonify({'error': 'name, email and password are required'}), 400

    forced_role = assign_role(email)
    if forced_role:
        role = forced_role

    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE email = ?', [email]).fetchone()
    if existing:
        db.close()
        return jsonify({'error': 'Email already registered'}), 409

    pw_hash = bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()
    db.execute(
        'INSERT INTO users (name, email, password_hash, phone, role, is_verified) VALUES (?,?,?,?,?,?)',
        [name, email, pw_hash, phone, role, 0]
    )
    db.commit()

    otp = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)
    db.execute(
        'INSERT INTO otp_tokens (email, otp, expires_at) VALUES (?,?,?)',
        [email, otp, expires.strftime('%Y-%m-%d %H:%M:%S')]
    )
    db.commit()
    db.close()

    print(f"\n[OTP] Verification OTP for {email}: {otp}\n")

    return jsonify({
        'message': 'Registered successfully. Check console/email for OTP.',
        'email': email,
        'otp_hint': otp  # remove in production
    }), 201

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data  = request.get_json()
    email = data.get('email', '').strip().lower()
    otp   = data.get('otp', '').strip()

    if not email or not otp:
        return jsonify({'error': 'email and otp required'}), 400

    db = get_db()
    token = db.execute(
        '''SELECT * FROM otp_tokens WHERE email=? AND otp=? AND is_used=0
           AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1''',
        [email, otp]
    ).fetchone()

    if not token:
        db.close()
        return jsonify({'error': 'Invalid or expired OTP'}), 400

    db.execute('UPDATE otp_tokens SET is_used=1 WHERE id=?', [token['id']])
    db.execute('UPDATE users SET is_verified=1 WHERE email=?', [email])
    db.commit()
    db.close()
    return jsonify({'message': 'Email verified successfully'})

@auth_bp.route('/login', methods=['POST'])
def login():
    data  = request.get_json()
    email = data.get('email', '').strip().lower()
    pwd   = data.get('password', '')

    if not email or not pwd:
        return jsonify({'error': 'email and password required'}), 400

    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE email=?', [email]).fetchone()
    db.close()

    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    if not bcrypt.checkpw(pwd.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = create_access_token(identity=str(user['id']))
    return jsonify({
        'token': token,
        'user': {
            'id':          user['id'],
            'name':        user['name'],
            'email':       user['email'],
            'role':        user['role'],
            'is_verified': user['is_verified']
        }
    })

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    uid = int(get_jwt_identity())
    db  = get_db()
    user = db.execute('SELECT id,name,email,role,phone,is_verified,created_at,company_id FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    res = None
    if user['company_id']:
        try:
            cdb = get_company_db(user['company_id'])
            r   = cdb.execute(
                'SELECT res.*, rm.room_number FROM residents res LEFT JOIN rooms rm ON res.room_id=rm.id WHERE res.user_id=? AND res.status="active"',
                [uid]
            ).fetchone()
            cdb.close()
            if r:
                res = dict(r)
        except Exception:
            pass
    return jsonify({
        'id': user['id'], 'name': user['name'], 'email': user['email'],
        'role': user['role'], 'phone': user['phone'],
        'is_verified': user['is_verified'], 'created_at': user['created_at'],
        'resident': res
    })

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    email = request.get_json().get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'email required'}), 400

    db   = get_db()
    user = db.execute('SELECT id FROM users WHERE email=?', [email]).fetchone()
    if not user:
        db.close()
        return jsonify({'error': 'Email not found'}), 404

    otp     = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)
    db.execute('INSERT INTO otp_tokens (email, otp, expires_at) VALUES (?,?,?)',
               [email, otp, expires.strftime('%Y-%m-%d %H:%M:%S')])
    db.commit()
    db.close()
    print(f"\n[OTP] Password reset OTP for {email}: {otp}\n")
    return jsonify({'message': 'OTP sent', 'otp_hint': otp})

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data     = request.get_json()
    email    = data.get('email', '').strip().lower()
    otp      = data.get('otp', '').strip()
    new_pwd  = data.get('new_password', '')

    if not all([email, otp, new_pwd]):
        return jsonify({'error': 'email, otp and new_password required'}), 400

    db    = get_db()
    token = db.execute(
        '''SELECT * FROM otp_tokens WHERE email=? AND otp=? AND is_used=0
           AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1''',
        [email, otp]
    ).fetchone()

    if not token:
        db.close()
        return jsonify({'error': 'Invalid or expired OTP'}), 400

    pw_hash = bcrypt.hashpw(new_pwd.encode(), bcrypt.gensalt()).decode()
    db.execute('UPDATE otp_tokens SET is_used=1 WHERE id=?', [token['id']])
    db.execute('UPDATE users SET password_hash=? WHERE email=?', [pw_hash, email])
    db.commit()
    db.close()
    return jsonify({'message': 'Password reset successfully'})

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    uid  = int(get_jwt_identity())
    db   = get_db()
    role = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()['role']
    if role not in ('super_admin', 'owner'):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    users = db.execute('SELECT id,name,email,role,phone,is_verified,created_at FROM users').fetchall()
    db.close()
    return jsonify([dict(u) for u in users])
