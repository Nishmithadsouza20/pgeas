# PGease — Architecture & Flow Diagrams

> Visual maps of how the system is structured and how data moves through it.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                React SPA (localhost:3000)                 │  │
│  │                                                          │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │ AuthContext│  │ ThemeContext  │  │  ToastContext    │  │  │
│  │  └────────────┘  └──────────────┘  └─────────────────┘  │  │
│  │                                                          │  │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────────────────────┐ │  │
│  │  │ Sidebar │  │  Navbar │  │      Page Component       │ │  │
│  │  └─────────┘  └─────────┘  │  (Dashboard, Rooms, ...)  │ │  │
│  │                             └──────────────────────────┘ │  │
│  │                                      │                   │  │
│  │                               api.js (fetch wrapper)     │  │
│  └──────────────────────────────────────│──────────────────┘  │
└─────────────────────────────────────────│───────────────────────┘
                                          │ HTTP + JWT
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Flask API (localhost:5000)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                       app.py                             │  │
│  │  Flask-JWT-Extended   Flask-CORS   python-dotenv          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  auth.py │ │ rooms.py │ │payments  │ │  companies.py    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  staff   │ │analytics │ │ reports  │ │  ... 17 more     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    database.py                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────┬───────────────────┘
                           │                  │
              ┌────────────┘                  └────────────────┐
              ▼                                                ▼
┌─────────────────────┐                     ┌──────────────────────┐
│   pgease.db         │                     │  company_N.db        │
│  (Platform DB)      │                     │  (Per-Tenant DB)     │
│                     │                     │                      │
│  users              │                     │  rooms               │
│  pg_companies       │                     │  residents           │
│  otp_tokens         │                     │  payments            │
│  subscription_pay   │                     │  staff               │
│  platform_emails    │                     │  maintenance         │
│  platform_leads     │                     │  complaints          │
│                     │                     │  ... 20+ tables      │
└─────────────────────┘                     └──────────────────────┘
```

---

## 2. Multi-Tenant Database Model

```
                    pgease.db (ONE file, platform-wide)
                   ┌─────────────────────────────────┐
                   │  users          pg_companies     │
                   │  id=1 admin     id=10 CozyNest   │
                   │  id=2 owner_A   id=11 Sunrise    │
                   │  id=3 owner_B   id=12 RoyalPG    │
                   │  id=4 res_A     ...               │
                   └─────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    company_10.db     company_11.db    company_12.db
   ┌────────────┐    ┌────────────┐   ┌────────────┐
   │ CozyNest   │    │ Sunrise PG │   │ RoyalPG    │
   │ rooms      │    │ rooms      │   │ rooms      │
   │ residents  │    │ residents  │   │ residents  │
   │ payments   │    │ payments   │   │ payments   │
   │ staff      │    │ staff      │   │ staff      │
   │ ...        │    │ ...        │   │ ...        │
   └────────────┘    └────────────┘   └────────────┘

Each owner's data is completely isolated. Owner A cannot see Owner B's residents.
```

---

## 3. Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                                │
└──────────────────────────────────────────────────────────────────┘

User enters email + password
          │
          ▼
   POST /api/auth/login
          │
   ┌──────┴──────┐
   │ Find user   │ ──── not found ──► 401 Unauthorized
   │ in pgease.db│
   └──────┬──────┘
          │ found
          ▼
   bcrypt.checkpw(password, stored_hash)
          │
   ┌──────┴──────┐
   │  No match   │ ──────────────────► 401 Unauthorized
   └──────┬──────┘
          │ match
          ▼
   Assign role:
   email == SUPER_ADMIN_EMAIL  →  super_admin
   email == OWNER_EMAIL        →  owner
   else                        →  customer
          │
          ▼
   create_access_token(identity=user_id, expires=24h)
          │
          ▼
   Return: { token, user, company }
          │
          ▼
   Frontend stores token in localStorage
   AuthContext sets user + company state
          │
          ▼
   React Router redirects to /dashboard

┌──────────────────────────────────────────────────────────────────┐
│                   PROTECTED REQUEST FLOW                         │
└──────────────────────────────────────────────────────────────────┘

api.js adds header: Authorization: Bearer <token>
          │
          ▼
Flask @jwt_required() decorator
          │
   ┌──────┴──────┐
   │ Token valid?│ ──── no ──────────► 401, frontend redirects to /login
   └──────┬──────┘
          │ yes
          ▼
get_jwt_identity() → user_id
          │
          ▼
Route handler executes

┌──────────────────────────────────────────────────────────────────┐
│                  OTP REGISTRATION FLOW                           │
└──────────────────────────────────────────────────────────────────┘

POST /api/auth/register
  → hash password, save user (is_verified=false)
  → generate 6-digit OTP
  → save OTP with 10-min expiry to otp_tokens
  → email OTP to user
          │
          ▼
POST /api/auth/verify-otp
  → check OTP matches and not expired
  → mark user is_verified=true
  → delete OTP record
  → return JWT token (user is logged in)
```

