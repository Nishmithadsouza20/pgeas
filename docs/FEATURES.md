# PGease — Complete Product Features

> A deep-dive into every feature, how it works, who can use it, and what happens under the hood.

---

## Role System

PGease has three distinct roles. Every page and API endpoint enforces role checks.

| Role | Created by | Scope |
|------|-----------|-------|
| **Super Admin** | Seed script | Controls the entire platform — all companies, billing, MRR |
| **Owner** | Super Admin | Manages one PG/hostel/lodge property — all residents, rooms, staff |
| **Resident (Customer)** | Owner | Personal portal — their room, payments, complaints, gate pass |

Role assignment happens at login: the backend checks the logged-in email against two env vars (`SUPER_ADMIN_EMAIL`, `OWNER_EMAIL`). Everyone else is a resident.

---

## Authentication & Security

### Registration
1. User fills email + password → `POST /api/auth/register`
2. Backend bcrypt-hashes the password and creates the user with `is_verified = false`
3. A 6-digit OTP is generated, stored with a 10-minute expiry, and emailed
4. User enters OTP → `POST /api/auth/verify-otp` → account activated

### Login
1. Email + password submitted → `POST /api/auth/login`
2. bcrypt compares stored hash; if matched, a JWT token with 24-hour expiry is returned
3. Frontend stores token in `localStorage` and attaches it as `Authorization: Bearer <token>` on every API call

### Password Reset
1. User enters email → `POST /api/auth/forgot-password`
2. New OTP emailed; user submits OTP + new password → `POST /api/auth/reset-password`
3. Password re-hashed and saved; old OTPs invalidated

### Session Refresh
- `AuthContext` polls `GET /api/auth/me` every 30 seconds
- If the token expires or the user is deactivated, the frontend automatically logs out

---

## Super Admin — Platform Console

### Client Management
The super admin sees all registered companies. Each company record stores:
- Company name, type (PG / hostel / lodge / dormitory / apartment), city
- Subscription plan (basic / premium / enterprise), status (active / trial / suspended / cancelled)
- Owner contact details

**Provision a new client:** Super admin fills a wizard → one API call (`POST /api/companies/provision`) creates the owner user account, company record, first billing entry, and sends a welcome email. No manual steps needed.

**Plan / status changes:** Updating a company plan triggers an email to the owner and sets a flag the owner portal polls for. Owners see a banner within 30 seconds without refreshing.

### Billing
- Each company has monthly subscription payment records
- Super admin can mark a payment as paid → receipt email sent automatically
- Platform-level MRR is calculated by summing all active paid subscriptions for the current month

### Email Log
Every system email (welcome, billing, OTP, etc.) is written to `platform_emails`. Super admin can audit exactly when each email was sent and to whom.

### Platform Analytics
- Total clients, active vs trial vs suspended breakdown
- Monthly Recurring Revenue (MRR) trend chart (bar chart, last 6 months)
- Resident count across all properties
- Open complaint count across all properties

---

## Owner Portal — Property Management

### Dashboard
Real-time KPIs pulled from the company's isolated database:
- Occupancy rate (occupied rooms ÷ total rooms × 100)
- Monthly revenue (sum of paid rent for current month)
- Pending payments count
- Open maintenance requests
- Recent activity feed (last 5 payments, complaints, maintenance requests)

### Rooms
Tracks the physical inventory of the property.

**Fields per room:** Room number, floor, type (single / double / triple / dormitory), rent amount, amenities (JSON list), status (available / occupied / maintenance).

**How assignment works:**
1. Owner creates a room with a type and rent amount
2. When adding a resident, the owner picks from unassigned rooms
3. Room status updates to `occupied` automatically

**Room stats widget:** Shows total rooms, occupied, vacant, and under-maintenance counts.

### Residents
Full tenant profiles.

**Fields per resident:** Name, phone, email, ID proof type + number, occupation, food preference (veg / non-veg / jain), move-in date, room assignment, away status, expected-return date.

**Away status:** If a resident temporarily leaves, the owner marks them away. The system retains their room and profile; they show as away in the list.

**CSV Export:** Owner can export the full resident list as a CSV for offline use (`GET /api/residents/export`).

**Resident view:** When a resident logs in, `GET /api/residents/my` returns their profile merged with their room details.

### Payments
Monthly rent tracking.

