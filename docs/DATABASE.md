# PGease — Database Schema Reference

> Complete table schemas, column definitions, relationships, and the dual-database model.

---

## Dual-Database Architecture

PGease uses two types of SQLite databases:

| Database | File | Purpose |
|----------|------|---------|
| **Platform DB** | `pgease.db` | SaaS control plane — users, companies, billing, OTP, emails |
| **Company DB** | `company_{id}.db` | Per-property operational data — rooms, residents, payments, staff |

Every time a new client is provisioned, a new `company_{id}.db` file is created and the full schema is initialized inside it. This gives complete data isolation between tenants.

---

## Platform Database (`pgease.db`)

### `users`
All users across the entire platform (super admin, owners, residents).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `name` | TEXT NOT NULL | Display name |
| `email` | TEXT UNIQUE NOT NULL | Login identifier |
| `password_hash` | TEXT NOT NULL | bcrypt hash |
| `role` | TEXT | `super_admin` \| `owner` \| `customer` |
| `company_id` | INTEGER | FK → `pg_companies.id`; NULL for super admin |
| `is_verified` | INTEGER | 0 = unverified, 1 = email confirmed |
| `is_active` | INTEGER | 0 = deactivated |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Key behaviors:**
- Role is set at login time by comparing email against env vars, not stored directly
- `company_id` links an owner or resident to their property's operational DB
- `is_verified` must be 1 before the user can log in

---

### `pg_companies`
One row per client property.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `name` | TEXT NOT NULL | Property name |
| `type` | TEXT | `pg` \| `hostel` \| `lodge` \| `dormitory` \| `apartment` |
| `address` | TEXT | Full address |
| `city` | TEXT | |
| `phone` | TEXT | |
| `email` | TEXT | Owner contact email |
| `owner_name` | TEXT | |
| `plan` | TEXT | `basic` \| `premium` |
| `status` | TEXT | `active` \| `trial` \| `suspended` \| `cancelled` |
| `max_rooms` | INTEGER | 50 / 200 / unlimited based on plan |
| `logo_url` | TEXT | |
| `tagline` | TEXT | |
| `accent_color` | TEXT | Hex color for UI theming |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

### `otp_tokens`
Temporary OTP records for registration and password reset.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `user_id` | INTEGER | FK → `users.id` |
| `token` | TEXT | 6-digit OTP |
| `type` | TEXT | `verify` \| `reset` |
| `expires_at` | TIMESTAMP | 10 minutes from creation |
| `created_at` | TIMESTAMP | |

OTP records are deleted after successful verification.

---

### `subscription_payments`
Monthly billing records per client.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `company_id` | INTEGER | FK → `pg_companies.id` |
| `month` | INTEGER | 1–12 |
| `year` | INTEGER | e.g. 2025 |
| `amount` | REAL | Based on plan price |
| `status` | TEXT | `pending` \| `paid` \| `overdue` |
| `paid_date` | DATE | Set when marked paid |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | |

---

### `platform_emails`
Audit log of every system email sent.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `company_id` | INTEGER | Which client triggered it |
| `to_email` | TEXT | Recipient |
| `subject` | TEXT | |
| `body` | TEXT | |
| `sent_at` | TIMESTAMP | |
| `status` | TEXT | `sent` \| `failed` |

---

### `platform_leads`
SaaS lead/sales pipeline.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `name` | TEXT | |
| `email` | TEXT | |
| `phone` | TEXT | |
| `property_type` | TEXT | Interested property type |
| `city` | TEXT | |
| `notes` | TEXT | |
| `status` | TEXT | `new` \| `contacted` \| `demo` \| `converted` \| `lost` |
| `created_at` | TIMESTAMP | |

---

## Company Database (`company_{id}.db`)

Each company DB is created with the same schema. All tables below exist in every company DB with no cross-company references.

---

