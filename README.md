# PGease — Smart Accommodation Management Platform

A full-stack multi-tenant SaaS platform for managing PGs, hostels, lodges, dormitories, and apartments.

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, React Router v6, Recharts, CSS variables (mobile-responsive) |
| Backend  | Python Flask, Flask-JWT-Extended, SQLite |
| Auth     | JWT tokens + bcrypt password hashing + OTP verification |
| Database | Multi-tenant SQLite — 1 platform DB + 1 isolated DB per client |

---

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python seed.py        # Creates all 15 demo companies + 31 accounts
python app.py         # API on http://localhost:5000
```

> **Windows note:** If `python` is not found, use the full path:
> `C:\Users\tast\AppData\Local\Python\bin\python.exe seed.py`

### 2. Frontend

```bash
cd frontend
npm install
npm start             # React app on http://localhost:3000
```

---

## How Accounts Work

There are **three roles**. All accounts are created by `seed.py` — there is no public self-registration.

| Role | Portal | Account created by |
|------|--------|--------------------|
| **Super Admin** | Platform Console | `seed.py` |
| **Owner** | Property Management | Super Admin (Platform Console) |
| **Resident** | Resident Portal | Owner (Residents page) |

---

## Demo Accounts

> Run `python seed.py` once to create everything. Re-run any time for a fresh start.

### Super Admin

| Email | Password |
|-------|----------|
| `admin@pgease.com` | `Admin@123` |

---

### Owner Accounts — 15 companies (5 property types × 3 plans)

**Password for all owners: `Owner@123`**

#### PG (Paying Guest)

| Plan | Status | Email | Company | City |
|------|--------|-------|---------|------|
| Basic | Active | `owner.pg.basic@pgease.com` | Cozy Nest PG | Mysore |
| Premium | Active | `owner.pg.premium@pgease.com` | Sunrise PG Homes | Bangalore |
| Enterprise | Active | `owner.pg.enterprise@pgease.com` | Royal Comfort PG | Bangalore |

#### Hostel

| Plan | Status | Email | Company | City |
|------|--------|-------|---------|------|
| Basic | Trial | `owner.hostel.basic@pgease.com` | Budget Nest Hostel | Pune |
| Premium | Active | `owner.hostel.premium@pgease.com` | Green Valley Hostel | Mumbai |
| Enterprise | Active | `owner.hostel.enterprise@pgease.com` | Elite Stay Hostel | Hyderabad |

#### Lodge

| Plan | Status | Email | Company | City |
|------|--------|-------|---------|------|
| Basic | Active | `owner.lodge.basic@pgease.com` | City Budget Lodge | Chennai |
| Premium | Active | `owner.lodge.premium@pgease.com` | Metro Lodge | Bangalore |
| Enterprise | Active | `owner.lodge.enterprise@pgease.com` | Grand Stay Lodge | Delhi |

#### Dormitory

| Plan | Status | Email | Company | City |
|------|--------|-------|---------|------|
| Basic | Trial | `owner.dorm.basic@pgease.com` | Campus Dorms | Manipal |
| Premium | Active | `owner.dorm.premium@pgease.com` | Metro Dormitory | Hyderabad |
| Enterprise | Active | `owner.dorm.enterprise@pgease.com` | Premier Dorms | Chennai |

#### Apartment

| Plan | Status | Email | Company | City |
|------|--------|-------|---------|------|
| Basic | Active | `owner.apartment.basic@pgease.com` | Urban Budget Flats | Noida |
| Premium | Active | `owner.apartment.premium@pgease.com` | Urban Apartments | Delhi |
| Enterprise | Active | `owner.apartment.enterprise@pgease.com` | Prestige Residences | Mumbai |

---

### Resident Accounts — 1 per company (15 total)

> Residents do **not** have a subscription plan — the plan belongs to the owner's company.
> Each resident below is seeded inside one owner's property for demo purposes.

**Password for all residents: `Resident@123`**

| Email | Name | Lives in |
|-------|------|---------|
| `resident.pg.basic@pgease.com` | Arjun Sharma | Cozy Nest PG |
| `resident.pg.premium@pgease.com` | Priya Mehta | Sunrise PG Homes |
| `resident.pg.enterprise@pgease.com` | Rohan Gupta | Royal Comfort PG |
| `resident.hostel.basic@pgease.com` | Rahul Kumar | Budget Nest Hostel |
| `resident.hostel.premium@pgease.com` | Sneha Iyer | Green Valley Hostel |
| `resident.hostel.enterprise@pgease.com` | Vikram Reddy | Elite Stay Hostel |
| `resident.lodge.basic@pgease.com` | Kavya Reddy | City Budget Lodge |
| `resident.lodge.premium@pgease.com` | Aditya Nair | Metro Lodge |
| `resident.lodge.enterprise@pgease.com` | Pooja Desai | Grand Stay Lodge |
| `resident.dorm.basic@pgease.com` | Mohammed Ali | Campus Dorms |
| `resident.dorm.premium@pgease.com` | Deepa Krishnan | Metro Dormitory |
| `resident.dorm.enterprise@pgease.com` | Siddharth Rao | Premier Dorms |
| `resident.apartment.basic@pgease.com` | Sunita Rao | Urban Budget Flats |
| `resident.apartment.premium@pgease.com` | Karan Joshi | Urban Apartments |
| `resident.apartment.enterprise@pgease.com` | Meera Pillai | Prestige Residences |

---

## Subscription Plans

| Plan | Price | Max Rooms | Key Features |
|------|-------|-----------|-------------|
| Basic | ₹2,999/mo | 50 | Rooms, residents, payments, complaints, visitors, gate pass |
| Premium | ₹4,999/mo | 200 | + Analytics, invoices, staff, payroll, deposits |
| Enterprise | ₹7,999/mo | Unlimited | + Food inventory, full reports, priority support |

---

## Feature Modules

### Owner Portal
| Module | Description |
|--------|------------|
| Dashboard | KPIs, occupancy rate, revenue trend charts |
| Rooms | Add, edit, assign / vacate rooms |
| Residents | Full resident management + resident login creation |
| Payments | Rent collection, payment history |
| Invoices | Monthly rent invoice generation |
| Deposits | Security deposit tracking and refunds |
| Expenses | Expense tracking by category |
| Reports | P&L, rent roll, defaulters, occupancy |
| Staff | Employee records |
| Attendance | Daily staff attendance |
| Payroll | Monthly salary generation |
| Maintenance | Work order tracking |
| Gate Pass | Resident gate pass approvals (PG / Hostel / Dormitory) |
| Enquiries | Prospective tenant pipeline |
| Complaints | Resident complaints tracker |
| Notices | Notice board |
| Mess Menu | Weekly food menu (PG / Hostel / Dormitory) |
| Meal Attendance | Breakfast / lunch / dinner tracking |
| Analytics | Occupancy, revenue, complaints charts |
| Settings | Branding, contact info, current plan details |

### Resident Portal
Dashboard · My Payments · Maintenance · Gate Pass · Complaints · Mess Menu · Notices

### Super Admin — Platform Console
- Provision, edit, suspend client companies
- Billing — generate monthly invoices, mark paid
- Email log — track all client communications
- Analytics — MRR trend, plan distribution, city breakdown
- Real-time plan-change alerts pushed to owner dashboards

---

## Project Structure

```
PGease/
├── backend/
│   ├── app.py              # Flask entry point + blueprint registration
│   ├── database.py         # Multi-tenant DB setup
│   ├── seed.py             # Master seed script  ← run this first
│   ├── routes/             # API blueprints (auth, rooms, residents, …)
│   ├── pgease.db           # Platform DB (auto-created by seed.py)
│   └── company_N.db        # Per-client DB (auto-created by seed.py)
├── frontend/
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Sidebar, Navbar, NotificationBell
│   │   ├── context/        # AuthContext, ThemeContext
│   │   └── utils/api.js    # Centralised API client
│   └── public/
├── docs/
│   ├── USER_GUIDE.md       # Role-by-role walkthrough
│   └── screenshots/        # Add screenshots here (see screenshots/README.md)
├── .gitignore
└── README.md
```

---

## Environment (optional)

Create `backend/.env` — defaults work without it:

```env
SECRET_KEY=pgease_secret
JWT_SECRET_KEY=pgease_jwt
```

---

## Push to GitHub

```bash
# 1. Create a new EMPTY repo on github.com (no README, no .gitignore)

# 2. From C:\Users\tast\PGease in terminal:
git init
git add .
git commit -m "Initial commit: PGease accommodation management platform"

# 3. Replace YOUR_USERNAME with your GitHub username:
git remote add origin https://github.com/YOUR_USERNAME/pgease.git
git branch -M main
git push -u origin main
```

**Every push after that:**
```bash
git add .
git commit -m "describe your change"
git push
```

### What .gitignore excludes
| Pattern | Reason |
|---------|--------|
| `*.db` | SQLite files — regenerate with `seed.py` |
| `node_modules/` | Reinstall with `npm install` |
| `__pycache__/` | Python bytecode |
| `.env` | Secrets |

---

## Re-seeding

```bash
cd backend
python seed.py    # Wipes all data and creates 31 fresh demo accounts
```

---

*PGease — College Project by Bhuvan Mahadev*