**How it works:**
1. Owner creates a payment record: resident + month + year + amount
2. Status starts as `pending`
3. Owner marks it `paid` with the actual paid date
4. Late penalties can be added manually
5. Payment reminders can be sent per resident

**Customer view:** Residents see only their own payment history. They cannot see others'.

**Gateway simulation:** There is a stub endpoint (`POST /api/payments/gateway/pay`) that simulates a payment gateway response — not wired to a real provider yet.

**Monthly summary:** Aggregates total expected vs collected vs pending per month.

### Invoices
Auto-computed monthly bills per resident.

**Invoice composition:**
- Base rent (from room record)
- Utility charges (electricity + water + misc for that month)
- Penalty amount (from payment record)
- Security deposit held (reference only, not charged again)

Owner can view the invoice breakdown per resident per month. There is no PDF generation yet — invoices are on-screen.

### Security Deposits
Tracks refundable deposits taken at move-in.

**Fields:** Resident, amount, date paid, status (held / partial refund / fully refunded), refund amount, refund date.

**Refund flow:** When a resident moves out, owner updates the record to mark the amount refunded. The invoice screen shows the deposit held as a line item for context.

### Expenses
Operational cost tracking.

**Categories:** Maintenance, electricity, water, grocery, salary, miscellaneous.

**Payment modes:** Cash, cheque, online.

Monthly expense summary feeds the P&L report.

### Reports

**P&L Statement (`GET /api/reports/pl`):**
- Income: total rent collected + utility charges collected
- Expenses: sum of logged expenses + payroll total
- Net Profit/Loss for the selected month

**Rent Roll (`GET /api/reports/rent-roll`):** One row per resident showing room, rent amount, paid/pending status, paid date.

**Defaulters List (`GET /api/reports/defaulters`):** All residents with at least one unpaid month. Shows outstanding months and total amount due.

**Occupancy Report (`GET /api/reports/occupancy`):** Occupancy rate per month for the last 6 months.

### Staff
Employee directory for the property.

**Fields per staff:** Name, role (manager / security / housekeeping / cook / maintenance), phone, salary, shift (morning / evening / night), join date, status (active / inactive).

**Staff stats:** Total active employees, sum of monthly salaries, breakdown by role.

### Attendance
Daily attendance marking for staff.

**How it works:**
1. Owner opens the attendance page for a date
2. Each staff member shows with a toggle: present / absent / leave
3. A record is created or updated for `(staff_id, date)` — the database enforces uniqueness so there's never a duplicate

**Monthly summary:** Shows each staff member's present/absent/leave count for the selected month.

### Payroll
Monthly salary computation.

**Generate payroll (`POST /api/payroll/generate`):**
1. Fetches all active staff and their salary amounts
2. Creates one payroll record per staff for the selected month
3. Records: base salary, bonus (0 by default), deductions (0 by default), net = salary + bonus − deductions

**Edit:** Owner can adjust bonus or deductions per staff per month after generation.

### Maintenance
Work order management.

**Fields per request:** Title, description, category, priority (low / medium / high / urgent), status (open → in progress → resolved / closed), assigned to (staff name, free text), estimated cost, actual cost, notes.

**Flow:** Resident raises a request → Owner sees it in the list → assigns it to staff → marks resolved once done.

**Resident view:** Residents can only see their own requests and update description/notes.

### Gate Pass
Entry/exit permits, typically used in PGs, hostels, and dormitories.

**Fields:** Resident, destination, purpose, out time, expected return, actual return, status (pending / approved / rejected / returned).

**Flow:**
1. Resident submits a gate pass request
2. Owner approves or rejects it
3. On return, the out-time is logged

### Complaints
Resident grievance tracking.

**Categories:** Maintenance, food, noise, cleanliness, security, other.

**Priority:** Low, medium, high, urgent.

**Status flow:** Open → in progress → resolved / closed.

**Resident view:** Residents see only their own complaints and the owner's response text.

### Notices
Property-wide announcements.

**Fields:** Title, content, category (general / maintenance / payment / event / emergency / food), is_active flag, is_important flag.

**Read tracking:** Each time a resident opens the notices page, their user ID is written to `notice_reads`. The owner can see read counts per notice.

### Mess Menu
Weekly food menu management. Most relevant for PGs, hostels, and dormitories.

**Structure:** One record per day + meal type (breakfast / lunch / dinner). Fields: items (text), is_vegetarian flag.

