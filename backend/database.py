import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

DB_DIR = os.path.dirname(os.path.abspath(__file__))
PLATFORM_DB = os.path.join(DB_DIR, 'pgease.db')


def _configure(conn):
    """Apply settings that prevent 'database is locked' in debug-reload mode."""
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # allow concurrent readers + one writer
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")  # wait up to 10 s before giving up
    return conn


def get_db():
    """Platform DB — users & pg_companies only."""
    return _configure(sqlite3.connect(PLATFORM_DB, timeout=15))


def get_company_db(company_id):
    """Per-owner operational DB: rooms, residents, payments, etc."""
    if not company_id:
        raise ValueError("No company_id — user not assigned to a company")
    path = os.path.join(DB_DIR, f'company_{company_id}.db')
    conn = _configure(sqlite3.connect(path, timeout=15))
    _ensure_company_tables(conn)
    return conn


def get_user_company(uid):
    """Returns (role, company_id) from the platform DB."""
    db = get_db()
    user = db.execute('SELECT role, company_id FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    if not user:
        return None, None
    return user['role'], user['company_id']


def get_all_company_dbs():
    """Open a connection to every company DB that exists on disk (for super-admin aggregation).
    Caller must close each connection returned."""
    platform_db = get_db()
    companies = platform_db.execute('SELECT id FROM pg_companies').fetchall()
    platform_db.close()
    result = []
    for c in companies:
        path = os.path.join(DB_DIR, f'company_{c["id"]}.db')
        if os.path.exists(path):
            result.append((c['id'], _configure(sqlite3.connect(path, timeout=15))))
    return result


def _ensure_company_tables(conn):
    """Idempotent: create all company-level tables if they don't already exist."""
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_number TEXT NOT NULL,
            floor INTEGER NOT NULL,
            type TEXT NOT NULL,
            rent_amount REAL NOT NULL,
            amenities TEXT DEFAULT '',
            photo_url TEXT DEFAULT '',
            status TEXT DEFAULT 'vacant',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS residents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            room_id INTEGER,
            name TEXT NOT NULL DEFAULT '',
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            occupation TEXT DEFAULT '',
            id_proof_type TEXT DEFAULT 'Aadhar',
            id_proof_number TEXT DEFAULT '',
            emergency_contact TEXT DEFAULT '',
            move_in_date TEXT,
            photo_url TEXT DEFAULT '',
            food_preference TEXT DEFAULT 'veg',
            is_away INTEGER DEFAULT 0,
            away_until TEXT DEFAULT '',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resident_id INTEGER NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            paid_date TEXT,
            penalty REAL DEFAULT 0,
            reminder_sent INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_id INTEGER,
            resident_id INTEGER,
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            transaction_ref TEXT DEFAULT '',
            gateway_status TEXT DEFAULT 'success',
            upi_id TEXT DEFAULT '',
            card_last4 TEXT DEFAULT '',
            bank_name TEXT DEFAULT '',
            paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resident_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            response TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            posted_by INTEGER,
            posted_by_name TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            is_important INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS notice_reads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notice_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(notice_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS mess_menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_of_week TEXT NOT NULL,
            meal_type TEXT NOT NULL,
            items TEXT NOT NULL,
            timing TEXT DEFAULT '',
            special_note TEXT DEFAULT '',
            week_number INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resident_id INTEGER NOT NULL,
            visitor_name TEXT NOT NULL,
            purpose TEXT DEFAULT '',
            in_time TEXT NOT NULL,
            out_time TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            salary REAL DEFAULT 0,
            join_date TEXT DEFAULT '',
            shift TEXT DEFAULT 'day',
            status TEXT DEFAULT 'active',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            description TEXT DEFAULT '',
            amount REAL NOT NULL,
            expense_date TEXT NOT NULL,
            payment_mode TEXT DEFAULT 'cash',
            vendor TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS food_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT NOT NULL,
            category TEXT DEFAULT 'grocery',
            unit TEXT DEFAULT 'kg',
            quantity_in_stock REAL DEFAULT 0,
            min_quantity REAL DEFAULT 0,
            unit_price REAL DEFAULT 0,
            last_purchased_date TEXT DEFAULT '',
            supplier TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notifications_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            recipient_name TEXT DEFAULT '',
            recipient_email TEXT DEFAULT '',
            recipient_phone TEXT DEFAULT '',
            subject TEXT DEFAULT '',
            body TEXT NOT NULL,
            status TEXT DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS staff_attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            status TEXT DEFAULT 'present',
            check_in TEXT DEFAULT '',
            check_out TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(staff_id, date)
        );
        CREATE TABLE IF NOT EXISTS payroll (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id INTEGER NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            base_salary REAL DEFAULT 0,
            working_days INTEGER DEFAULT 0,
            present_days REAL DEFAULT 0,
            advances REAL DEFAULT 0,
            deductions REAL DEFAULT 0,
            bonus REAL DEFAULT 0,
            net_salary REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            paid_date TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(staff_id, month, year)
        );
        CREATE TABLE IF NOT EXISTS maintenance_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'other',
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            assigned_to INTEGER DEFAULT NULL,
            assigned_to_name TEXT DEFAULT '',
            reported_by_resident_id INTEGER DEFAULT NULL,
            reported_by_name TEXT DEFAULT '',
            room_id INTEGER DEFAULT NULL,
            estimated_cost REAL DEFAULT 0,
            actual_cost REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS gate_passes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resident_id INTEGER NOT NULL,
            resident_name TEXT DEFAULT '',
            purpose TEXT DEFAULT '',
            destination TEXT DEFAULT '',
            from_date TEXT NOT NULL,
            to_date TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            approved_by TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS utility_bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL,
            resident_id INTEGER DEFAULT NULL,
            resident_name TEXT DEFAULT '',
            room_number TEXT DEFAULT '',
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            electricity_units REAL DEFAULT 0,
            electricity_amount REAL DEFAULT 0,
            water_amount REAL DEFAULT 0,
            other_amount REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            paid_date TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(room_id, month, year)
        );
        CREATE TABLE IF NOT EXISTS security_deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resident_id INTEGER NOT NULL,
            resident_name TEXT DEFAULT '',
            amount REAL NOT NULL,
            paid_date TEXT DEFAULT '',
            status TEXT DEFAULT 'held',
            refund_amount REAL DEFAULT 0,
            refund_date TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS enquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT DEFAULT '',
            email TEXT DEFAULT '',
            room_type_preference TEXT DEFAULT '',
            budget REAL DEFAULT 0,
            source TEXT DEFAULT 'walk-in',
            status TEXT DEFAULT 'new',
            notes TEXT DEFAULT '',
            follow_up_date TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT DEFAULT 'info',
            title TEXT NOT NULL,
            body TEXT DEFAULT '',
            is_read INTEGER DEFAULT 0,
            link TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS meal_attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resident_id INTEGER NOT NULL,
            resident_name TEXT DEFAULT '',
            room_number TEXT DEFAULT '',
            date TEXT NOT NULL,
            breakfast INTEGER DEFAULT 1,
            lunch INTEGER DEFAULT 1,
            dinner INTEGER DEFAULT 1,
            notes TEXT DEFAULT '',
            UNIQUE(resident_id, date)
        );
        CREATE TABLE IF NOT EXISTS meal_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            breakfast_rate REAL DEFAULT 30,
            lunch_rate REAL DEFAULT 50,
            dinner_rate REAL DEFAULT 50,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    conn.commit()


