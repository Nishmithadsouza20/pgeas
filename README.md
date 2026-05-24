# PGease — Smart Accommodation Management Platform

> **College Internship Project** · Built by **Nishmitha Pawan**

A full-stack, multi-tenant SaaS platform for managing PGs, hostels, lodges, dormitories, and apartments — with role-based portals for Super Admins, Property Owners, and Residents.

---

## What is PGease?

PGease is a complete property management system that lets a platform operator (Super Admin) onboard client properties (Owners) who then manage their residents end-to-end — from room allocation and rent collection to complaints, gate passes, staff payroll, and analytics.

**Three roles. One platform.**

| Role | What they see | How created |
|------|--------------|-------------|
| Super Admin | Platform Console — all clients, MRR, billing | `seed.py` |
| Owner | Property Management — rooms, residents, finance | Super Admin |
| Resident | My Portal — payments, complaints, notices | Owner |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · React Router v6 · Recharts · CSS Variables |
| Backend | Python Flask · Flask-JWT-Extended · SQLite |
| Auth | JWT tokens · bcrypt · OTP email verification |
| Database | Multi-tenant SQLite (1 platform DB + 1 per client) |

---

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python seed.py        # seed all demo accounts (run once)
python app.py         # starts API on http://localhost:5000
```

> **Windows:** If `python` is not on PATH, use the full path:
> ```
> C:\Users\tast\AppData\Local\Python\pythoncore-3.10-64\python.exe seed.py
> ```

### 2. Frontend

```bash
cd frontend
npm install
npm start             # React dev server on http://localhost:3000
```

### 3. Re-seed (fresh data)

```bash
cd backend
python seed.py        # wipes and recreates all 15 companies + 31 accounts
```

---

## Demo Accounts

All passwords are fixed so you can log in immediately after seeding.

### Super Admin

| Email | Password |
|-------|----------|
| `admin@pgease.com` | `Admin@123` |

---

### Owner Accounts (15 companies)

**Password for all owners: `Owner@123`**

#### PG — Paying Guest

| Plan | Email | Company | City | Status |
|------|-------|---------|------|--------|
| Basic | `owner.pg.basic@pgease.com` | Cozy Nest PG | Mysore | Active |
| Premium | `owner.pg.premium@pgease.com` | Sunrise PG Homes | Bangalore | Active |
| Enterprise | `owner.pg.enterprise@pgease.com` | Royal Comfort PG | Bangalore | Active |

#### Hostel

| Plan | Email | Company | City | Status |
|------|-------|---------|------|--------|
| Basic | `owner.hostel.basic@pgease.com` | Budget Nest Hostel | Pune | Trial |
| Premium | `owner.hostel.premium@pgease.com` | Green Valley Hostel | Mumbai | Active |
| Enterprise | `owner.hostel.enterprise@pgease.com` | Elite Stay Hostel | Hyderabad | Active |

#### Lodge

| Plan | Email | Company | City | Status |
|------|-------|---------|------|--------|
| Basic | `owner.lodge.basic@pgease.com` | City Budget Lodge | Chennai | Active |
| Premium | `owner.lodge.premium@pgease.com` | Metro Lodge | Bangalore | Active |
| Enterprise | `owner.lodge.enterprise@pgease.com` | Grand Stay Lodge | Delhi | Active |

#### Dormitory

| Plan | Email | Company | City | Status |
|------|-------|---------|------|--------|
| Basic | `owner.dorm.basic@pgease.com` | Campus Dorms | Manipal | Trial |
| Premium | `owner.dorm.premium@pgease.com` | Metro Dormitory | Hyderabad | Active |
| Enterprise | `owner.dorm.enterprise@pgease.com` | Premier Dorms | Chennai | Active |

#### Apartment

| Plan | Email | Company | City | Status |
|------|-------|---------|------|--------|
| Basic | `owner.apartment.basic@pgease.com` | Urban Budget Flats | Noida | Active |
| Premium | `owner.apartment.premium@pgease.com` | Urban Apartments | Delhi | Active |
| Enterprise | `owner.apartment.enterprise@pgease.com` | Prestige Residences | Mumbai | Active |

---

### Resident Accounts (15 residents, one per company)

**Password for all residents: `Resident@123`**

| Email | Resident Name | Property |
|-------|--------------|---------|
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

| Plan | Price | Max Rooms | Included Features |
|------|-------|-----------|------------------|
| **Basic** | ₹2,999/mo | 50 | Rooms · Residents · Payments · Complaints · Visitors · Gate Pass · Mess Menu · Enquiries |
| **Premium** | ₹4,999/mo | 200 | Everything in Basic + Analytics · Invoices · Staff · Payroll · Security Deposits · Expenses |
| **Enterprise** | ₹7,999/mo | Unlimited | Everything in Premium + Food Inventory · Full Reports · Meal Attendance · Priority Support |

---

## Feature Modules

### Owner Portal

| Module | Description |
|--------|------------|
| **Dashboard** | Real-time KPIs — occupancy rate, revenue, pending payments, recent activity |
| **Rooms** | Add/edit rooms, assign residents to beds, per-bed management |
| **Residents** | Full resident profiles, food preference, move-in/out, away status |
| **Payments** | Rent collection, payment history, status tracking, reminders |
| **Invoices** | Auto-generate monthly rent invoices per resident |
| **Security Deposits** | Track deposits paid and refunds |
| **Expenses** | Log and categorise property expenses |
| **Reports** | P&L statement, rent roll, defaulters list, occupancy report |
| **Staff** | Employee records, role and shift management |
| **Attendance** | Daily staff attendance marking and summary |
| **Payroll** | Monthly salary computation and slip generation |
| **Maintenance** | Work order creation, assignment, and resolution tracking |
| **Gate Pass** | Resident in/out pass request and approval (PG / Hostel / Dorm) |
| **Enquiries** | Prospective tenant pipeline with follow-up status |
| **Complaints** | Resident complaint tracking and resolution workflow |
| **Notices** | Post notices by category; residents see them in their portal |
| **Mess Menu** | Weekly food menu management (PG / Hostel / Dorm) |
| **Meal Attendance** | Daily breakfast / lunch / dinner attendance per resident |
| **Analytics** | Occupancy trend, revenue charts, complaint breakdown, payment rate |
| **Settings** | Branding (logo, name, tagline), contact info, accent colour, plan details |

### Resident Portal

| Screen | What the resident sees |
|--------|----------------------|
| Dashboard | Room details, recent payments, today's mess menu |
| My Payments | Payment history and current dues |
| Maintenance | Raise and track maintenance requests |
| Gate Pass | Request and track gate passes |
| Complaints | File and monitor complaint status |
| Mess Menu | Weekly food menu |
| Notices | All property notices |

### Super Admin — Platform Console

| Feature | Description |
|---------|------------|
| Client Management | Provision, edit, suspend, delete client companies |
| Billing | Generate monthly invoices per client, mark as paid |
| Email Log | Track all system emails sent to owners |
| Analytics | MRR trend, plan distribution pie chart, city breakdown |
| Live Alerts | Plan/status changes are pushed to owner dashboards in real time |

---

## Project Structure

```
PGease/
├── backend/
│   ├── app.py              # Flask app factory + blueprint registration
│   ├── database.py         # Multi-tenant DB setup and schema
│   ├── seed.py             # Master seed script  ← always run this first
│   ├── seed_data.py        # Alternative seed with richer demo data
│   ├── routes/             # API blueprints
│   │   ├── auth.py         # Login, OTP, password reset
│   │   ├── rooms.py        # Room CRUD + bed management
│   │   ├── residents.py    # Resident CRUD + CSV export
│   │   ├── payments.py     # Payments + gateway simulation
│   │   ├── staff.py        # Staff + attendance + payroll
│   │   ├── analytics.py    # Charts and KPI endpoints
│   │   └── ...             # complaints, notices, mess, gatepass, …
│   ├── pgease.db           # Platform DB (auto-created)
│   └── company_N.db        # Per-client isolated DB (auto-created)
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.js              # Routes + Shell layout
│       ├── index.css           # Global design system (CSS variables)
│       ├── pages/              # One file per page/route
│       │   ├── Login.jsx
│       │   ├── ForgotPassword.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Rooms.jsx
│       │   ├── Residents.jsx
│       │   ├── Payments.jsx
│       │   └── ...             # 20+ pages total
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── Navbar.jsx
│       │   ├── NotificationBell.jsx
│       │   └── ProtectedRoute.jsx
│       ├── context/
│       │   ├── AuthContext.js   # JWT + user state + company polling
│       │   ├── ThemeContext.js  # Dark / Light theme toggle
│       │   └── ToastContext.js  # Global toast notifications
│       └── utils/
│           └── api.js           # Centralised fetch wrapper
│
├── docs/
│   ├── USER_GUIDE.md           # Role-by-role feature walkthrough
│   └── screenshots/            # Add screenshots here
│
├── .gitignore
└── README.md
```

---

## Authentication Flow

```
User enters email + password
        │
        ▼
  POST /api/auth/login
        │
   ┌────┴────┐
   │ Success │──► JWT token returned ──► stored in localStorage
   └────┬────┘
        │
        ▼
  React Router redirects to /dashboard
        │
        ▼
  AuthContext polls /api/auth/me every 30s
  (owners also poll /api/companies/my-settings for plan changes)
