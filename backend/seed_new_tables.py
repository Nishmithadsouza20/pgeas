"""
Seed all new feature tables for company_27 (demo owner).
Run: python seed_new_tables.py
"""
import random, sys
from datetime import date, timedelta, datetime
from database import get_company_db

db = get_company_db(27)
today = date.today()

def d(offset=0):
    return (today - timedelta(days=offset)).isoformat()

def rand_time(h_min=8, h_max=22):
    h = random.randint(h_min, h_max)
    m = random.choice([0, 15, 30, 45])
    return f"{h:02d}:{m:02d}"

# ── Get existing resident and staff IDs ───────────────────────────────────────
residents = db.execute("SELECT id, name, room_id FROM residents WHERE status='active' LIMIT 30").fetchall()
rooms     = db.execute("SELECT id, room_number FROM rooms").fetchall()
staff     = db.execute("SELECT id, name, role, salary FROM staff WHERE status='active'").fetchall()
res_ids   = [r['id'] for r in residents]
room_map  = {r['id']: r['room_number'] for r in rooms}
staff_ids = [s['id'] for s in staff]

print(f"Found {len(res_ids)} residents, {len(staff_ids)} staff, {len(rooms)} rooms")

# ── 1. STAFF ATTENDANCE (last 35 days) ────────────────────────────────────────
print("Seeding staff attendance...")
statuses = ['present','present','present','present','absent','late','half_day','holiday']
for s in staff:
    for days_ago in range(35):
        att_date = d(days_ago)
        status   = random.choice(statuses)
        check_in  = rand_time(8,10)  if status in ('present','late') else ''
        check_out = rand_time(17,20) if status in ('present','late') else ''
        if status == 'half_day': check_in = rand_time(9,12); check_out = rand_time(13,15)
        try:
            db.execute(
                'INSERT OR IGNORE INTO staff_attendance (staff_id,date,status,check_in,check_out) VALUES (?,?,?,?,?)',
                [s['id'], att_date, status, check_in, check_out]
            )
        except: pass
db.commit()
print("  + Staff attendance done")