### `rooms`
Physical room inventory.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `room_number` | TEXT NOT NULL | e.g. "101", "A-02" |
| `floor` | INTEGER | |
| `type` | TEXT | `single` \| `double` \| `triple` \| `dormitory` |
| `rent_amount` | REAL | Monthly rent |
| `amenities` | TEXT | JSON array of strings |
| `status` | TEXT | `available` \| `occupied` \| `maintenance` |
| `description` | TEXT | |
| `created_at` | TIMESTAMP | |

---

### `residents`
Tenant profiles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `user_id` | INTEGER | FK → platform `users.id` |
| `name` | TEXT NOT NULL | |
| `phone` | TEXT | |
| `email` | TEXT | |
| `id_proof_type` | TEXT | `aadhar` \| `pan` \| `passport` \| `driving_license` |
| `id_proof_number` | TEXT | |
| `occupation` | TEXT | Student / working |
| `food_preference` | TEXT | `veg` \| `non-veg` \| `jain` |
| `room_id` | INTEGER | FK → `rooms.id`; NULL if unassigned |
| `move_in_date` | DATE | |
| `move_out_date` | DATE | Set on checkout |
| `emergency_contact_name` | TEXT | |
| `emergency_contact_phone` | TEXT | |
| `is_away` | INTEGER | 0/1 — temporary absence |
| `away_return_date` | DATE | Expected return when away |
| `notes` | TEXT | |
| `is_active` | INTEGER | 0 = moved out |
| `created_at` | TIMESTAMP | |

---

### `payments`
Monthly rent payment records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `resident_id` | INTEGER | FK → `residents.id` |
| `month` | INTEGER | 1–12 |
| `year` | INTEGER | |
| `amount` | REAL | Expected rent |
| `paid_amount` | REAL | Actual amount received |
| `penalty` | REAL | Late fee |
| `status` | TEXT | `pending` \| `paid` \| `partial` \| `overdue` |
| `payment_mode` | TEXT | `cash` \| `upi` \| `bank_transfer` \| `cheque` |
| `paid_date` | DATE | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | |

---

### `payment_transactions`
Gateway transaction log (for payment gateway integration).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `payment_id` | INTEGER | FK → `payments.id` |
| `transaction_id` | TEXT | Gateway reference |
| `amount` | REAL | |
| `gateway` | TEXT | `upi` \| `card` \| `netbanking` |
| `status` | TEXT | `success` \| `failed` \| `pending` |
| `gateway_response` | TEXT | Raw JSON from gateway |
| `created_at` | TIMESTAMP | |

---

### `utility_bills`
Electricity, water, and miscellaneous charges per room per month.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `room_id` | INTEGER | FK → `rooms.id` |
| `month` | INTEGER | |
| `year` | INTEGER | |
| `electricity` | REAL | Amount in rupees |
| `water` | REAL | |
| `misc` | REAL | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | |

**Unique constraint:** `(room_id, month, year)` — one bill per room per month. Enforces upsert semantics via `INSERT OR REPLACE`.

---

### `security_deposits`
Refundable deposits collected at move-in.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `resident_id` | INTEGER | FK → `residents.id` |
| `amount` | REAL | Deposit paid |
| `paid_date` | DATE | |
| `status` | TEXT | `held` \| `partial_refund` \| `refunded` |
| `refund_amount` | REAL | Amount refunded |
| `refund_date` | DATE | |
| `notes` | TEXT | |

---

### `expenses`
Property operational costs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `category` | TEXT | `maintenance` \| `electricity` \| `water` \| `grocery` \| `salary` \| `misc` |
| `description` | TEXT | |
| `amount` | REAL | |
| `expense_date` | DATE | |
| `payment_mode` | TEXT | `cash` \| `cheque` \| `online` |
| `receipt_number` | TEXT | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | |

---

### `invoices`
Aggregated monthly billing view per resident (computed, not stored raw).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `resident_id` | INTEGER | |
| `month` | INTEGER | |
| `year` | INTEGER | |
| `rent_amount` | REAL | From room |
| `utility_amount` | REAL | Electricity + water + misc |
| `penalty_amount` | REAL | From payment record |
| `deposit_held` | REAL | Reference only |
| `total_amount` | REAL | Sum of above |
| `status` | TEXT | `draft` \| `sent` \| `paid` |
| `created_at` | TIMESTAMP | |

