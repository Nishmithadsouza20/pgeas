"""
PGease Seed Data Script
Run: python seed_data.py
Populates the database with 55+ residents, rooms, payments, complaints, notices, mess menu, visitors.
"""

import sqlite3
import bcrypt
import random
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
DATABASE = os.getenv('DATABASE_URL', 'pgease.db')

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def hash_pw(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

SUPER_ADMIN_EMAIL = os.getenv('SUPER_ADMIN_EMAIL', 'admin@pgease.com')
OWNER_EMAIL       = os.getenv('OWNER_EMAIL', 'owner@pgease.com')

STUDENTS = [
    ("Arjun Sharma",       "arjun.sharma@gmail.com",   "9876543210", "customer"),
    ("Priya Patel",        "priya.patel@gmail.com",    "9876543211", "customer"),
    ("Rahul Kumar",        "rahul.kumar@gmail.com",    "9876543212", "customer"),
    ("Ananya Singh",       "ananya.singh@gmail.com",   "9876543213", "customer"),
    ("Vikram Reddy",       "vikram.reddy@gmail.com",   "9876543214", "customer"),
    ("Kavya Nair",         "kavya.nair@gmail.com",     "9876543215", "customer"),
    ("Rohit Gupta",        "rohit.gupta@gmail.com",    "9876543216", "customer"),
    ("Sneha Iyer",         "sneha.iyer@gmail.com",     "9876543217", "customer"),
    ("Aditya Verma",       "aditya.verma@gmail.com",   "9876543218", "customer"),
    ("Pooja Mehta",        "pooja.mehta@gmail.com",    "9876543219", "customer"),
    ("Siddharth Rao",      "sidd.rao@gmail.com",       "9876543220", "customer"),
    ("Divya Krishnan",     "divya.krish@gmail.com",    "9876543221", "customer"),
    ("Karan Joshi",        "karan.joshi@gmail.com",    "9876543222", "customer"),
    ("Nisha Aggarwal",     "nisha.aggarwal@gmail.com", "9876543223", "customer"),
    ("Manish Tiwari",      "manish.tiwari@gmail.com",  "9876543224", "customer"),
    ("Ritu Bansode",       "ritu.bansode@gmail.com",   "9876543225", "customer"),
    ("Deepak Malhotra",    "deepak.malhotra@gmail.com","9876543226", "customer"),
    ("Sona Thomas",        "sona.thomas@gmail.com",    "9876543227", "customer"),
    ("Amit Saxena",        "amit.saxena@gmail.com",    "9876543228", "customer"),
    ("Lakshmi Venkat",     "lakshmi.venkat@gmail.com", "9876543229", "customer"),
    ("Nikhil Choudhary",   "nikhil.ch@gmail.com",      "9876543230", "customer"),
    ("Pallavi Shetty",     "pallavi.shetty@gmail.com", "9876543231", "customer"),
    ("Gaurav Pandey",      "gaurav.pandey@gmail.com",  "9876543232", "customer"),
    ("Swati Mishra",       "swati.mishra@gmail.com",   "9876543233", "customer"),
    ("Akash Tripathi",     "akash.trip@gmail.com",     "9876543234", "customer"),
    ("Meera Pillai",       "meera.pillai@gmail.com",   "9876543235", "customer"),
    ("Yash Agarwal",       "yash.agarwal@gmail.com",   "9876543236", "customer"),
    ("Komal Dubey",        "komal.dubey@gmail.com",    "9876543237", "customer"),
    ("Tushar Bhatt",       "tushar.bhatt@gmail.com",   "9876543238", "customer"),
    ("Riya Desai",         "riya.desai@gmail.com",     "9876543239", "customer"),
]

PROFESSIONALS = [
    ("Suresh Kulkarni",    "suresh.kulkarni@gmail.com","9876543240", "customer"),
    ("Geeta Rao",          "geeta.rao@gmail.com",      "9876543241", "customer"),
    ("Ramesh Patel",       "ramesh.patel@gmail.com",   "9876543242", "customer"),
    ("Usha Nair",          "usha.nair@gmail.com",      "9876543243", "customer"),
    ("Vishal Kapoor",      "vishal.kapoor@gmail.com",  "9876543244", "customer"),
    ("Smita Joshi",        "smita.joshi@gmail.com",    "9876543245", "customer"),
    ("Ajay Singh",         "ajay.singh@gmail.com",     "9876543246", "customer"),
    ("Rekha Gupta",        "rekha.gupta@gmail.com",    "9876543247", "customer"),
    ("Mahesh Kumar",       "mahesh.kumar@gmail.com",   "9876543248", "customer"),
    ("Sunita Sharma",      "sunita.sharma@gmail.com",  "9876543249", "customer"),
    ("Rajesh Verma",       "rajesh.verma@gmail.com",   "9876543250", "customer"),
    ("Alka Mehta",         "alka.mehta@gmail.com",     "9876543251", "customer"),
    ("Dinesh Reddy",       "dinesh.reddy@gmail.com",   "9876543252", "customer"),
    ("Hema Krishnan",      "hema.krish@gmail.com",     "9876543253", "customer"),
    ("Santosh Iyer",       "santosh.iyer@gmail.com",   "9876543254", "customer"),
    ("Kavitha Subramanian","kavitha.sub@gmail.com",    "9876543255", "customer"),
    ("Prakash Yadav",      "prakash.yadav@gmail.com",  "9876543256", "customer"),
    ("Anita Chatterjee",   "anita.chat@gmail.com",     "9876543257", "customer"),
    ("Vijay Bose",         "vijay.bose@gmail.com",     "9876543258", "customer"),
    ("Padma Murthy",       "padma.murthy@gmail.com",   "9876543259", "customer"),
    ("Sachin Chavan",      "sachin.chavan@gmail.com",  "9876543260", "customer"),
    ("Lalita Naik",        "lalita.naik@gmail.com",    "9876543261", "customer"),
    ("Ashok Patil",        "ashok.patil@gmail.com",    "9876543262", "customer"),
    ("Seema Jadhav",       "seema.jadhav@gmail.com",   "9876543263", "customer"),
    ("Manoj Kamath",       "manoj.kamath@gmail.com",   "9876543264", "customer"),
]

ROOMS = []
for floor in range(1, 4):
    for num in range(1, 11):
        rnum = f"{floor}0{num}" if num < 10 else f"{floor}{num}"
        rtype = random.choice(['single','single','double','double','triple'])
        rent = {'single': 7500, 'double': 6000, 'triple': 5000}[rtype]
        amenities = random.choice([
            'AC, WiFi, Attached Bathroom',
            'WiFi, Attached Bathroom',
            'Fan, Common Bathroom',
            'AC, Fan, WiFi',
            'WiFi, Fan, Cupboard'
        ])
        ROOMS.append((rnum, floor, rtype, rent, amenities))

COMPLAINT_DATA = [
    ("electrical", "Light not working in room 101", "high"),
    ("plumbing",   "Tap leaking in bathroom",        "medium"),
    ("cleanliness","Common area not cleaned",        "low"),
    ("wifi",       "WiFi very slow in 3rd floor",    "high"),
    ("electrical", "Power cut every evening",        "high"),
    ("plumbing",   "Water pressure low",             "medium"),
    ("cleanliness","Garbage not picked up",          "medium"),
    ("other",      "Noisy neighbours at night",      "low"),
    ("wifi",       "No signal in room 205",          "high"),
    ("plumbing",   "Drain blocked in bathroom",      "high"),
    ("electrical", "Fan not working",                "medium"),
    ("cleanliness","Common bathroom dirty",          "high"),
    ("other",      "Main gate locked early",         "medium"),
    ("plumbing",   "Hot water not available",        "medium"),
    ("electrical", "Switchboard sparks",             "high"),
    ("wifi",       "Router needs restart daily",     "low"),
    ("cleanliness","Pest issue in kitchen area",     "high"),
    ("other",      "Request for extra mattress",     "low"),
    ("electrical", "Bulb fused in corridor",         "low"),
    ("plumbing",   "Overhead tank overflow",         "medium"),
    ("other",      "Need extra shelf in room",       "low"),
    ("wifi",       "Password not working",           "medium"),
    ("cleanliness","Bad smell from drain",           "high"),
    ("electrical", "Inverter battery dead",          "high"),
    ("plumbing",   "Toilet flush broken",            "high"),
]

NOTICE_DATA = [
    ("Rent Due Reminder", "Please pay your rent before the 5th of every month to avoid late fees.", "payment", 1),
    ("Water Supply Disruption", "Water supply will be off on Sunday 10am–2pm for tank cleaning.", "maintenance", 1),
    ("New WiFi Password", "The new WiFi password is PGease2024. Please update your devices.", "general", 0),
    ("Festival Holiday", "PG office will be closed on Diwali. Residents please note.", "general", 0),
    ("Fire Safety Drill", "Fire safety drill on Saturday at 10am. All residents must participate.", "important", 1),
    ("Gate Closing Time", "Main gate will be closed at 11pm daily. Please carry your access card.", "rules", 1),
    ("New Mess Menu", "New mess menu effective from 1st of next month. Check the mess section.", "general", 0),
    ("Generator Maintenance", "Generator will be serviced on Wednesday. Brief power cuts expected.", "maintenance", 0),
    ("Guest Policy Update", "Overnight guests allowed only with prior permission from management.", "rules", 1),
    ("CCTV Installation", "New CCTV cameras installed for enhanced security. 24x7 monitoring active.", "security", 1),
    ("Monthly Meeting", "Monthly residents meeting on the last Saturday at 6pm in common room.", "general", 0),
    ("Laundry Service", "New laundry service available. Contact reception for pricing.", "general", 0),
]

MESS_MENU = [
    # Week 1
    ("Monday",    "Breakfast", "Idli, Sambar, Coconut Chutney, Tea/Coffee",         "7:30 AM - 9:00 AM", "", 1),
    ("Monday",    "Lunch",     "Rice, Dal Tadka, Aloo Sabzi, Roti, Salad",          "12:30 PM - 2:00 PM","", 1),
    ("Monday",    "Dinner",    "Chapati, Paneer Butter Masala, Dal, Rice, Salad",   "7:30 PM - 9:00 PM", "", 1),
    ("Tuesday",   "Breakfast", "Poha, Boiled Egg/Banana, Tea/Coffee",               "7:30 AM - 9:00 AM", "", 1),
    ("Tuesday",   "Lunch",     "Rice, Rajma, Jeera Aloo, Roti, Salad",             "12:30 PM - 2:00 PM","", 1),
    ("Tuesday",   "Dinner",    "Chapati, Chicken Curry/Mix Veg, Dal, Rice",         "7:30 PM - 9:00 PM", "", 1),
    ("Wednesday", "Breakfast", "Upma, Chutney, Boiled Egg/Fruit, Tea",             "7:30 AM - 9:00 AM", "", 1),
    ("Wednesday", "Lunch",     "Rice, Sambar, Bhindi Fry, Roti, Papad",            "12:30 PM - 2:00 PM","", 1),
    ("Wednesday", "Dinner",    "Chapati, Egg Bhurji/Paneer Sabzi, Dal, Rice",      "7:30 PM - 9:00 PM", "", 1),
    ("Thursday",  "Breakfast", "Dosa, Sambar, Chutney, Tea/Coffee",                "7:30 AM - 9:00 AM", "", 1),
    ("Thursday",  "Lunch",     "Rice, Chole, Capsicum Sabzi, Roti, Salad",         "12:30 PM - 2:00 PM","", 1),
    ("Thursday",  "Dinner",    "Chapati, Fish Curry/Dal Makhani, Rice, Salad",     "7:30 PM - 9:00 PM", "", 1),
    ("Friday",    "Breakfast", "Bread Toast, Butter/Jam, Egg/Banana, Tea",         "7:30 AM - 9:00 AM", "", 1),
    ("Friday",    "Lunch",     "Veg Biryani/Chicken Biryani, Raita, Salad",        "12:30 PM - 2:00 PM","Special Friday Biryani", 1),
    ("Friday",    "Dinner",    "Chapati, Mutton Curry/Veg Kofta, Dal, Rice",       "7:30 PM - 9:00 PM", "", 1),
    ("Saturday",  "Breakfast", "Chole Bhature/Puri Bhaji, Tea/Coffee",             "8:00 AM - 10:00 AM","", 1),
    ("Saturday",  "Lunch",     "Rice, Dal Fry, Gobi Sabzi, Roti, Pickle",          "12:30 PM - 2:00 PM","", 1),
    ("Saturday",  "Dinner",    "Chapati, Egg Curry/Paneer Tikka, Rice, Salad",     "7:30 PM - 9:00 PM", "", 1),
    ("Sunday",    "Breakfast", "Pongal, Vada, Sambar, Tea/Coffee",                 "8:30 AM - 10:30 AM","", 1),
    ("Sunday",    "Lunch",     "Special Thali — Rice, Dal, 2 Sabzi, Roti, Sweet",  "1:00 PM - 2:30 PM", "Special Sunday Lunch!", 1),
    ("Sunday",    "Dinner",    "Chapati, Chicken Roast/Veg Pulao, Dal, Salad",     "7:30 PM - 9:00 PM", "", 1),
    # Week 2
    ("Monday",    "Breakfast", "Medu Vada, Sambar, Chutney, Tea",                  "7:30 AM - 9:00 AM", "", 2),
    ("Monday",    "Lunch",     "Rice, Moong Dal, Palak Sabzi, Roti, Salad",        "12:30 PM - 2:00 PM","", 2),
    ("Monday",    "Dinner",    "Chapati, Egg Masala/Dal Tadka, Rice, Salad",       "7:30 PM - 9:00 PM", "", 2),
    ("Tuesday",   "Breakfast", "Rava Idli, Sambar, Coconut Chutney, Tea",          "7:30 AM - 9:00 AM", "", 2),
    ("Tuesday",   "Lunch",     "Rice, Arhar Dal, Aloo Gobi, Roti, Salad",          "12:30 PM - 2:00 PM","", 2),
    ("Tuesday",   "Dinner",    "Chapati, Chicken Masala/Rajma, Rice, Salad",       "7:30 PM - 9:00 PM", "", 2),
    ("Wednesday", "Breakfast", "Poori, Aloo Sabzi, Banana, Tea",                   "7:30 AM - 9:00 AM", "", 2),
    ("Wednesday", "Lunch",     "Rice, Dal, Lauki Sabzi, Roti, Papad",              "12:30 PM - 2:00 PM","", 2),
    ("Wednesday", "Dinner",    "Chapati, Paneer Sabzi/Fish Fry, Dal, Rice",        "7:30 PM - 9:00 PM", "", 2),
]

STAFF_DATA = [
    ("Ramaiah K",        "warden",        "9900000001", "ramaiah.k@pgease.com",      18000, "2022-06-01", "both"),
    ("Gowri Devi",       "cook",          "9900000002", "gowri.d@pgease.com",         12000, "2023-01-15", "day"),
    ("Shankar Rao",      "cook",          "9900000003", "shankar.r@pgease.com",        11000, "2023-03-01", "day"),
    ("Ramu Nayak",       "security",      "9900000004", "ramu.n@pgease.com",           10000, "2022-09-10", "night"),
    ("Lakshman Singh",   "security",      "9900000005", "lakshman.s@pgease.com",        9500, "2023-07-20", "day"),
    ("Meenakshi R",      "receptionist",  "9900000006", "meenakshi.r@pgease.com",      14000, "2023-02-01", "day"),
    ("Venkat Swamy",     "maintenance",   "9900000007", "venkat.s@pgease.com",         13000, "2022-11-05", "day"),
    ("Savita Bai",       "cleaner",       "9900000008", "savita.b@pgease.com",          8000, "2023-05-12", "day"),
    ("Murugan P",        "cleaner",       "9900000009", "murugan.p@pgease.com",         8000, "2024-01-08", "day"),
]

FOOD_INVENTORY_DATA = [
    # (item_name, category, unit, qty_stock, min_qty, unit_price, supplier)
    ("Basmati Rice",        "grocery",    "kg",     80,  20, 65,   "Sri Ram Traders"),
    ("Toor Dal",            "grocery",    "kg",     25,   5, 110,  "Sri Ram Traders"),
    ("Chana Dal",           "grocery",    "kg",     12,   3, 95,   "Sri Ram Traders"),
    ("Moong Dal",           "grocery",    "kg",     10,   3, 120,  "Sri Ram Traders"),
    ("Wheat Flour (Atta)",  "grocery",    "kg",     40,  10, 45,   "Shakthi Mills"),
    ("Semolina (Rava)",     "grocery",    "kg",      8,   2, 40,   "Shakthi Mills"),
    ("Poha",                "grocery",    "kg",      6,   2, 50,   "Sri Ram Traders"),
    ("Sunflower Oil",       "oil_spices", "litre",  12,   3, 135,  "Fortune Distributor"),
    ("Mustard Oil",         "oil_spices", "litre",   4,   1, 160,  "Fortune Distributor"),
    ("Salt",                "oil_spices", "kg",      5,   1,  20,  "Local Market"),
    ("Turmeric Powder",     "oil_spices", "kg",      1, 0.2, 280,  "Local Market"),
    ("Red Chilli Powder",   "oil_spices", "kg",    1.5, 0.3, 300,  "Local Market"),
    ("Cumin Seeds",         "oil_spices", "kg",    0.8, 0.2, 450,  "Local Market"),
    ("Mustard Seeds",       "oil_spices", "kg",    0.5, 0.1, 200,  "Local Market"),
    ("Garam Masala",        "oil_spices", "kg",    0.3, 0.1, 600,  "Local Market"),
    ("Milk",                "dairy",      "litre",  10,   5,  65,  "Nandini Dairy"),
    ("Curd",                "dairy",      "kg",      4,   2,  55,  "Nandini Dairy"),
    ("Butter",              "dairy",      "kg",      2, 0.5, 550,  "Nandini Dairy"),
    ("Tomatoes",            "vegetables", "kg",      8,   2,  35,  "APMC Market"),
    ("Onions",              "vegetables", "kg",     15,   4,  30,  "APMC Market"),
    ("Potatoes",            "vegetables", "kg",     10,   3,  25,  "APMC Market"),
    ("Green Chillies",      "vegetables", "kg",      1, 0.2,  80,  "APMC Market"),
    ("Ginger-Garlic Paste", "vegetables", "kg",      2, 0.5, 120,  "APMC Market"),
    ("Tea Powder",          "beverages",  "kg",      3,   1, 480,  "Tata Tea Distributor"),
    ("Coffee Powder",       "beverages",  "kg",      2, 0.5, 550,  "Bru Distributor"),
    ("Sugar",               "grocery",    "kg",     12,   3,  48,  "Sri Ram Traders"),
]

PG_COMPANIES = [
    ("Sunrise PG Homes",     "Ravi Shankar",    "ravi@sunrisepg.com",     "Bangalore",   "12 MG Road, Bangalore",          "9811000001", "enterprise", "active",  45, 7999),
    ("Green Valley PG",      "Meera Nair",      "meera@greenvalleypg.com","Hyderabad",   "88 Jubilee Hills, Hyderabad",    "9811000002", "premium",    "active",  30, 4999),
    ("Metro Stay PG",        "Suresh Pillai",   "suresh@metrostay.com",   "Chennai",     "34 Anna Nagar, Chennai",         "9811000003", "premium",    "active",  38, 4999),
    ("City Comfort PG",      "Anjali Desai",    "anjali@citycomfort.com", "Pune",        "7 Koregaon Park, Pune",          "9811000004", "basic",      "trial",   20, 2999),
    ("Royal Residency",      "Mohammed Farhan", "farhan@royalres.com",    "Mumbai",      "55 Andheri West, Mumbai",        "9811000005", "enterprise", "active",  60, 7999),
    ("Campus Nest PG",       "Divya Krishnan",  "divya@campusnest.com",   "Manipal",     "3 University Road, Manipal",     "9811000006", "basic",      "active",  25, 2999),
    ("Silicon Valley PG",    "Karan Mehta",     "karan@siliconpg.com",    "Bangalore",   "101 Whitefield, Bangalore",      "9811000007", "premium",    "active",  35, 4999),
    ("Comfort Zone PG",      "Sneha Iyer",      "sneha@comfortzone.com",  "Coimbatore",  "22 RS Puram, Coimbatore",        "9811000008", "basic",      "inactive",18, 2999),
]

VISITOR_DATA = [
    ("Ramesh Sharma",  "Family visit"),
    ("Preethi Nair",   "Friend"),
    ("Vinod Kumar",    "Parcel delivery"),
    ("Sundar Rao",     "Parent visit"),
    ("Malathi Iyer",   "Sister visit"),
    ("Kiran Patel",    "Friend"),
    ("Rakesh Verma",   "Family visit"),
    ("Divya Mishra",   "Colleague"),
    ("Sanjay Gupta",   "Friend"),
    ("Anita Pillai",   "Parent visit"),
    ("Mohan Reddy",    "Brother visit"),
    ("Savita Joshi",   "Family visit"),
    ("Deepa Sharma",   "Friend"),
    ("Suresh Nair",    "Parcel delivery"),
    ("Radha Krishnan", "Parent visit"),
]

def seed():
    from database import init_db
    init_db()
    db = get_db()

    print("[Seed] Clearing existing data...")
    for tbl in ['payment_transactions','visitors','otp_tokens','notice_reads','notices','mess_menu',
                'complaints','payments','residents','rooms','users',
                'staff','expenses','food_inventory','pg_companies']:
        db.execute(f'DELETE FROM {tbl}')
    db.commit()

    print("[Seed] Creating admin and owner accounts...")
    db.execute(
        'INSERT INTO users (name,email,password_hash,phone,role,is_verified) VALUES (?,?,?,?,?,?)',
        ["Super Admin", SUPER_ADMIN_EMAIL, hash_pw("Admin@123"), "9800000001", "super_admin", 1]
    )
    db.execute(
        'INSERT INTO users (name,email,password_hash,phone,role,is_verified) VALUES (?,?,?,?,?,?)',
        ["PG Owner", OWNER_EMAIL, hash_pw("Owner@123"), "9800000002", "owner", 1]
    )
    db.commit()

    print("[Seed] Creating 30 rooms across 3 floors...")
    room_ids = []
    for (rnum, floor, rtype, rent, amenities) in ROOMS:
        cur = db.execute(
            'INSERT INTO rooms (room_number,floor,type,rent_amount,amenities,status) VALUES (?,?,?,?,?,?)',
            [rnum, floor, rtype, rent, amenities, 'vacant']
        )
        room_ids.append(cur.lastrowid)
    db.commit()

    print("[Seed] Creating 55 resident users...")
    all_people  = STUDENTS + PROFESSIONALS
    resident_ids = []
    used_rooms   = set()

    for i, (name, email, phone, occ) in enumerate(all_people):
        pw_hash = hash_pw("Resident@123")
        db.execute(
            'INSERT INTO users (name,email,password_hash,phone,role,is_verified) VALUES (?,?,?,?,?,?)',
            [name, email, pw_hash, phone, 'customer', 1]
        )
        uid = db.execute('SELECT last_insert_rowid()').fetchone()[0]

        # Assign a room (try to share doubles/triples)
        room_id = None
        for rid in room_ids:
            if rid in used_rooms:
                continue
            room = db.execute('SELECT type FROM rooms WHERE id=?', [rid]).fetchone()
            cnt  = db.execute(
                'SELECT COUNT(*) as c FROM residents WHERE room_id=? AND status="active"', [rid]
            ).fetchone()['c']
            cap = {'single':1,'double':2,'triple':3}.get(room['type'],1)
            if cnt < cap:
                room_id = rid
                if cnt + 1 >= cap:
                    used_rooms.add(rid)
                break

        move_in = (datetime.utcnow() - timedelta(days=random.randint(30,365))).strftime('%Y-%m-%d')
        proofs  = ['Aadhar','Passport','Driving License','Voter ID']
        ecname  = random.choice(["Father","Mother","Brother","Sister","Spouse"])
        cur     = db.execute(
            '''INSERT INTO residents (user_id,room_id,id_proof_type,emergency_contact,
               move_in_date,occupation,status,name,email,phone)
               VALUES (?,?,?,?,?,?,?,?,?,?)''',
            [uid, room_id, random.choice(proofs),
             f"{ecname}: +91{random.randint(9000000000,9999999999)}",
             move_in, occ, 'active', name, email, phone]
        )
        rid2 = cur.lastrowid
        resident_ids.append(rid2)

        if room_id:
            db.execute('UPDATE rooms SET status="occupied" WHERE id=?', [room_id])

    db.commit()
    print(f"[Seed] Created {len(resident_ids)} residents.")

    print("[Seed] Generating 3 months of payment history...")
    now = datetime.utcnow()
    statuses_dist = ['paid','paid','paid','pending','overdue']
    for res_id in resident_ids:
        room = db.execute(
            'SELECT rm.rent_amount FROM residents r JOIN rooms rm ON r.room_id=rm.id WHERE r.id=?',
            [res_id]
        ).fetchone()
        rent = room['rent_amount'] if room else 6000
        for offset in range(2, -1, -1):
            dt       = now - timedelta(days=30*offset)
            month    = dt.month
            year     = dt.year
            st       = random.choice(statuses_dist)
            penalty  = 500 if st == 'overdue' else 0
            paid_dt  = (dt + timedelta(days=random.randint(1,5))).strftime('%Y-%m-%d') if st == 'paid' else None
            db.execute(
                'INSERT INTO payments (resident_id,month,year,amount,status,paid_date,penalty) VALUES (?,?,?,?,?,?,?)',
                [res_id, month, year, rent, st, paid_dt, penalty]
            )
    db.commit()
    print("[Seed] Payment history created.")

    print("[Seed] Creating 25 complaints...")
    statuses = ['open','in-progress','resolved','open','resolved']
    for i, (cat, desc, prio) in enumerate(COMPLAINT_DATA):
        res_id = resident_ids[i % len(resident_ids)]
        st     = random.choice(statuses)
        days   = random.randint(1, 60)
        created= (now - timedelta(days=days)).strftime('%Y-%m-%d %H:%M:%S')
        resp   = "We are looking into this issue." if st == 'in-progress' else (
                 "Issue resolved. Please confirm." if st == 'resolved' else None)
        res_at = (now - timedelta(days=random.randint(0, days))).strftime('%Y-%m-%d %H:%M:%S') if st == 'resolved' else None
        db.execute(
            '''INSERT INTO complaints (resident_id,category,description,priority,status,response,created_at,resolved_at)
               VALUES (?,?,?,?,?,?,?,?)''',
            [res_id, cat, desc, prio, st, resp, created, res_at]
        )
    db.commit()
    print("[Seed] Complaints created.")

    print("[Seed] Creating notices...")
    owner_id = db.execute('SELECT id FROM users WHERE role="owner" LIMIT 1').fetchone()['id']
    for (title, content, cat, important) in NOTICE_DATA:
        days_ago = random.randint(0, 30)
        created  = (now - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
        db.execute(
            'INSERT INTO notices (title,content,category,posted_by,created_at,is_active,is_important) VALUES (?,?,?,?,?,?,?)',
            [title, content, cat, owner_id, created, 1, important]
        )
    db.commit()
    print("[Seed] Notices created.")

    print("[Seed] Creating mess menu (2 weeks)...")
    for row in MESS_MENU:
        db.execute(
            'INSERT INTO mess_menu (day_of_week,meal_type,items,timing,special_note,week_number) VALUES (?,?,?,?,?,?)',
            list(row)
        )
    db.commit()
    print("[Seed] Mess menu created.")

    print("[Seed] Creating visitor logs...")
    for i, (vname, purpose) in enumerate(VISITOR_DATA):
        res_id   = resident_ids[i % len(resident_ids)]
        days_ago = random.randint(0, 30)
        in_time  = (now - timedelta(days=days_ago, hours=random.randint(10,18))).strftime('%Y-%m-%d %H:%M:%S')
        out_time = (now - timedelta(days=days_ago, hours=random.randint(0,9))).strftime('%Y-%m-%d %H:%M:%S') if random.random() > 0.2 else None
        db.execute(
            'INSERT INTO visitors (resident_id,visitor_name,purpose,in_time,out_time) VALUES (?,?,?,?,?)',
            [res_id, vname, purpose, in_time, out_time]
        )
    db.commit()
    print("[Seed] Visitor logs created.")

    print("[Seed] Creating PG company clients...")
    for (cname, oname, oemail, city, addr, phone, plan, status, rooms, sub) in PG_COMPANIES:
        days_ago = random.randint(30, 365)
        reg_date = (now - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
        db.execute(
            '''INSERT INTO pg_companies
               (company_name,owner_name,owner_email,city,address,phone,plan,status,total_rooms,subscription_amount,registered_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
            [cname, oname, oemail, city, addr, phone, plan, status, rooms, sub, reg_date]
        )
    # Our demo owner@pgease.com is one of the clients too
    db.execute(
        '''INSERT INTO pg_companies
           (company_name,owner_name,owner_email,city,address,phone,plan,status,total_rooms,subscription_amount,registered_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
        ["PGease Demo PG", "PG Owner", OWNER_EMAIL, "Bangalore", "1 Demo Street, Bangalore",
         "9800000002", "premium", "active", 30,
         4999, (now - timedelta(days=10)).strftime('%Y-%m-%d %H:%M:%S')]
    )
    db.commit()
    print("[Seed] PG company clients created.")

    print("[Seed] Creating staff / employees...")
    for (name, role, phone, email, salary, join_date, shift) in STAFF_DATA:
        db.execute(
            'INSERT INTO staff (name,role,phone,email,salary,join_date,shift,status) VALUES (?,?,?,?,?,?,?,?)',
            [name, role, phone, email, salary, join_date, shift, 'active']
        )
    db.commit()
    print(f"[Seed] {len(STAFF_DATA)} staff members created.")

    print("[Seed] Creating food inventory...")
    for (iname, cat, unit, qty, minq, price, supplier) in FOOD_INVENTORY_DATA:
        last_bought = (now - timedelta(days=random.randint(1, 14))).strftime('%Y-%m-%d')
        db.execute(
            '''INSERT INTO food_inventory
               (item_name,category,unit,quantity_in_stock,min_quantity,unit_price,last_purchased_date,supplier)
               VALUES (?,?,?,?,?,?,?,?)''',
            [iname, cat, unit, qty, minq, price, last_bought, supplier]
        )
    db.commit()
    print(f"[Seed] {len(FOOD_INVENTORY_DATA)} food inventory items created.")

    print("[Seed] Creating 3 months of expense records...")
    EXPENSE_TEMPLATES = [
        # (category, description, amount_range, payment_mode, vendor)
        ("food",        "Monthly groceries — rice, dal, oil, spices",  (18000,24000), "online",  "Sri Ram Traders"),
        ("food",        "Fresh vegetables and dairy purchase",          (6000, 9000),  "cash",    "APMC Market"),
        ("food",        "Cooking gas (LPG) refill x4 cylinders",       (3200, 3600),  "cash",    "Bharat Gas"),
        ("electricity", "BESCOM electricity bill",                      (8000,14000),  "online",  "BESCOM"),
        ("water",       "BWSSB water supply bill",                      (1200, 1800),  "online",  "BWSSB"),
        ("internet",    "ACT Fibernet monthly plan",                    (1499, 2999),  "online",  "ACT Fibernet"),
        ("salary",      "Staff salaries — warden, cook, security",     (75000,95000), "online",  "Internal"),
        ("maintenance", "Plumbing repair — bathroom faucet replacement",(800,  2000),  "cash",    "Raju Plumbing"),
        ("maintenance", "Electrical work — rewiring corridor lights",   (1200, 3000),  "cash",    "Suresh Electricals"),
        ("maintenance", "Cleaning supplies — phenol, floor cleaner",    (600,  1000),  "cash",    "Local Store"),
        ("other",       "Pest control service",                         (2000, 3500),  "cash",    "HiCare Services"),
        ("other",       "Stationery and office supplies",               (300,  700),   "cash",    "Local Store"),
    ]
    for month_offset in range(3, 0, -1):
        dt = now - timedelta(days=30 * month_offset)
        for (cat, desc, (lo, hi), mode, vendor) in EXPENSE_TEMPLATES:
            amount = random.randint(lo, hi)
            expense_date = (dt + timedelta(days=random.randint(1, 25))).strftime('%Y-%m-%d')
            db.execute(
                'INSERT INTO expenses (category,description,amount,expense_date,payment_mode,vendor) VALUES (?,?,?,?,?,?)',
                [cat, desc, amount, expense_date, mode, vendor]
            )
    db.commit()
    print("[Seed] Expense records created.")

    db.close()
    print("\n[Seed] SUCCESS: Database seeded successfully!")
    print(f"\nLogin credentials:")
    print(f"  Super Admin  -> {SUPER_ADMIN_EMAIL}  / Admin@123")
    print(f"  Owner        -> {OWNER_EMAIL}         / Owner@123")
    print(f"  Any resident -> e.g. arjun.sharma@gmail.com / Resident@123")
    print(f"\n  Total residents: {len(resident_ids)}")

if __name__ == '__main__':
    seed()