---

## 4. Request Lifecycle (Typical API Call)

```
React Component                api.js              Flask Route         SQLite

     │   fetchRooms()              │                    │                 │
     │ ──────────────────────────► │                    │                 │
     │                             │  GET /api/rooms    │                 │
     │                             │  Authorization:    │                 │
     │                             │  Bearer <jwt>      │                 │
     │                             │ ─────────────────► │                 │
     │                             │                    │ @jwt_required() │
     │                             │                    │  verify token   │
     │                             │                    │                 │
     │                             │                    │ SELECT user     │
     │                             │                    │ ──────────────► │ pgease.db
     │                             │                    │ ◄────────────── │ user row
     │                             │                    │                 │
     │                             │                    │ get_company_db  │
     │                             │                    │ (company_id)    │
     │                             │                    │                 │
     │                             │                    │ SELECT rooms    │
     │                             │                    │ ──────────────► │ company_N.db
     │                             │                    │ ◄────────────── │ room rows
     │                             │                    │                 │
     │                             │ ◄───────────────── │ JSON response   │
     │  setState(rooms)            │                    │                 │
     │ ◄────────────────────────── │                    │                 │
     │                             │                    │                 │
  Re-render UI                     │                    │                 │
```

---

## 5. Role-Based Access Control

```
                         ┌─────────────────┐
                         │    Request in   │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │  JWT verified?  │ ──── NO ──► 401
                         └────────┬────────┘
                                  │ YES
                         ┌────────▼────────┐
                         │   Get user role │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
       super_admin              owner              customer
              │                   │                   │
    Full platform         Own company only      Own data only
    access (all DBs)      (company_N.db)     (filtered by user_id
              │                   │              or room_id)
              │                   │                   │
      Can: provision       Can: CRUD rooms,      Can: view own
      clients, billing,    residents, staff,     payments,
      email log,           payments, reports     raise requests,
      plan changes         analytics, etc.       read notices
```

---

## 6. Frontend Component Tree

```
index.js
└── AuthProvider
    └── ThemeProvider
        └── ToastProvider
            └── App.js (React Router)
                │
                ├── /login          → Login.jsx (public)
                ├── /register       → Register.jsx (public)
                ├── /forgot-password→ ForgotPassword.jsx (public)
                │
                └── Shell Layout (when authenticated)
                    ├── Sidebar.jsx (role-based menu)
                    ├── Navbar.jsx
                    │   └── NotificationBell.jsx
                    └── <Outlet> (current page renders here)
                        │
                        ├── /dashboard      → Dashboard.jsx
                        ├── /rooms          → Rooms.jsx          [owner]
                        ├── /residents      → Residents.jsx      [owner]
                        ├── /payments       → Payments.jsx       [owner+resident]
                        ├── /complaints     → Complaints.jsx     [owner+resident]
                        ├── /maintenance    → Maintenance.jsx    [owner+resident]
                        ├── /gatepass       → GatePass.jsx       [owner+resident]
                        ├── /notices        → Notices.jsx        [owner+resident]
                        ├── /mess           → MessMenu.jsx       [owner+resident]
                        ├── /staff          → Staff.jsx          [owner]
                        ├── /attendance     → Attendance.jsx     [owner]
                        ├── /payroll        → Payroll.jsx        [owner]
                        ├── /invoices       → Invoices.jsx       [owner]
                        ├── /deposits       → Deposits.jsx       [owner]
                        ├── /expenses       → Expenses.jsx       [owner]
                        ├── /utilities      → Utilities.jsx      [owner]
                        ├── /reports        → Reports.jsx        [owner]
                        ├── /analytics      → Analytics.jsx      [owner+superadmin]
                        ├── /visitors       → Visitors.jsx       [owner]
                        ├── /meals          → Meals.jsx          [owner]
                        ├── /enquiries      → Enquiries.jsx      [owner]
                        ├── /settings       → Settings.jsx       [owner]
                        └── /plans          → Plans.jsx          [superadmin]
```