---

### `staff`
Property employees.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `name` | TEXT NOT NULL | |
| `role` | TEXT | `manager` \| `security` \| `housekeeping` \| `cook` \| `maintenance` |
| `phone` | TEXT | |
| `email` | TEXT | |
| `salary` | REAL | Monthly gross |
| `shift` | TEXT | `morning` \| `evening` \| `night` |
| `join_date` | DATE | |
| `address` | TEXT | |
| `id_proof` | TEXT | |
| `status` | TEXT | `active` \| `inactive` |
| `created_at` | TIMESTAMP | |

---

### `staff_attendance`
Daily attendance records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `staff_id` | INTEGER | FK → `staff.id` |
| `date` | DATE | |
| `status` | TEXT | `present` \| `absent` \| `leave` |
| `check_in` | TIME | Optional |
| `check_out` | TIME | Optional |
| `notes` | TEXT | |

**Unique constraint:** `(staff_id, date)` — prevents duplicate entries per day.

---

### `payroll`
Monthly salary records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `staff_id` | INTEGER | FK → `staff.id` |
| `month` | INTEGER | |
| `year` | INTEGER | |
| `basic_salary` | REAL | Copied from staff.salary at generation time |
| `bonus` | REAL | Default 0 |
| `deductions` | REAL | Default 0 |
| `net_salary` | REAL | basic + bonus − deductions |
| `status` | TEXT | `pending` \| `paid` |
| `paid_date` | DATE | |
| `notes` | TEXT | |

---

### `maintenance_requests`
Work order tickets.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `resident_id` | INTEGER | Who raised it |
| `room_id` | INTEGER | FK → `rooms.id` |
| `title` | TEXT | |
| `description` | TEXT | |
| `category` | TEXT | `plumbing` \| `electrical` \| `furniture` \| `appliance` \| `cleaning` \| `other` |
| `priority` | TEXT | `low` \| `medium` \| `high` \| `urgent` |
| `status` | TEXT | `open` \| `in_progress` \| `resolved` \| `closed` |
| `assigned_to` | TEXT | Staff name (free text) |
| `estimated_cost` | REAL | |
| `actual_cost` | REAL | |
| `notes` | TEXT | Owner response |
| `created_at` | TIMESTAMP | |
| `resolved_at` | TIMESTAMP | |

---

### `complaints`
Resident grievances.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `resident_id` | INTEGER | |
| `category` | TEXT | `maintenance` \| `food` \| `noise` \| `cleanliness` \| `security` \| `other` |
| `subject` | TEXT | |
| `description` | TEXT | |
| `priority` | TEXT | `low` \| `medium` \| `high` \| `urgent` |
| `status` | TEXT | `open` \| `in_progress` \| `resolved` \| `closed` |
| `response` | TEXT | Owner reply |
| `created_at` | TIMESTAMP | |
| `resolved_at` | TIMESTAMP | |

---

### `notices`
Property-wide announcements.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `title` | TEXT | |
| `content` | TEXT | |
| `category` | TEXT | `general` \| `maintenance` \| `payment` \| `event` \| `emergency` \| `food` |
| `is_active` | INTEGER | 1 = visible to residents |
| `is_important` | INTEGER | 1 = highlighted |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

### `notice_reads`
Tracks which residents have read each notice.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `notice_id` | INTEGER | FK → `notices.id` |
| `user_id` | INTEGER | Platform user ID |
| `read_at` | TIMESTAMP | |

**Unique constraint:** `(notice_id, user_id)`.

---

### `visitors`
Guest entry/exit log.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `resident_id` | INTEGER | Resident being visited |
| `visitor_name` | TEXT | |
| `visitor_phone` | TEXT | |
| `purpose` | TEXT | |
| `id_proof_type` | TEXT | |
| `in_time` | TIMESTAMP | Check-in |
| `out_time` | TIMESTAMP | NULL = still inside |
| `notes` | TEXT | |

---

