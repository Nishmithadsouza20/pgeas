"""
PGease — Master Demo Seed Script
Creates 15 companies: every property type (pg/hostel/lodge/dormitory/apartment)
× every plan (basic/premium/enterprise) — so every plan is covered for every type.

Run: python seed.py
"""

import bcrypt
import random
from datetime import datetime, timedelta, date

from database import init_db, get_db, get_company_db


# ─── helpers ────────────────────────────────────────────────────────────────
def hashpw(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

_now   = datetime.utcnow()
_today = date.today()

def ts(days=0):
    return (_now - timedelta(days=days)).strftime('%Y-%m-%d %H:%M:%S')

def dt(days=0):
    return (_today - timedelta(days=days)).isoformat()

PLAN_AMT = {'basic': 2999, 'premium': 4999, 'enterprise': 7999}


# ─── account definitions ────────────────────────────────────────────────────
SUPER_ADMIN = ('PGease Admin', 'admin@pgease.com', 'Admin@123', '9800000001')

# 15 companies — 5 property types × 3 plans
# (property_type, plan, status, company_name, owner_name, owner_email,
#  city, address, total_rooms, logo, phone)
COMPANIES = [
    # ── PG ──────────────────────────────────────────────────────────────────
    ('pg', 'basic',      'active', 'Cozy Nest PG',        'Suresh Kamath',  'owner.pg.basic@pgease.com',       'Mysore',     '14 Sayyaji Rao Road',           20, '🏡', '9811010001'),
    ('pg', 'premium',    'active', 'Sunrise PG Homes',    'Rajesh Kumar',   'owner.pg.premium@pgease.com',     'Bangalore',  '12 MG Road, Indiranagar',       30, '🌅', '9811010002'),
    ('pg', 'enterprise', 'active', 'Royal Comfort PG',    'Neha Sharma',    'owner.pg.enterprise@pgease.com',  'Bangalore',  '55 Whitefield Main Road',       50, '👑', '9811010003'),

    # ── Hostel ──────────────────────────────────────────────────────────────
    ('hostel', 'basic',      'trial',  'Budget Nest Hostel',  'Ankit Joshi',    'owner.hostel.basic@pgease.com',   'Pune',       '9 Kothrud Colony',              25, '🏨', '9811020001'),
    ('hostel', 'premium',    'active', 'Green Valley Hostel', 'Priya Patel',    'owner.hostel.premium@pgease.com', 'Mumbai',     '88 Andheri West',               60, '🌿', '9811020002'),
    ('hostel', 'enterprise', 'active', 'Elite Stay Hostel',   'Rohan Verma',    'owner.hostel.enterprise@pgease.com','Hyderabad','23 Banjara Hills',             120, '⭐', '9811020003'),

    # ── Lodge ───────────────────────────────────────────────────────────────
    ('lodge', 'basic',      'active', 'City Budget Lodge',   'Meena Rao',      'owner.lodge.basic@pgease.com',    'Chennai',    '5 Anna Nagar East',             12, '🛏️', '9811030001'),
    ('lodge', 'premium',    'active', 'Metro Lodge',         'Kiran Naik',     'owner.lodge.premium@pgease.com',  'Bangalore',  '67 Residency Road',             20, '🏙️', '9811030002'),
    ('lodge', 'enterprise', 'active', 'Grand Stay Lodge',    'Arun Pillai',    'owner.lodge.enterprise@pgease.com','Delhi',     '18 Connaught Place',            35, '🏰', '9811030003'),

    # ── Dormitory ───────────────────────────────────────────────────────────
    ('dormitory', 'basic',      'trial',  'Campus Dorms',     'Divya Shetty',   'owner.dorm.basic@pgease.com',     'Manipal',    '3 University Campus Rd',        80, '🏫', '9811040001'),
    ('dormitory', 'premium',    'active', 'Metro Dormitory',  'Anitha Reddy',   'owner.dorm.premium@pgease.com',   'Hyderabad',  '34 HITECH City Road',          160, '🏢', '9811040002'),
    ('dormitory', 'enterprise', 'active', 'Premier Dorms',    'Sanjay Iyer',    'owner.dorm.enterprise@pgease.com','Chennai',   '7 IIT Madras Rd',              300, '🎓', '9811040003'),

    # ── Apartment ───────────────────────────────────────────────────────────
    ('apartment', 'basic',      'active', 'Urban Budget Flats','Ritu Bansode',  'owner.apartment.basic@pgease.com','Noida',     '12 Sector 18',                  10, '🏗️', '9811050001'),
    ('apartment', 'premium',    'active', 'Urban Apartments',  'Vikram Singh',  'owner.apartment.premium@pgease.com','Delhi',   '7 Connaught Place',             40, '🏘️', '9811050002'),
    ('apartment', 'enterprise', 'active', 'Prestige Residences','Kavitha Nair', 'owner.apartment.enterprise@pgease.com','Mumbai','99 Bandra West',              80, '🏯', '9811050003'),
]

# 1 resident per company — email: resident.pg.basic@pgease.com etc.
# (property_type, plan, name, email, phone, occupation)
RESIDENTS = [
    ('pg',        'basic',      'Arjun Sharma',   'resident.pg.basic@pgease.com',        '9876540001', 'Student'),
    ('pg',        'premium',    'Priya Mehta',    'resident.pg.premium@pgease.com',       '9876540002', 'Software Engineer'),
    ('pg',        'enterprise', 'Rohan Gupta',    'resident.pg.enterprise@pgease.com',    '9876540003', 'IT Professional'),
    ('hostel',    'basic',      'Rahul Kumar',    'resident.hostel.basic@pgease.com',     '9876540004', 'Student'),
    ('hostel',    'premium',    'Sneha Iyer',     'resident.hostel.premium@pgease.com',   '9876540005', 'Student'),
    ('hostel',    'enterprise', 'Vikram Reddy',   'resident.hostel.enterprise@pgease.com','9876540006', 'Research Scholar'),
    ('lodge',     'basic',      'Kavya Reddy',    'resident.lodge.basic@pgease.com',      '9876540007', 'Professional'),
    ('lodge',     'premium',    'Aditya Nair',    'resident.lodge.premium@pgease.com',    '9876540008', 'Sales Executive'),
    ('lodge',     'enterprise', 'Pooja Desai',    'resident.lodge.enterprise@pgease.com', '9876540009', 'Manager'),
    ('dormitory', 'basic',      'Mohammed Ali',   'resident.dorm.basic@pgease.com',       '9876540010', 'Student'),
    ('dormitory', 'premium',    'Deepa Krishnan', 'resident.dorm.premium@pgease.com',     '9876540011', 'Student'),
    ('dormitory', 'enterprise', 'Siddharth Rao',  'resident.dorm.enterprise@pgease.com',  '9876540012', 'PhD Scholar'),
    ('apartment', 'basic',      'Sunita Rao',     'resident.apartment.basic@pgease.com',  '9876540013', 'IT Professional'),
    ('apartment', 'premium',    'Karan Joshi',    'resident.apartment.premium@pgease.com','9876540014', 'Consultant'),
    ('apartment', 'enterprise', 'Meera Pillai',   'resident.apartment.enterprise@pgease.com','9876540015','Senior Manager'),
]

PW_OWNER    = 'Owner@123'
PW_RESIDENT = 'Resident@123'

# ─── data pools ─────────────────────────────────────────────────────────────
ROOM_TYPES_BY_PT = {
    'pg':        [('single',6000),('double',5000),('triple',4500)],
    'hostel':    [('single',5500),('double',4500),('triple',4000)],
    'lodge':     [('single',3500),('double',3000)],
    'dormitory': [('single',4000),('double',3500),('triple',3000)],
    'apartment': [('single',12000),('double',18000)],
}

AMENITIES_POOL = [
    'AC, WiFi, Attached Bathroom',
    'WiFi, Attached Bathroom',
    'Fan, Common Bathroom',
    'AC, Fan, WiFi, Cupboard',
    'WiFi, Fan, Cupboard',
    'AC, WiFi',
]

STAFF_POOL = [
    ('Ramaiah K',    'warden',      '9900001001', 18000, 'day'),
    ('Gowri Devi',   'cook',        '9900001002', 12000, 'day'),
    ('Ramu Nayak',   'security',    '9900001003', 10000, 'night'),
    ('Savita Bai',   'cleaner',     '9900001004',  8000, 'day'),
    ('Venkat S',     'maintenance', '9900001005', 13000, 'day'),
]

COMPLAINTS_POOL = [
    ('electrical', 'Light not working in room',   'high'),
    ('plumbing',   'Tap leaking in bathroom',      'medium'),
    ('wifi',       'WiFi very slow on top floor',  'high'),
    ('cleanliness','Common area not cleaned',      'low'),
    ('other',      'Noisy neighbours at night',    'low'),
    ('plumbing',   'Toilet flush broken',          'high'),
    ('electrical', 'Fan not working',              'medium'),
]

NOTICES_POOL = [
    ('Rent Due Reminder',   'Please pay your rent before the 5th of every month.', 'payment',     1),
    ('Water Supply Notice', 'Water supply off Sunday 10am–2pm for maintenance.',   'maintenance', 1),
    ('New WiFi Password',   'New WiFi password is PGease2025. Update your devices.','general',    0),
    ('Gate Closing Time',   'Main gate closes at 11 PM. Please carry your card.',  'rules',       1),
    ('Festival Holiday',    'Office closed on Diwali. Security on duty as usual.', 'general',     0),
]

MESS_MENU_DATA = [
    ('Monday',    'Breakfast', 'Idli, Sambar, Coconut Chutney, Tea',          '7:30 AM - 9:00 AM',  ''),
    ('Monday',    'Lunch',     'Rice, Dal Tadka, Aloo Sabzi, Roti, Salad',    '12:30 PM - 2:00 PM', ''),
    ('Monday',    'Dinner',    'Chapati, Paneer Butter Masala, Dal, Rice',     '7:30 PM - 9:00 PM',  ''),
    ('Tuesday',   'Breakfast', 'Poha, Boiled Egg, Tea/Coffee',                '7:30 AM - 9:00 AM',  ''),
    ('Tuesday',   'Lunch',     'Rice, Rajma, Jeera Aloo, Roti, Salad',        '12:30 PM - 2:00 PM', ''),
    ('Tuesday',   'Dinner',    'Chapati, Chicken Curry / Mix Veg, Dal, Rice', '7:30 PM - 9:00 PM',  ''),
    ('Wednesday', 'Breakfast', 'Upma, Chutney, Tea',                          '7:30 AM - 9:00 AM',  ''),
    ('Wednesday', 'Lunch',     'Rice, Sambar, Bhindi Fry, Roti, Papad',       '12:30 PM - 2:00 PM', ''),
    ('Wednesday', 'Dinner',    'Chapati, Egg Bhurji / Paneer Sabzi, Dal',     '7:30 PM - 9:00 PM',  ''),
    ('Thursday',  'Breakfast', 'Dosa, Sambar, Chutney, Tea',                  '7:30 AM - 9:00 AM',  ''),
    ('Thursday',  'Lunch',     'Rice, Chole, Capsicum Sabzi, Roti, Salad',    '12:30 PM - 2:00 PM', ''),
    ('Thursday',  'Dinner',    'Chapati, Fish Curry / Dal Makhani, Rice',     '7:30 PM - 9:00 PM',  ''),
    ('Friday',    'Breakfast', 'Bread Toast, Butter, Egg, Tea',               '7:30 AM - 9:00 AM',  ''),
    ('Friday',    'Lunch',     'Veg Biryani / Chicken Biryani, Raita, Salad', '12:30 PM - 2:00 PM', 'Special Friday Biryani'),
    ('Friday',    'Dinner',    'Chapati, Mutton Curry / Veg Kofta, Dal',      '7:30 PM - 9:00 PM',  ''),
    ('Saturday',  'Breakfast', 'Chole Bhature, Tea/Coffee',                   '8:00 AM - 10:00 AM', ''),
    ('Saturday',  'Lunch',     'Rice, Dal Fry, Gobi Sabzi, Roti, Pickle',     '12:30 PM - 2:00 PM', ''),
    ('Saturday',  'Dinner',    'Chapati, Egg Curry / Paneer Tikka, Rice',     '7:30 PM - 9:00 PM',  ''),
    ('Sunday',    'Breakfast', 'Pongal, Vada, Sambar, Tea/Coffee',            '8:30 AM - 10:30 AM', ''),
    ('Sunday',    'Lunch',     'Special Thali — Rice, Dal, 2 Sabzi, Roti, Kheer','1:00 PM - 2:30 PM','Special Sunday Lunch!'),
    ('Sunday',    'Dinner',    'Chapati, Chicken Roast / Veg Pulao, Dal',     '7:30 PM - 9:00 PM',  ''),
]

ENQUIRIES_POOL = [
    ('Kiran Patel',  '9811100001', 'single sharing',  8000, 'walk-in',     'new',       ''),
    ('Deepa Menon',  '9811100002', 'double sharing',  6000, 'phone',       'follow-up', 'Called twice, interested'),
    ('Rahul Singh',  '9811100003', 'single AC',      12000, 'website',     'interested','Ready to move next month'),
    ('Ananya Roy',   '9811100004', 'triple sharing',  4500, 'referral',    'converted', 'Booked Room 204'),
    ('Sanjay Kumar', '9811100005', 'single',          9000, 'social-media','new',       ''),
]

MAINT_POOL = [
    ('Leaking tap in bathroom', 'plumbing',   'high',   'open'),
    ('Fan not working',          'electrical', 'medium', 'in_progress'),
    ('Window latch broken',      'carpentry',  'low',    'completed'),
]


# ─── seed ───────────────────────────────────────────────────────────────────
def seed():
    print("\n=== PGease Master Seed — 15 Companies ===\n")

    # 1. Init platform DB tables
    print("[1] Initialising platform tables...")
    init_db()

    pdb = get_db()

    # 2. Wipe everything
    print("[2] Clearing old data...")
    pdb.execute("PRAGMA foreign_keys = OFF")
    for tbl in ['platform_leads', 'platform_emails', 'subscription_payments',
                'otp_tokens', 'users', 'pg_companies']:
        try:
            pdb.execute(f'DELETE FROM {tbl}')
            print(f"   cleared {tbl}")
        except Exception as e:
            print(f"   warning: {tbl} — {e}")
    pdb.execute("PRAGMA foreign_keys = ON")
    pdb.commit()

    # 3. Delete all old company DBs
    import os
    db_dir = os.path.dirname(os.path.abspath(__file__))
    for fname in os.listdir(db_dir):
        if fname.startswith('company_') and fname.endswith('.db'):
            os.remove(os.path.join(db_dir, fname))
            print(f"   deleted {fname}")

    # 4. Super admin
    print("\n[3] Creating super admin...")
    name, email, pw, phone = SUPER_ADMIN
    pdb.execute(
        'INSERT INTO users (name,email,password_hash,phone,role,is_verified) VALUES (?,?,?,?,?,?)',
        [name, email, hashpw(pw), phone, 'super_admin', 1]
    )
    pdb.commit()

    # 5. Build resident lookup by (property_type, plan)
    res_lookup = { (r[0], r[1]): r for r in RESIDENTS }

    # 6. Create each company
    for idx, (pt, plan, status, cname, oname, oemail, city, addr, total_rooms, logo, ophone) in enumerate(COMPANIES):
        print(f"\n   [{pt:10s} | {plan:10s}]  {cname}")

        amt = PLAN_AMT[plan]
        reg = ts(random.randint(30, 400))

        # Company record
        pdb.execute(
            '''INSERT INTO pg_companies
               (company_name,owner_name,owner_email,city,address,phone,plan,status,
                total_rooms,subscription_amount,pg_logo,property_type,registered_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            [cname, oname, oemail, city, addr, ophone, plan, status,
             total_rooms, amt, logo, pt, reg]
        )
        pdb.commit()
        cid = pdb.execute('SELECT last_insert_rowid()').fetchone()[0]

        # Owner user
        owner_uid = pdb.execute(
            'INSERT INTO users (name,email,password_hash,phone,role,company_id,is_verified) VALUES (?,?,?,?,?,?,?)',
            [oname, oemail, hashpw(PW_OWNER), ophone, 'owner', cid, 1]
        ).lastrowid
        pdb.execute('UPDATE pg_companies SET owner_user_id=? WHERE id=?', [owner_uid, cid])
        pdb.commit()

        # Subscription billing entry
        pdb.execute(
            '''INSERT INTO subscription_payments
               (company_id,amount,plan,period_month,period_year,status,due_date,paid_date,
                invoice_number,payment_method)
               VALUES (?,?,?,?,?,?,?,?,?,?)''',
            [cid, amt, plan,
             _today.month, _today.year,
             'paid' if status == 'active' else 'pending',
             dt(5), dt(2) if status == 'active' else '',
             f'INV-{cid:04d}-{_today.strftime("%Y%m")}',
             'bank_transfer' if status == 'active' else '']
        )
        pdb.commit()

        # Company DB
        cdb = get_company_db(cid)
        room_defs = ROOM_TYPES_BY_PT.get(pt, ROOM_TYPES_BY_PT['pg'])

        # Rooms — 12 per company
        room_ids = []
        count = 0
        for floor in range(1, 4):
            for num in range(1, 6):
                rtype, base_rent = random.choice(room_defs)
                cdb.execute(
                    'INSERT INTO rooms (room_number,floor,type,rent_amount,amenities,status) VALUES (?,?,?,?,?,?)',
                    [f"{floor}0{num}", floor, rtype, base_rent,
                     random.choice(AMENITIES_POOL), 'vacant']
                )
                count += 1
                if count >= 12:
                    break
            if count >= 12:
                break
        cdb.commit()
        all_rooms = cdb.execute('SELECT id, type, rent_amount FROM rooms').fetchall()

        # Resident
        res_def = res_lookup.get((pt, plan))
        if res_def:
            _, _, rname, remail, rphone, occ = res_def
            res_uid = pdb.execute(
                'INSERT INTO users (name,email,password_hash,phone,role,company_id,is_verified) VALUES (?,?,?,?,?,?,?)',
                [rname, remail, hashpw(PW_RESIDENT), rphone, 'customer', cid, 1]
            ).lastrowid
            pdb.commit()

            room = all_rooms[0]
            cdb.execute(
                '''INSERT INTO residents (user_id,room_id,name,email,phone,occupation,
                   id_proof_type,emergency_contact,move_in_date,status)
                   VALUES (?,?,?,?,?,?,?,?,?,?)''',
                [res_uid, room['id'], rname, remail, rphone, occ,
                 random.choice(['Aadhar','Passport','Driving License']),
                 f"Parent: +91{random.randint(9000000000,9999999999)}",
                 dt(random.randint(30, 180)), 'active']
            )
            cdb.execute('UPDATE rooms SET status="occupied" WHERE id=?', [room['id']])
            cdb.commit()
            res_id  = cdb.execute('SELECT last_insert_rowid()').fetchone()[0]
            res_ids = [(res_id, room['rent_amount'])]
        else:
            res_ids = []

        # Payments (3 months)
        for (rid, rent) in res_ids:
            for offset in range(2, -1, -1):
                d_ref = _today.replace(day=1) - timedelta(days=offset * 30)
                st    = random.choice(['paid', 'paid', 'paid', 'pending'])
                paid  = dt(random.randint(1, 5)) if st == 'paid' else None
                cdb.execute(
                    'INSERT INTO payments (resident_id,month,year,amount,status,paid_date) VALUES (?,?,?,?,?,?)',
                    [rid, d_ref.month, d_ref.year, rent, st, paid]
                )
        cdb.commit()

        # Staff (3–4)
        staff_sample = random.sample(STAFF_POOL, min(4, len(STAFF_POOL)))
        staff_ids = []
        for (sname, srole, sphone, salary, shift) in staff_sample:
            sid = cdb.execute(
                'INSERT INTO staff (name,role,phone,salary,join_date,shift,status) VALUES (?,?,?,?,?,?,?)',
                [sname, srole, sphone, salary, dt(random.randint(180,730)), shift, 'active']
            ).lastrowid
            staff_ids.append((sid, sname))
        cdb.commit()

        # Staff attendance (30 days)
        att_s = ['present','present','present','absent','late']
        for (sid, _) in staff_ids:
            for day in range(30):
                a = random.choice(att_s)
                ci = f"{random.randint(8,10):02d}:00" if a in ('present','late') else ''
                co = f"{random.randint(17,19):02d}:00" if a in ('present','late') else ''
                try:
                    cdb.execute(
                        'INSERT OR IGNORE INTO staff_attendance (staff_id,date,status,check_in,check_out) VALUES (?,?,?,?,?)',
                        [sid, dt(day), a, ci, co]
                    )
                except Exception:
                    pass
        cdb.commit()

        # Complaints
        all_res = cdb.execute('SELECT id FROM residents WHERE status="active"').fetchall()
        for i, (cat, desc, pri) in enumerate(COMPLAINTS_POOL[:5]):
            rid2 = all_res[i % len(all_res)]['id'] if all_res else 1
            st   = random.choice(['open','open','in-progress','resolved'])
            resp = 'We are looking into this.' if st == 'in-progress' else (
                   'Resolved. Please confirm.' if st == 'resolved' else None)
            cdb.execute(
                '''INSERT INTO complaints (resident_id,category,description,priority,status,response,created_at)
                   VALUES (?,?,?,?,?,?,?)''',
                [rid2, cat, desc, pri, st, resp, ts(random.randint(1, 30))]
            )
        cdb.commit()

        # Notices
        for (title, content, cat, important) in NOTICES_POOL[:3]:
            cdb.execute(
                'INSERT INTO notices (title,content,category,posted_by,created_at,is_active,is_important) VALUES (?,?,?,?,?,?,?)',
                [title, content, cat, owner_uid, ts(random.randint(0, 20)), 1, important]
            )
        cdb.commit()

        # Mess menu (pg / hostel / dormitory)
        if pt in ('pg', 'hostel', 'dormitory'):
            for (day, meal, items, timing, note) in MESS_MENU_DATA:
                cdb.execute(
                    'INSERT INTO mess_menu (day_of_week,meal_type,items,timing,special_note,week_number) VALUES (?,?,?,?,?,?)',
                    [day, meal, items, timing, note, 1]
                )
            cdb.commit()

        # Enquiries
        for (ename, ephone, pref, budget, src, est, notes) in ENQUIRIES_POOL:
            fu = dt(-random.randint(1, 5)) if est == 'follow-up' else ''
            cdb.execute(
                '''INSERT INTO enquiries (name,phone,room_type_preference,budget,source,status,notes,follow_up_date,created_at)
                   VALUES (?,?,?,?,?,?,?,?,?)''',
                [ename, ephone, pref, budget, src, est, notes, fu, ts(random.randint(0, 20))]
            )
        cdb.commit()

        # Maintenance
        snames = [s[1] for s in staff_ids]
        for (title, cat, pri, mst) in MAINT_POOL:
            cdb.execute(
                '''INSERT INTO maintenance_requests
                   (title,description,category,priority,status,assigned_to_name,created_at)
                   VALUES (?,?,?,?,?,?,?)''',
                [title, title + ' — needs attention', cat, pri, mst,
                 random.choice(snames) if snames and mst != 'open' else '',
                 ts(random.randint(1, 15))]
            )
        cdb.commit()

        # Security deposits
        for (rid2, rent) in res_ids:
            cdb.execute(
                '''INSERT INTO security_deposits (resident_id,resident_name,amount,paid_date,status)
                   VALUES (?,?,?,?,?)''',
                [rid2, rname if res_def else 'Resident',
                 random.choice([5000, 8000, 10000]),
                 dt(random.randint(30, 180)), 'held']
            )
        cdb.commit()

        cdb.close()
        print(f"      cid={cid}  rooms=12  staff={len(staff_ids)}")

    pdb.close()

    # ─── summary ────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  PGease Seed Complete")
    print("=" * 70)

    print(f"\n  SUPER ADMIN")
    print(f"  {'Email':<40} {'Password'}")
    print(f"  {SUPER_ADMIN[1]:<40} {SUPER_ADMIN[2]}")

    print(f"\n  OWNERS  (password: {PW_OWNER})")
    print(f"  {'Email':<44} {'Type':<12} {'Plan':<12} {'Status'}")
    print(f"  {'-'*44} {'-'*12} {'-'*12} {'-'*8}")
    for (pt, plan, status, cname, oname, oemail, *_) in COMPANIES:
        print(f"  {oemail:<44} {pt:<12} {plan:<12} {status}")

    print(f"\n  RESIDENTS  (password: {PW_RESIDENT})")
    print(f"  {'Email':<46} {'Type':<12} {'Plan':<12} {'Name'}")
    print(f"  {'-'*46} {'-'*12} {'-'*12} {'-'*20}")
    for (pt, plan, rname, remail, *_) in RESIDENTS:
        print(f"  {remail:<46} {pt:<12} {plan:<12} {rname}")

    print("\n" + "=" * 70 + "\n")


if __name__ == '__main__':
    seed()