---

## 7. Plan Change Real-Time Update Flow

```
Super Admin edits company plan in browser
          │
          ▼
PUT /api/companies/<id>
  → updates pg_companies.plan in pgease.db
  → sends plan-change email to owner
          │
          ▼
(Owner's browser is polling every 30 seconds)
          │
          ▼
AuthContext: GET /api/companies/my-settings
  → returns new plan value
          │
          ▼
context.company.plan changes
          │
          ▼
App.js detects plan change via useEffect
  → shows upgrade/change banner at top of page
  → Sidebar re-renders with newly unlocked (or locked) menu items
```

---

## 8. Data Relationships (Operational DB)

```
rooms ──────────────────────────────────────────┐
  │ id                                           │
  │                                             ▼
  │              residents                  utility_bills
  │                id │                    room_id (FK)
  │           room_id (FK) ──────────────► month, year
  │                │                       electricity
  │                │                       water
  │                │
  │          ┌─────┼──────┬────────────┬────────────────┐
  │          ▼     ▼      ▼            ▼                ▼
  │       payments complaints maintenance  gate_pass  invoices
  │    resident_id resident_id resident_id resident_id resident_id
  │
  └─── visitors (resident_id FK)

staff ──────────────────────────────────────────┐
  id                                            │
  │                                             │
  ├──► staff_attendance (staff_id, date UNIQUE) │
  └──► payroll (staff_id, month, year)          │

notices ──────────────────────────────────────► notice_reads
  id                                           notice_id, user_id
```

---

## 9. Email Sending Flow

```
Event trigger (e.g. billing marked paid)
          │
          ▼
Route handler calls send_email(to, subject, body)
          │
   ┌──────┴──────┐
   │ MAIL_USERNAME│ ──── not set ──► skip silently (no error)
   │ configured? │
   └──────┬──────┘
          │ yes
          ▼
smtplib.SMTP(MAIL_SERVER, MAIL_PORT)
.starttls()
.login(MAIL_USERNAME, MAIL_PASSWORD)
.sendmail(from, to, message)
          │
          ▼
INSERT INTO platform_emails (to, subject, sent_at)
  → audit trail written to pgease.db regardless of email success
```

---

## 10. Subscription Plans & Feature Gating

```
                    ┌─────────────────────────────────┐
                    │         pg_companies             │
                    │  plan: 'basic' | 'premium' | 'enterprise'
                    └────────────────┬────────────────┘
                                     │
                    Returned in /api/companies/my-settings
                                     │
                                     ▼
                    AuthContext.company.plan
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
                 basic            premium         enterprise
                    │                │                │
             Sidebar shows:   Sidebar adds:   Sidebar adds:
             - Rooms          - Analytics     - Food Inventory
             - Residents      - Invoices      - Reports
             - Payments       - Staff         - Meal Attendance
             - Complaints     - Payroll
             - Visitors       - Deposits
             - Gate Pass      - Expenses
             - Mess Menu
             - Enquiries

             Premium/Enterprise modules show lock icon for Basic owners
```
