# PGease — User Guide

A complete walkthrough for all three roles: **Super Admin**, **Owner**, and **Resident**.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [How Onboarding Works](#2-how-onboarding-works)
3. [Super Admin Guide](#3-super-admin-guide)
4. [Owner Guide](#4-owner-guide)
5. [Resident Guide](#5-resident-guide)
6. [Login & Access](#6-login--access)
7. [FAQ](#7-faq)

---

## 1. System Overview

PGease has **three user roles**, each with a separate portal:

| Role | Who They Are | Has Subscription Plan? | How They Get Access |
|------|-------------|----------------------|---------------------|
| **Super Admin** | PGease platform operator | No | Created by `seed.py` |
| **Owner** | PG / hostel / lodge owner | **Yes** (Basic / Premium / Enterprise) | Provisioned by Super Admin |
| **Resident** | Tenant / guest / student | **No** — lives inside an owner's property | Added by their Owner |

> The subscription plan (Basic / Premium / Enterprise) belongs to the **owner's company**, not to individual residents. It controls how many rooms the owner can manage and which features they can access.

> **Important:** The public Register page (`/register`) creates an account with no property attached. It is not used in normal operation. All accounts are created through the flows described below.

---

## 2. How Onboarding Works

```
Super Admin
    │
    ├─► Adds a new Client (Owner) from Platform Console
    │       → Owner gets email + password to log in
    │
Owner (logs in)
    │
    ├─► Goes to Residents → Add Resident
    │       → Fills in name, email, password
    │       → Resident can now log in to the Resident Portal
    │
Resident (logs in)
    └─► Sees their own dashboard: payments, complaints, gate pass, notices
```

---

## 3. Super Admin Guide

**Login:** `admin@pgease.com` / `Admin@123`

### 3.1 Viewing the Platform Dashboard

After login the Super Admin lands on the **Platform Home** (`/dashboard`).

![Screenshot: Super Admin Dashboard](screenshots/01_superadmin_dashboard.png)

The dashboard shows:
- Total clients, active clients, trial clients
- Monthly Recurring Revenue (MRR)
- Recent client activity feed
- Client status breakdown (active / trial / suspended)

---

### 3.2 Adding a New Owner (Client Onboarding)

This is how a new PG owner gets their account.

**Steps:**

1. Click **Platform Home** in the sidebar
2. Switch to the **Clients** tab
3. Click **+ Add Client**

![Screenshot: Add Client button on Clients tab](screenshots/02_superadmin_clients_tab.png)

4. Fill in the form:

| Field | Example |
|-------|---------|
| Company Name | Sunrise PG Homes |
| Owner Name | Rajesh Kumar |
| Owner Email | rajesh@sunrisepg.com |
| Phone | 9876540000 |
| City | Bangalore |
| Address | 12 MG Road |
| Property Type | PG / Hostel / Lodge / Dormitory / Apartment |
| Plan | Basic / Premium / Enterprise |
| Status | Active / Trial |
| Total Rooms | 30 |

![Screenshot: Add Client form](screenshots/03_superadmin_add_client_form.png)

5. Click **Save**
6. The system creates:
   - A company record in the platform DB
   - An owner login account with the email and a default password
   - An isolated company database

> **Default owner password when created from Platform Console:** Set by the Super Admin in the form, or the owner uses Forgot Password to set their own.

---

### 3.3 Managing Existing Clients

From the **Clients** tab you can:
- **Edit** a client — change plan, status, contact info
- **Suspend** a client — they can no longer log in
- **View** subscription billing status

![Screenshot: Client list with edit/suspend actions](screenshots/04_superadmin_client_list.png)

---

### 3.4 Billing & Invoices

From the **Platform Home → Clients** tab, each client row shows payment status.

The Super Admin can:
- Generate a monthly invoice for a client
- Mark an invoice as paid
- View billing history

---

### 3.5 Analytics

**Analytics** (`/analytics`) shows platform-level charts:
- MRR trend over 12 months
- Plan distribution (Basic / Premium / Enterprise split)
- City-wise client breakdown

![Screenshot: Super Admin Analytics page](screenshots/05_superadmin_analytics.png)

---

## 4. Owner Guide

**Example login:** `owner.pg.premium@pgease.com` / `Owner@123`

### 4.1 Dashboard

After login the owner sees the **Property Dashboard** (`/dashboard`):
- Occupancy rate, total rooms, occupied, vacant
- Revenue this month
- Recent payments
- Pending complaints
- Occupancy trend chart

![Screenshot: Owner Dashboard](screenshots/06_owner_dashboard.png)

---

### 4.2 Adding a New Resident (with Login Access)

This is the primary way to onboard a new resident.

**Steps:**

1. Go to **Residents** in the sidebar
2. Click **+ Add Resident** (top-right)

![Screenshot: Residents page with Add button](screenshots/07_owner_residents_list.png)

3. Fill in the form:

| Field | Notes |
|-------|-------|
| Full Name | Required |
| Email Address | This becomes the resident's login email |
| **Login Password** | Optional — if filled, resident can log in to the portal |
| **Confirm Password** | Must match the password above |
| Phone Number | |
| Assign Room | Select an available room |
| Occupation | Student / IT Professional / etc. |
| Food Preference | Veg / Non-veg / Jain / Vegan |
| ID Proof Type | Aadhar / Passport / etc. |
| Move-in Date | |
| Emergency Contact | |

![Screenshot: Add Resident form with password fields](screenshots/08_owner_add_resident_form.png)

4. Click **Save Resident**

> **If you leave the password blank:** The resident record is created (for tracking), but they cannot log in. You can always create their login later by removing and re-adding them, or via Forgot Password on the login screen.

> **If you fill in the password:** The resident can immediately log in at `/login` using their email and the password you set.

---

### 4.3 Managing Rooms

Go to **Rooms** in the sidebar.

- **Add a room** — set room number, floor, type, rent, amenities
- **Assign a resident** — change a room from Vacant to Occupied
- **Mark as maintenance** — temporarily remove a room from availability

![Screenshot: Rooms page](screenshots/09_owner_rooms.png)

---

### 4.4 Collecting Payments

Go to **Payments** in the sidebar.

- View all resident payment records (month-wise)
- Mark a payment as **Paid**
- See pending and overdue payments highlighted

![Screenshot: Payments page](screenshots/10_owner_payments.png)

---

### 4.5 Invoices & Deposits

- **Invoices** (`/invoices`) — generate monthly rent invoices per resident
- **Deposits** (`/deposits`) — track security deposits; mark as refunded on checkout

---

### 4.6 Staff & Payroll

| Section | What it does |
|---------|-------------|
| **Staff** | Add / edit staff (warden, cook, security, cleaner) |
| **Attendance** | Mark daily staff attendance (present / absent / late) |
| **Payroll** | Generate monthly salary slips based on attendance |

---

### 4.7 Complaints & Notices

- **Complaints** — residents submit issues; owner responds and changes status (open → in-progress → resolved)
- **Notices** — post announcements visible to all residents (payment reminders, water supply, rules)

---

### 4.8 Gate Pass

Available for PG / Hostel / Dormitory property types.

- Residents request a gate pass (exit time, reason, return time)
- Owner approves or rejects from the Gate Pass page

---

### 4.9 Mess Menu & Meal Attendance

Available for PG / Hostel / Dormitory.

- **Mess Menu** — set weekly breakfast / lunch / dinner menu
- **Meal Attendance** — mark which residents had each meal (for billing or tracking)

---

### 4.10 Your Subscription Plan

Go to **Settings** (`/settings`) to see:
- Your current plan (Basic / Premium / Enterprise)
- What features are included
- What features are locked (and what plan unlocks them)
- Monthly subscription amount

![Screenshot: Owner Settings — Plan section](screenshots/11_owner_settings_plan.png)

---

## 5. Resident Guide

**Example login:** `resident.pg.premium@pgease.com` / `Resident@123`

> The resident portal is accessible only if the owner created the account with a password.

### 5.1 My Dashboard

After login, the resident sees:

- Their room number and rent amount
- Recent payment status
- Active complaints
- Latest notices from the owner

![Screenshot: Resident Dashboard](screenshots/12_resident_dashboard.png)

---

### 5.2 My Payments

- See all monthly rent records
- Check which months are paid / pending / overdue

![Screenshot: Resident Payments page](screenshots/13_resident_payments.png)

---

### 5.3 Raising a Complaint

1. Go to **Complaints**
2. Click **+ New Complaint**
3. Select category (electrical / plumbing / WiFi / cleanliness / other)
4. Describe the issue
5. Set priority (high / medium / low)
6. Submit

The owner sees it on their Complaints page and can respond.

---

### 5.4 Requesting a Gate Pass

1. Go to **Gate Pass**
2. Click **+ Request Gate Pass**
3. Fill in purpose, exit time, expected return
4. Submit — owner approves or rejects

---

### 5.5 Mess Menu & Notices

- **Mess Menu** — view the weekly food menu set by the owner
- **Notices** — read announcements posted by the owner

---

## 6. Login & Access

### Login URL
`http://localhost:3000/login`

### How each role reaches their portal

| Role | What they see after login |
|------|--------------------------|
| Super Admin | Platform Console (all clients, billing, analytics) |
| Owner | Property Management portal (rooms, residents, payments…) |
| Resident | My Space portal (payments, complaints, gate pass…) |

### Forgot Password

1. Click **Forgot password?** on the login page
2. Enter the registered email
3. Check the **backend console window** for the OTP (no email server is configured)
4. Enter the OTP to reset the password

---

## 7. FAQ

**Q: A resident forgot their password. What do I do?**
They use Forgot Password on the login page. The OTP appears in the backend terminal.

**Q: Can a resident sign up themselves?**
No. The owner must add them from the Residents page and set a password. The public Register page (`/register`) creates accounts with no property attached and should not be used.

**Q: How do I add a new property owner as Super Admin?**
Go to Platform Home → Clients tab → click + Add Client. Fill the form — this creates both the company and the owner's login account.

**Q: What is the difference between Basic, Premium, and Enterprise?**

| Plan | Price | Rooms | Extra features |
|------|-------|-------|---------------|
| Basic | ₹2,999/mo | Up to 50 | Core management, complaints, visitors, gate pass |
| Premium | ₹4,999/mo | Up to 200 | + Analytics, invoices, staff & payroll, deposits |
| Enterprise | ₹7,999/mo | Unlimited | + Priority support, food inventory, full reports |

**Q: How do I re-seed the demo data?**
```bash
cd backend
python seed.py
```
This wipes all existing data and creates fresh demo accounts.

---

*PGease — College Project by Bhuvan Mahadev*