### `gate_passes`
Short-term exit permits.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `resident_id` | INTEGER | |
| `destination` | TEXT | |
| `purpose` | TEXT | |
| `out_time` | TIMESTAMP | When leaving |
| `expected_return` | TIMESTAMP | |
| `actual_return` | TIMESTAMP | Set on return |
| `status` | TEXT | `pending` \| `approved` \| `rejected` \| `returned` |
| `approved_by` | TEXT | Owner name |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | |

---

### `mess_menu`
Weekly food menu.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `day_of_week` | INTEGER | 0=Monday … 6=Sunday |
| `meal_type` | TEXT | `breakfast` \| `lunch` \| `dinner` |
| `items` | TEXT | Comma-separated dish names |
| `is_vegetarian` | INTEGER | 1 = all veg |
| `week_offset` | INTEGER | 0 = current week, -1 = last week |
| `created_at` | TIMESTAMP | |

---

### `meal_attendance`
Daily meal consumption records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `resident_id` | INTEGER | |
| `date` | DATE | |
| `breakfast` | INTEGER | 1 = had breakfast |
| `lunch` | INTEGER | |
| `dinner` | INTEGER | |
| `created_at` | TIMESTAMP | |

**Unique constraint:** `(resident_id, date)`.

---

### `meal_settings`
Per-meal pricing configuration.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `breakfast_price` | REAL | |
| `lunch_price` | REAL | |
| `dinner_price` | REAL | |
| `updated_at` | TIMESTAMP | |

Single-row table (only one record ever exists).

---

### `notifications_log`
Email/SMS/WhatsApp send history.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `type` | TEXT | `email` \| `sms` \| `whatsapp` |
| `recipient` | TEXT | Phone or email |
| `message` | TEXT | |
| `status` | TEXT | `sent` \| `failed` |
| `sent_at` | TIMESTAMP | |

---

### `notifications`
In-app notification inbox.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `user_id` | INTEGER | Recipient (platform user ID) |
| `title` | TEXT | |
| `message` | TEXT | |
| `type` | TEXT | `info` \| `success` \| `warning` \| `error` |
| `is_read` | INTEGER | 0 = unread |
| `created_at` | TIMESTAMP | |

---

### `enquiries`
Prospective tenant leads.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `name` | TEXT | |
| `phone` | TEXT | |
| `email` | TEXT | |
| `room_type` | TEXT | Interest |
| `budget` | REAL | Monthly budget |
| `source` | TEXT | `walk_in` \| `online` \| `referral` \| `call` |
| `status` | TEXT | `new` \| `contacted` \| `visited` \| `converted` \| `lost` |
| `follow_up_date` | DATE | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | |

---

### `food_inventory`
Stock tracking for mess/kitchen supplies.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | |
| `item_name` | TEXT | |
| `category` | TEXT | `grains` \| `vegetables` \| `dairy` \| `spices` \| `beverages` \| `other` |
| `quantity` | REAL | |
| `unit` | TEXT | `kg` \| `litre` \| `pieces` \| `packets` |
| `min_quantity` | REAL | Low-stock threshold |
| `cost_per_unit` | REAL | |
| `supplier` | TEXT | |
| `last_updated` | TIMESTAMP | |

Items where `quantity < min_quantity` are flagged as low-stock in the UI.

---

## Key Constraints Summary

| Table | Unique Constraint | Purpose |
|-------|-----------------|---------|
| `users` | `email` | One account per email |
| `notice_reads` | `(notice_id, user_id)` | Each user reads a notice once |
| `staff_attendance` | `(staff_id, date)` | One attendance record per staff per day |
| `meal_attendance` | `(resident_id, date)` | One meal record per resident per day |
| `utility_bills` | `(room_id, month, year)` | One bill per room per month |

---

## Database Pragmas Applied

```sql
PRAGMA journal_mode=WAL;       -- concurrent reads while writing
PRAGMA foreign_keys=ON;        -- enforce FK constraints
PRAGMA busy_timeout=10000;     -- wait 10s if DB is locked
```

WAL (Write-Ahead Logging) mode is especially important when the Flask dev server runs with multiple threads — without it, simultaneous requests can cause `database is locked` errors.