def init_db():
    """Initialize / migrate the platform DB."""
    conn = get_db()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT DEFAULT '',
        role TEXT DEFAULT 'customer',
        company_id INTEGER DEFAULT NULL,
        is_verified INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS pg_companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        owner_email TEXT NOT NULL,
        owner_user_id INTEGER DEFAULT NULL,
        city TEXT DEFAULT '',
        address TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        plan TEXT DEFAULT 'basic',
        status TEXT DEFAULT 'trial',
        total_rooms INTEGER DEFAULT 0,
        subscription_amount REAL DEFAULT 2999,
        accent_color TEXT DEFAULT '#FF6B35',
        pg_logo TEXT DEFAULT '🏠',
        pg_tagline TEXT DEFAULT '',
        contact_email TEXT DEFAULT '',
        contact_phone TEXT DEFAULT '',
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS otp_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_used INTEGER DEFAULT 0
    )''')

    conn.commit()

    # Safe migrations for existing DBs
    for sql in [
        "ALTER TABLE users ADD COLUMN company_id INTEGER DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''",
        "ALTER TABLE pg_companies ADD COLUMN owner_user_id INTEGER DEFAULT NULL",
        "ALTER TABLE pg_companies ADD COLUMN accent_color TEXT DEFAULT '#FF6B35'",
        "ALTER TABLE pg_companies ADD COLUMN pg_logo TEXT DEFAULT '🏠'",
        "ALTER TABLE pg_companies ADD COLUMN pg_tagline TEXT DEFAULT ''",
        "ALTER TABLE pg_companies ADD COLUMN contact_email TEXT DEFAULT ''",
        "ALTER TABLE pg_companies ADD COLUMN contact_phone TEXT DEFAULT ''",
        "ALTER TABLE pg_companies ADD COLUMN property_type TEXT DEFAULT 'pg'",
        "ALTER TABLE pg_companies ADD COLUMN website TEXT DEFAULT ''",
        "ALTER TABLE pg_companies ADD COLUMN gst_number TEXT DEFAULT ''",
        "ALTER TABLE pg_companies ADD COLUMN floors_count INTEGER DEFAULT 1",
        "ALTER TABLE pg_companies ADD COLUMN contract_months INTEGER DEFAULT 12",
        "ALTER TABLE pg_companies ADD COLUMN onboarding_notes TEXT DEFAULT ''",
        "ALTER TABLE pg_companies ADD COLUMN billing_cycle_day INTEGER DEFAULT 1",
        "ALTER TABLE pg_companies ADD COLUMN next_due_date TEXT DEFAULT ''",
        # Migrate any old roles
        "UPDATE users SET role='customer' WHERE role IN ('student','professional')",
        # Link existing owners to their company
        """UPDATE users SET company_id = (
            SELECT id FROM pg_companies WHERE owner_user_id = users.id LIMIT 1
        ) WHERE role = 'owner' AND company_id IS NULL""",
    ]:
        try:
            c.execute(sql)
        except Exception:
            pass

    # Subscription billing tracking
    c.execute('''CREATE TABLE IF NOT EXISTS subscription_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        plan TEXT NOT NULL,
        period_month INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        due_date TEXT DEFAULT '',
        paid_date TEXT DEFAULT '',
        payment_method TEXT DEFAULT '',
        transaction_ref TEXT DEFAULT '',
        invoice_number TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    # Platform email log
    c.execute('''CREATE TABLE IF NOT EXISTS platform_emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        to_email TEXT NOT NULL,
        to_name TEXT DEFAULT '',
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        email_type TEXT DEFAULT 'general',
        status TEXT DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    # Platform leads (SaaS CRM)
    c.execute('''CREATE TABLE IF NOT EXISTS platform_leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        property_type TEXT DEFAULT 'pg',
        city TEXT DEFAULT '',
        source TEXT DEFAULT 'organic',
        status TEXT DEFAULT 'new',
        plan_interest TEXT DEFAULT 'basic',
        rooms_count TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        follow_up_date TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    conn.commit()
    conn.close()
    print("[DB] Platform tables ready.")