**Current week vs past weeks:** The endpoint accepts a `week` offset parameter (0 = this week, -1 = last week).

**Today's menu:** `GET /api/mess/today` returns only the three meals for the current day — used on the resident dashboard.

### Meal Attendance
Daily headcount of who ate each meal.

**Fields per record:** Date, resident, breakfast (bool), lunch (bool), dinner (bool).

**Bulk save:** The owner sees all residents in a table with checkboxes per meal; one click saves all records for the day.

**Monthly summary:** Shows each resident's meal count for the selected month. Multiplied by per-meal price from meal settings to compute food cost per resident.

### Analytics
Visual charts pulled from the company database.

| Chart | Endpoint | Type |
|-------|---------|------|
| Occupancy trend | `/analytics/occupancy` | Area chart, 6 months |
| Revenue trend | `/analytics/revenue` | Bar chart, 6 months |
| Complaints by category | `/analytics/complaints-breakdown` | Pie chart |
| Resident food ratio | `/analytics/resident-ratio` | Pie chart |
| Payment rate | `/analytics/payment-rate` | Bar chart |
| Room status distribution | `/analytics/room-status` | Pie chart |

### Enquiries
Sales pipeline for prospective tenants.

**Fields:** Name, phone, email, room type interest, budget, source (walk-in / online / referral / call), status (new → contacted → visited → converted / lost), follow-up date, notes.

**Purpose:** Lets owners track and convert leads without a separate CRM.

### Settings
Per-property branding and configuration.

**Customizable fields:** Property name, tagline, address, city, phone, email, logo URL, accent color, property type (PG / hostel / lodge / dormitory / apartment).

**Property type effect:** Changes the label used throughout the UI — "rooms" for PG/hostel, "units" for apartment, etc.

### Visitors
Guest entry/exit log.

**Fields:** Name, phone, purpose, resident they are visiting, in time, out time, ID proof type.

**Active visitors:** `GET /api/visitors/active` returns guests currently checked in (out_time is null).

### Notifications
In-app notification inbox.

- System events (plan change, payment marked paid, complaint updated) write a notification record per affected user
- `NotificationBell` component shows an unread badge and polls for count
- Clicking a notification marks it read

---

## Resident Portal

| Screen | What the resident can do |
|--------|------------------------|
| **Dashboard** | See their room details, current payment status, today's mess menu, recent notices |
| **My Payments** | View full payment history; see pending dues and amount |
| **Maintenance** | Raise a new maintenance request; track status of existing ones |
| **Gate Pass** | Submit a gate pass request; see approval status |
| **Complaints** | File a complaint with category and priority; read owner response |
| **Mess Menu** | View the weekly menu |
| **Notices** | Read all active property notices |

Residents cannot see other residents' data. The backend enforces this by filtering all queries on the logged-in user's ID or their assigned room.

---

## Subscription Plans

| Plan | Monthly Price | Max Rooms | Features Unlocked |
|------|-------------|-----------|------------------|
| **Basic** | ₹2,999 | 50 | Rooms, Residents, Payments, Complaints, Visitors, Gate Pass, Mess Menu, Enquiries |
| **Premium** | ₹4,999 | 200 | Everything in Basic + Analytics, Invoices, Staff, Payroll, Security Deposits, Expenses |
| **Enterprise** | ₹7,999 | Unlimited | Everything in Premium + Food Inventory, Full Reports, Meal Attendance, Priority Support |

Plan restrictions are enforced on the frontend via the `company.plan` field stored in context. The sidebar hides menu items the current plan doesn't include.

---

## Notification & Email Events

| Trigger | Who gets notified | How |
|---------|-----------------|-----|
| Welcome email | Owner | Email on provisioning |
| Plan changed | Owner | Email + in-app banner |
| Billing marked paid | Owner | Email receipt |
| Payment reminder | Resident | Email (console stub currently) |
| OTP verification | User | Email |
| Password reset OTP | User | Email |
| Complaint status update | Resident | In-app notification |
| Notice posted | All residents | In-app notification |
| Gate pass approved/rejected | Resident | In-app notification |

---

## Dark Mode

- Toggle button in the Navbar
- State stored in `localStorage` so it persists across sessions
- Implemented via CSS custom properties (`--bg-primary`, `--text-primary`, etc.) — switching the theme class on `<body>` is enough to restyle every component
