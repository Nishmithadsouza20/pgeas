# PGease — Technical Changelog

**Version:** 1.1.0  
**Date:** 2026-05-24  
**Base:** Initial commit `039c198`

---

## 1. Backend — Security Patches

### 1.1 Plaintext Password Exposure (Critical)
**File:** `backend/routes/companies.py`

- `reset_owner_password` endpoint previously returned the new password in plaintext inside the JSON response body (`"New password: {new_password}"`). Removed — endpoint now returns `{ "message": "Password reset successfully" }` only.
- `provision_client` function logged the raw owner password to stdout during company provisioning. Replaced with `[REDACTED]` in the console output.

### 1.2 OTP Leaked in API Response (High)
**File:** `backend/routes/auth.py`

- `forgot_password` endpoint returned the generated OTP directly in the JSON response under the key `otp_hint`, bypassing the purpose of one-time-password verification entirely. Key removed from response; OTP is emitted to server stdout only (development behaviour).

### 1.3 Insecure Direct Object Reference — Notification User ID (High)
**File:** `backend/routes/notifications_api.py`

- `create_notification` accepted a caller-supplied `user_id` from the request body via `data.get('user_id', uid)`, allowing any authenticated user to create notifications for any other user's account. Changed to hardcoded `uid` (JWT identity), so notifications are always created for the authenticated caller only.

### 1.4 Silent Exception Suppression (Low)
**File:** `backend/routes/notices.py`

- `mark_read` endpoint wrapped `INSERT OR IGNORE` inside a bare `except Exception: pass` block, swallowing all database errors silently. The try/except was removed; `INSERT OR IGNORE` handles duplicate-row conflicts at the SQL level without requiring exception handling.

---

## 2. Frontend — Bug Fixes

### 2.1 Missing `/forgot-password` Route
**Files:** `frontend/src/App.js`, `frontend/src/pages/ForgotPassword.jsx` *(new)*

- Login page contained a `<Link to="/forgot-password">` with no corresponding route, causing a blank page. Route added to `App.js`. New `ForgotPassword.jsx` implements a 3-step flow: email entry → OTP verification → new password → confirmation screen.

### 2.2 Undefined CSS Animations
**File:** `frontend/src/index.css`

- `App.js` referenced `@keyframes fadeIn` which was not defined in the stylesheet, causing the plan-change alert banner to have no animation. `fadeIn`, `shimmer`, `pulse`, `slideInRight`, and `slideUpMobile` keyframes added.

### 2.3 Undefined CSS Variables in ProtectedRoute
**File:** `frontend/src/components/ProtectedRoute.jsx`

- Component used `--text-muted` (not defined in the design system) and `.text-warning` / `.spinner-border` (Bootstrap classes, Bootstrap is not installed). Replaced with `var(--text-2)` and native CSS spinner matching the existing design system.

### 2.4 Hardcoded Year Array in Payments Filter
**File:** `frontend/src/pages/Payments.jsx`

- Payment year filter was a static array `[2023, 2024, 2025, 2026]`, which would break in 2027+. Replaced with dynamic generation: `Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i)`.

### 2.5 Stale Navigation State — Resident Modal
**File:** `frontend/src/pages/Residents.jsx`

- `location.state.openId` was read to auto-open a resident's edit modal on navigation, but the state was never cleared from the history entry. Pressing the browser Back button and returning would re-open the modal on every visit. Fixed by calling `navigate(location.pathname, { replace: true, state: {} })` immediately after consuming the state.

### 2.6 Silent Token Expiry in AuthContext
**File:** `frontend/src/context/AuthContext.js`

- `refreshUser` made a fetch to `/api/auth/me` but had no error handling. On a 401 (expired token), the error was swallowed silently, leaving the app in an authenticated-but-broken state. Fixed to call `logout()` on any non-OK response or network error.

### 2.7 All `alert()` / `confirm()` Calls Replaced
**Files:** `Payments.jsx`, `Rooms.jsx`, `Residents.jsx`, `Staff.jsx`, `MessMenu.jsx`, `Complaints.jsx`, `Notices.jsx`

- All native browser `alert()` and `confirm()` dialogs replaced with the new `ToastContext` notification system (see §3.1) and inline modal confirmations, consistent with the application's design language.

---

## 3. Frontend — New Features

### 3.1 Global Toast Notification System
**File:** `frontend/src/context/ToastContext.js` *(new)*

- Implemented a React Context-based toast system with four severity levels: `success`, `error`, `info`, `warning`. Toasts are rendered in a fixed bottom-right stack, auto-dismiss after 3500 ms, support click-to-dismiss, and animate in/out. `ToastProvider` wraps the app root in `App.js`. Usage: `const toast = useToast(); toast.success('message')`.

### 3.2 Forgot Password — Full OTP Flow
**File:** `frontend/src/pages/ForgotPassword.jsx` *(new)*