# ── 2. PAYROLL (current month) ─────────────────────────────────────────────────
print("Seeding payroll...")
month = today.strftime('%m')
year  = today.strftime('%Y')
for s in staff:
    salary  = s['salary'] or 15000
    days_in = 26
    present = random.randint(18, 26)
    half    = random.randint(0, 3)
    earned  = round((present + half * 0.5) / days_in * salary, 2)
    advance = random.choice([0, 0, 0, 1000, 2000, 500])
    bonus   = random.choice([0, 0, 500, 1000])
    net     = round(earned - advance + bonus, 2)
    try:
        db.execute(
            '''INSERT OR IGNORE INTO payroll
               (staff_id,month,year,base_salary,working_days,present_days,advances,deductions,bonus,net_salary,status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
            [s['id'], month, year, salary, days_in, present, advance, 0, bonus, net,
             random.choice(['paid','paid','pending'])]
        )
    except: pass
db.commit()
print("  + Payroll done")

# ── 3. MAINTENANCE REQUESTS ────────────────────────────────────────────────────
print("Seeding maintenance requests...")
MAINT = [
    ('Leaking tap in bathroom',    'plumbing',    'high',   'open'),
    ('Fan not working',            'electrical',  'medium', 'assigned'),
    ('Door lock broken',           'carpentry',   'high',   'in_progress'),
    ('Water heater issue',         'plumbing',    'high',   'completed'),
    ('Paint peeling off wall',     'general',     'low',    'open'),
    ('AC not cooling',             'electrical',  'high',   'assigned'),
    ('Window latch broken',        'carpentry',   'medium', 'in_progress'),
    ('Bed frame cracked',          'furniture',   'medium', 'open'),
    ('Toilet flush not working',   'plumbing',    'high',   'completed'),
    ('Light fitting loose',        'electrical',  'medium', 'completed'),
    ('Mattress needs replacement', 'furniture',   'low',    'open'),
    ('Mosquito mesh torn',         'general',     'medium', 'assigned'),
    ('Sink drain blocked',         'plumbing',    'high',   'in_progress'),
    ('Ceiling fan wobbling',       'electrical',  'medium', 'open'),
    ('Door hinge squeaking',       'carpentry',   'low',    'completed'),
]
staff_names = [s['name'] for s in staff] if staff else ['Maintenance Team']
for i, (title, cat, pri, status) in enumerate(MAINT):
    r = random.choice(residents) if residents else None
    rid = r['id'] if r else None
    rname = r['name'] if r else 'Resident'
    room_id = r['room_id'] if r else None
    rnum = room_map.get(room_id, '101') if room_id else '101'
    assigned = random.choice(staff_names) if status in ('assigned','in_progress','completed') else ''
    resolved = d(random.randint(1,10)) if status == 'completed' else None
    cost = random.randint(200, 3000) if status == 'completed' else 0
    db.execute(
        '''INSERT INTO maintenance_requests
           (title,description,category,priority,status,assigned_to_name,
            reported_by_resident_id,reported_by_name,room_id,actual_cost,created_at,resolved_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
        [title, f"{title} reported from Room {rnum}", cat, pri, status,
         assigned, rid, rname, room_id, cost,
         d(random.randint(0,20)), resolved]
    )
db.commit()
print("  + Maintenance done")

# ── 4. GATE PASSES ─────────────────────────────────────────────────────────────
print("Seeding gate passes...")
PURPOSES = ['Weekend home visit','Family function','Medical appointment','College trip',
            'Festival vacation','Interview','Training program','Personal work']
DESTINATIONS = ['Bangalore','Chennai','Hyderabad','Mumbai','Home town','Local','Mysore']
statuses_gp = ['approved','approved','approved','pending','pending','returned','returned','rejected']
for i in range(25):
    r = random.choice(residents) if residents else None
    if not r: continue
    days_ago = random.randint(0, 40)
    from_d   = d(days_ago)
    to_d     = (today - timedelta(days=days_ago) + timedelta(days=random.randint(1,5))).isoformat()
    status   = random.choice(statuses_gp)
    db.execute(
        '''INSERT INTO gate_passes
           (resident_id,resident_name,purpose,destination,from_date,to_date,status,approved_by,created_at)
           VALUES (?,?,?,?,?,?,?,?,?)''',
        [r['id'], r['name'], random.choice(PURPOSES), random.choice(DESTINATIONS),
         from_d, to_d, status,
         'Management' if status in ('approved','returned') else '',
         d(days_ago + 1)]
    )
db.commit()
print("  + Gate passes done")

# ── 5. UTILITY BILLS (last 3 months) ──────────────────────────────────────────
print("Seeding utility bills...")
occupied_rooms = db.execute(
    '''SELECT r.id as room_id, r.room_number, res.id as resident_id, res.name as resident_name
       FROM rooms r JOIN residents res ON res.room_id = r.id AND res.status='active' '''
).fetchall()
for mo_offset in range(3):
    mo_date = today.replace(day=1) - timedelta(days=mo_offset * 30)
    m = mo_date.strftime('%m')
    y = mo_date.strftime('%Y')
    for row in occupied_rooms:
        units = random.randint(40, 180)
        elec  = round(units * 8, 2)
        water = random.choice([150, 200, 250, 0])
        other = random.choice([0, 0, 100, 200])
        total = elec + water + other
        status_u = 'paid' if mo_offset > 0 else random.choice(['paid','pending','pending'])
        try:
            db.execute(
                '''INSERT OR IGNORE INTO utility_bills
                   (room_id,resident_id,resident_name,room_number,month,year,
                    electricity_units,electricity_amount,water_amount,other_amount,total_amount,status)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
                [row['room_id'], row['resident_id'], row['resident_name'], row['room_number'],
                 m, y, units, elec, water, other, total, status_u]
            )
        except: pass
db.commit()
print("  + Utility bills done")

# ── 6. SECURITY DEPOSITS ───────────────────────────────────────────────────────
print("Seeding security deposits...")
for r in residents[:40]:
    months_ago = random.randint(1, 24)
    paid_date  = (today - timedelta(days=months_ago * 30)).isoformat()
    amount     = random.choice([5000, 8000, 10000, 12000, 15000])
    status_d   = random.choices(['held','held','held','refunded'], weights=[7,7,7,3])[0]
    refund_amt = round(amount * random.uniform(0.7, 1.0), 2) if status_d == 'refunded' else 0
    refund_date = (today - timedelta(days=random.randint(1,60))).isoformat() if status_d == 'refunded' else ''
    room_id    = r['room_id']
    rnum       = room_map.get(room_id, '') if room_id else ''
    db.execute(
        '''INSERT INTO security_deposits
           (resident_id,resident_name,amount,paid_date,status,refund_amount,refund_date,notes)
           VALUES (?,?,?,?,?,?,?,?)''',
        [r['id'], r['name'], amount, paid_date, status_d,
         refund_amt if refund_amt else None,
         refund_date if refund_date else None,
         random.choice(['Cash payment','Cheque no. 12345','NEFT transfer','UPI payment',''])]
    )
db.commit()
print("  + Security deposits done")

# ── 7. ENQUIRIES ───────────────────────────────────────────────────────────────
print("Seeding enquiries...")
ENQUIRY_DATA = [
    ("Kiran Patel",     "9811100001", "single sharing",  8000,  "walk-in",    "new",       "Wants AC room"),
    ("Deepa Menon",     "9811100002", "double sharing",  6000,  "phone",      "follow-up", "Called twice, interested"),
    ("Rahul Singh",     "9811100003", "single AC",       12000, "website",    "interested","Ready to move in next month"),
    ("Ananya Roy",      "9811100004", "triple sharing",  4500,  "referral",   "converted", "Booked Room 204"),
    ("Sanjay Kumar",    "9811100005", "single",          9000,  "social-media","new",       ""),
    ("Priya Nair",      "9811100006", "double AC",       10000, "walk-in",    "interested","Wants attached bathroom"),
    ("Amit Verma",      "9811100007", "single sharing",  7000,  "phone",      "lost",      "Found cheaper option"),
    ("Lakshmi Rao",     "9811100008", "single AC",       11000, "referral",   "follow-up", "Callback scheduled"),
    ("Rohan Desai",     "9811100009", "double sharing",  5500,  "website",    "new",       ""),
    ("Sneha Pillai",    "9811100010", "single",          8500,  "walk-in",    "interested","Wants 6-month lease"),
    ("Vikram Bose",     "9811100011", "triple sharing",  4000,  "social-media","new",       ""),
    ("Meena Sharma",    "9811100012", "single AC",       13000, "phone",      "converted", "Moved in last week"),
    ("Arun Krishnan",   "9811100013", "double sharing",  5000,  "walk-in",    "follow-up", "Budget constraint"),
    ("Divya Iyer",      "9811100014", "single",          9500,  "referral",   "interested","Asked for discount"),
    ("Suresh Reddy",    "9811100015", "single AC",       10500, "website",    "lost",      "Went to competitor"),
    ("Kavitha Shetty",  "9811100016", "double",          6500,  "walk-in",    "new",       ""),
    ("Ravi Teja",       "9811100017", "single sharing",  7500,  "phone",      "follow-up", "Wants parking facility"),
    ("Pooja Gupta",     "9811100018", "single AC",       12500, "social-media","interested","Negotiating rent"),
    ("Mohan Das",       "9811100019", "triple sharing",  4200,  "referral",   "new",       ""),
    ("Swati Joshi",     "9811100020", "single",          8800,  "walk-in",    "converted", "Joining next Monday"),
]
for i, (name, phone, pref, budget, source, status, notes) in enumerate(ENQUIRY_DATA):
    days_ago  = random.randint(0, 30)
    fu_date   = (today + timedelta(days=random.randint(1,7))).isoformat() if status == 'follow-up' else ''
    db.execute(
        '''INSERT INTO enquiries (name,phone,room_type_preference,budget,source,status,notes,follow_up_date,created_at)
           VALUES (?,?,?,?,?,?,?,?,?)''',
        [name, phone, pref, budget, source, status, notes, fu_date, d(days_ago)]
    )
db.commit()
print("  + Enquiries done")

# ── 8. MEAL ATTENDANCE (last 15 days) ─────────────────────────────────────────
print("Seeding meal attendance...")
for days_ago in range(15):
    att_date = d(days_ago)
    for r in residents[:30]:
        b = 1 if random.random() > 0.15 else 0
        l = 1 if random.random() > 0.10 else 0
        di = 1 if random.random() > 0.20 else 0
        try:
            db.execute(
                '''INSERT OR IGNORE INTO meal_attendance
                   (resident_id,resident_name,room_number,date,breakfast,lunch,dinner)
                   VALUES (?,?,?,?,?,?,?)''',
                [r['id'], r['name'],
                 room_map.get(r['room_id'],'') if r['room_id'] else '',
                 att_date, b, l, di]
            )
        except: pass
db.commit()
print("  + Meal attendance done")

db.close()
print("\nAll new tables seeded successfully!")