```

**Password reset flow:**  
`Forgot Password` → OTP sent to email → enter OTP → set new password

---

## Environment Setup (optional)

Create `backend/.env` — all values have safe defaults without it:

```env
SECRET_KEY=pgease_secret
JWT_SECRET_KEY=pgease_jwt
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_personal_email@gmail.com
MAIL_PASSWORD=your_app_password
```

> Email (OTP, reminders) only works if `MAIL_USERNAME` and `MAIL_PASSWORD` are configured.

---

## Pushing to GitHub

```bash
# From C:\Users\tast\PGease in terminal:

git init
git add .
git commit -m "feat: PGease accommodation management platform"

# Create an empty repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/pgease.git
git branch -M main
git push -u origin main
```

**Subsequent pushes:**
```bash
git add .
git commit -m "describe your change"
git push
```

### Files excluded by .gitignore

| Pattern | Why excluded |
|---------|-------------|
| `*.db` | SQLite files — regenerate with `seed.py` |
| `node_modules/` | Reinstall via `npm install` |
| `__pycache__/` | Python bytecode — auto-generated |
| `.env` | Contains secrets |

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Per-client SQLite databases | Full data isolation between tenants; no cross-contamination risk |
| JWT + OTP | Stateless auth with email-verified password resets |
| React CSS variables | Single source of truth for theme — dark/light toggle with zero JS |
| Multi-step provision wizard | Guides admin through client onboarding without errors |
| Plan-change polling | Owners see plan upgrades/downgrades live without page refresh |

---

*PGease — College Project by Nishmitha 