- Three-step wizard with animated step-progress indicator. Step 1: email submission. Step 2: 6-digit OTP input with digit-only keyfilter and auto-focus. Step 3: new password entry with show/hide toggle. Step 4: success screen. Calls `api.forgotPassword`, `api.verifyOtp`, `api.resetPassword`.

---

## 4. Frontend — UI / CSS Overhaul

### 4.1 Design System Tokens
**File:** `frontend/src/index.css`

New CSS custom properties added without changing any existing colour values:
- `--bg-active`, `--border-soft` — for active/hover states
- `--skeleton-from`, `--skeleton-to` — for loading skeleton shimmer
- `--accent-glow` — box-shadow glow matching the accent colour

### 4.2 Component Classes
**File:** `frontend/src/index.css`

New reusable classes added:
- `.empty-state` — centred empty-state block (icon circle + heading + description + CTA)
- `.skeleton` / `.shimmer` — animated loading placeholder for deferred content
- `.search-wrap` — search input with inlined icon via `::before`
- `.info-row` — key/value pair display for detail panels

### 4.3 Sidebar Active State
**File:** `frontend/src/index.css`

- Active nav item now renders a 3 px left-edge orange bar via `::before` pseudo-element, replacing the plain background highlight.

### 4.4 Button Hover Micro-interaction
**File:** `frontend/src/index.css`

- `.btn-primary` hover state lifts the button by 1 px (`translateY(-1px)`) and adds an accent-coloured `box-shadow` glow, giving tactile feedback.

### 4.5 Modal Animation
**File:** `frontend/src/index.css`

- Modal entry animation changed to a spring curve (`cubic-bezier(0.16, 1, 0.3, 1)`) for a more natural feel. On mobile viewports, modals render as bottom sheets and slide up from the bottom edge via `slideUpMobile` keyframe.

### 4.6 Navbar Enhancements
**File:** `frontend/src/components/Navbar.jsx`

- Page title now displays a coloured plan badge (Basic / Premium / Enterprise) next to the title for owner accounts.
- Date display includes the weekday (e.g., "Sat, 24 May 2026").

### 4.7 Login Page — No-Scroll Layout
**File:** `frontend/src/pages/Login.jsx`

- Left panel content reflow: heading reduced to 32 px, stats grid padding tightened, feature list converted to 2-column grid. Page now fits a standard 1080 p viewport without vertical scroll.
- Trust badges colour corrected from `#1e293b` (invisible on dark background) to `#475569`.
- Author credit rendered as an orange pill badge.

### 4.8 Empty States Standardised
**Files:** `Rooms.jsx`, `Residents.jsx`, `Payments.jsx`, `Staff.jsx`, `Visitors.jsx`, `Expenses.jsx`, `Complaints.jsx`, `Notices.jsx`

- All pages now use the `.empty-state` component class for consistent zero-data screens, including context-aware CTA buttons (e.g., "Add Room", "Add Staff") and filter-aware messaging.

---

## 5. Files Added

| File | Description |
|------|-------------|
| `frontend/src/pages/ForgotPassword.jsx` | Forgot-password OTP wizard |
| `frontend/src/context/ToastContext.js` | Global toast notification context |

## 6. Files Modified

| File | Change Category |
|------|----------------|
| `backend/routes/auth.py` | Security patch |
| `backend/routes/companies.py` | Security patch |
| `backend/routes/notifications_api.py` | Security patch |
| `backend/routes/notices.py` | Bug fix |
| `frontend/src/App.js` | Route + provider additions |
| `frontend/src/index.css` | UI overhaul |
| `frontend/src/context/AuthContext.js` | Bug fix |
| `frontend/src/components/Navbar.jsx` | UI enhancement |
| `frontend/src/components/Sidebar.jsx` | UI enhancement |
| `frontend/src/components/ProtectedRoute.jsx` | Bug fix |
| `frontend/src/pages/Login.jsx` | UI overhaul + bug fix |
| `frontend/src/pages/Payments.jsx` | Bug fix + toast |
| `frontend/src/pages/Rooms.jsx` | Bug fix + toast |
| `frontend/src/pages/Residents.jsx` | Bug fix + toast |
| `frontend/src/pages/Staff.jsx` | Bug fix + toast |
| `frontend/src/pages/MessMenu.jsx` | Bug fix + toast |
| `frontend/src/pages/Complaints.jsx` | Bug fix + toast |
| `frontend/src/pages/Notices.jsx` | Bug fix + toast |
| `frontend/src/pages/Visitors.jsx` | UI improvement |
| `frontend/src/pages/Expenses.jsx` | UI improvement |
| `docs/USER_GUIDE.md` | Documentation update |
| `README.md` | Documentation rewrite |

---

*PGease — College Project*
