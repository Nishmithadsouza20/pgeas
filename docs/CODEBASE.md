# PGease — Complete Codebase Explanation

> Every file, every library, what it does, and why it's there.

---

## Project Structure at a Glance

```
PGease/
├── backend/                  ← Python Flask API
│   ├── app.py                ← Entry point, registers all route blueprints
│   ├── database.py           ← SQLite connection, schema creation, multi-tenant logic
│   ├── seed.py               ← Master seed: creates 10 demo companies + 21 accounts
│   ├── seed_data.py          ← Alternative seed with richer fake data
│   ├── requirements.txt      ← Python dependencies
│   ├── .env                  ← Secrets (not in git)
│   ├── pgease.db             ← Platform-level SQLite database (auto-created)
│   ├── company_N.db          ← One per client, auto-created on provisioning
│   └── routes/               ← One Python file per feature area
│       ├── auth.py
│       ├── rooms.py
│       ├── residents.py
│       ├── payments.py
│       ├── complaints.py
│       ├── notices.py
│       ├── mess.py
│       ├── visitors.py
│       ├── maintenance.py
│       ├── gatepass.py
│       ├── invoices.py
│       ├── utilities.py
│       ├── deposits.py
│       ├── staff.py
│       ├── attendance.py
│       ├── payroll.py
│       ├── analytics.py
│       ├── reports.py
│       ├── meals.py
│       ├── enquiries.py
│       ├── notifications.py
│       ├── food.py
│       ├── expenses.py
│       ├── whatsapp.py
│       └── companies.py
│
├── frontend/                 ← React single-page application
│   ├── public/               ← Static HTML shell, favicon
│   └── src/
│       ├── App.js            ← Router config, layout shell, protected routes
│       ├── index.js          ← React DOM mount point
│       ├── index.css         ← Global design system, CSS variables
│       ├── pages/            ← One .jsx file per page/route (28 pages)
│       ├── components/       ← Shared UI components
│       │   ├── Sidebar.jsx
│       │   ├── Navbar.jsx
│       │   ├── NotificationBell.jsx
│       │   └── ProtectedRoute.jsx
│       ├── context/          ← React Context providers
│       │   ├── AuthContext.js
│       │   ├── ThemeContext.js
│       │   └── ToastContext.js
│       └── utils/
│           └── api.js        ← Centralized fetch wrapper with JWT injection
│
├── docs/                     ← Documentation
├── README.md
└── CHANGELOG.md
```

---

## Backend Libraries (`requirements.txt`)

### `Flask 3.0.3`
The web framework. Handles HTTP routing, request parsing, and response building. Every API endpoint is a Flask view function. Flask uses a blueprint system to split routes across multiple files.

```python
from flask import Flask, request, jsonify
app = Flask(__name__)
```

### `Flask-JWT-Extended 4.6.0`
Handles JSON Web Tokens for authentication. Provides:
- `create_access_token(identity=user_id)` — generates a signed JWT
- `@jwt_required()` decorator — blocks unauthenticated requests
- `get_jwt_identity()` — extracts user ID from the token inside a protected route

Tokens expire after 24 hours (configurable via `JWT_ACCESS_TOKEN_EXPIRES`).

### `Flask-CORS 4.0.0`
Enables Cross-Origin Resource Sharing. Without this, the browser blocks all requests from `http://localhost:3000` (React) to `http://localhost:5000` (Flask) because they're on different ports. CORS adds the required HTTP headers.

```python
from flask_cors import CORS
CORS(app, origins=["http://localhost:3000"])
```

### `bcrypt 4.1.2`
Password hashing. Never stores plain-text passwords. bcrypt is a slow hash designed to resist brute-force attacks.

```python
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
bcrypt.checkpw(password.encode(), hashed)  # verify
```

### `python-dotenv 1.0.1`
Loads environment variables from a `.env` file into `os.environ`. Keeps secrets (JWT secret, email credentials) out of source code.

```python
from dotenv import load_dotenv
load_dotenv()
os.getenv("SECRET_KEY")
```

### `smtplib` (Python standard library)
Sends emails via SMTP. Used for OTP delivery, billing receipts, and welcome emails. Configured against Gmail's SMTP server (port 587, STARTTLS).

### `sqlite3` (Python standard library)
Built-in SQLite interface. No external database server needed. The `database.py` module wraps this into a helper that opens connections, runs schema migrations, and returns query results as dictionaries.

---

## Backend File-by-File

### `app.py`
The Flask application factory and entry point.

- Creates the Flask app object
- Loads config from `.env` via `python-dotenv`
- Initializes `JWTManager`, `CORS`
- Imports and registers all 24 blueprint modules from `routes/`
- Defines the single health-check endpoint: `GET /api/health`
- Runs the dev server on port 5000 with `debug=True`

### `database.py`
The database layer. Has three core responsibilities:

**1. Platform DB connection (`get_platform_db()`):**
Returns a connection to `pgease.db` with WAL mode (Write-Ahead Logging for concurrent reads) and `row_factory = sqlite3.Row` so rows behave like dicts.

**2. Company DB connection (`get_company_db(company_id)`):**
Returns a connection to `company_{id}.db`. Creates the file if it doesn't exist and runs the full schema.

**3. Schema initialization:**
- `init_platform_db()` — creates all platform tables if they don't exist
- `init_company_db(conn)` — creates all operational tables (rooms, residents, payments, staff, etc.)

Both functions use `CREATE TABLE IF NOT EXISTS` so they're safe to call on every startup.

### `routes/auth.py`
Handles all authentication flows. Key patterns:

- Uses `bcrypt` to hash/verify passwords
- Uses `Flask-JWT-Extended` to issue tokens
- OTP is a 6-digit `random.randint(100000, 999999)` stored with an expiry timestamp
- Role assignment is purely email-based: compare against env vars

### `routes/companies.py`
The largest route file. Manages the multi-tenant system:

- Super admin CRUD for companies
- `provision()` — one atomic operation: create user → create company → create billing → send email
- Billing sub-routes with email triggers
- Owner's `my-settings` view
- All queries go to `pgease.db` (platform DB)

### `routes/*.py` (operational routes)
All other route files follow the same pattern:

```python
blueprint = Blueprint('feature', __name__)

@blueprint.route('/', methods=['GET'])
@jwt_required()
def get_items():
    user_id = get_jwt_identity()
    # look up user role from platform DB
    # look up company_id from platform DB
    # open company DB: get_company_db(company_id)
    # query and return results as JSON
```

Role enforcement is done inline — the function checks the user's role and returns `403` if unauthorized.

### `seed.py`
Comprehensive demo data generator. Creates:
- 1 super admin account
- 10 owner accounts (one per company type/plan combination)
- 10 resident accounts
- Rooms, payments, complaints, maintenance, staff, and more per company

Always run this before first launch. Re-running wipes and recreates everything.

---

## Frontend Libraries (`package.json`)

### `react 18.2.0` + `react-dom 18.2.0`
The UI framework. All UI is built as React components — functions that return JSX (HTML-like syntax). React manages the DOM, re-rendering only changed parts.

### `react-router-dom 6.21.0`
Client-side routing. Enables navigation between pages without full page reloads.

```jsx
<Routes>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/rooms" element={<Rooms />} />
</Routes>
```

`useNavigate()` and `<Link>` handle navigation. `useParams()` reads URL parameters.

### `bootstrap 5.3.2`
CSS framework. Provides pre-built component classes: cards, modals, tables, buttons, badges, forms. Used extensively — almost every page builds its layout from Bootstrap grid and component classes.

### `recharts 2.10.3`
Chart library built on D3 and React. Used in the Analytics and Dashboard pages.

- `BarChart` — revenue and payment-rate charts
- `AreaChart` — occupancy trend (filled line chart)
- `PieChart` + `Cell` — complaint breakdown, room status, food preference ratio
- `LineChart` — MRR trend on super admin dashboard
- `Tooltip`, `Legend`, `XAxis`, `YAxis` — standard chart chrome

### `react-scripts 5.0.1`
Create React App toolchain. Handles the full build pipeline: Babel (JSX → JS), Webpack (bundle), dev server with hot reload. `npm start` and `npm run build` both go through react-scripts.

---

## Frontend File-by-File

### `src/index.js`
The entry point. Mounts the React tree into `<div id="root">` in `public/index.html`. Wraps `<App>` with all three Context providers.

```jsx
<AuthProvider>
  <ThemeProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </ThemeProvider>
</AuthProvider>
```

### `src/App.js`
Defines all client-side routes using React Router v6. Wraps protected routes in `<ProtectedRoute>`. The layout shell (Sidebar + Navbar + content area) is rendered here; pages slot into the content area.

Route grouping:
- Public routes: `/login`, `/register`, `/forgot-password`
- Owner routes: `/rooms`, `/residents`, `/staff`, `/payroll`, etc.
- Resident routes: `/mess`, `/gatepass`, `/notices`, etc.
- Shared: `/dashboard`, `/payments`, `/complaints`, `/analytics`

### `src/index.css`
The design system. Defines CSS custom properties (variables) for the entire app:

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a2e;
  --accent: #667eea;
}
[data-theme="dark"] {
  --bg-primary: #0f0f23;
  --text-primary: #e0e0ff;
}
```

Switching `data-theme` on `<html>` is enough to flip the entire app to dark mode — no JS conditional rendering needed.

### `src/utils/api.js`
A centralized `fetch` wrapper. Every API call in the app goes through this file.

**What it does:**
1. Prepends `http://localhost:5000` to all paths
2. Reads the JWT from `localStorage` and adds `Authorization: Bearer <token>` header
3. If the response is `401 Unauthorized`, clears storage and redirects to `/login`
4. Returns parsed JSON or throws an error

This means individual page components just call `api.get('/residents')` without handling auth or base URLs.

### `src/context/AuthContext.js`
The global authentication state. Wraps the entire app and exposes:

- `user` — current user object (id, email, name, role)
- `company` — current owner's company details (plan, status, type)
- `token` — raw JWT string
- `login(email, password)` — calls the API, stores token, sets state
- `logout()` — clears token and state
- `refreshUser()` — re-fetches `/api/auth/me`
- `refreshCompany()` — re-fetches `/api/companies/my-settings`

A `useEffect` runs a `setInterval` every 30 seconds to poll both endpoints. If the plan or status changes (super admin updated the company), the context updates and `App.js` shows an upgrade banner.

### `src/context/ThemeContext.js`
Manages light/dark mode. Reads the saved preference from `localStorage` on init. Exposes `toggleTheme()`. On each toggle, writes the new value to `localStorage` and sets `data-theme` on `document.documentElement`.

### `src/context/ToastContext.js`
Global toast notifications. Exposes `showToast(message, type)`. Components call this after API operations (e.g., "Room added successfully"). The toast renders in a fixed position and auto-dismisses after 3 seconds.

### `src/components/ProtectedRoute.jsx`
A wrapper component that checks the current user's role against an `allowedRoles` prop. If the user isn't authenticated or doesn't have the right role, it redirects to `/login` or `/dashboard` respectively.

```jsx
<ProtectedRoute allowedRoles={['owner']}>
  <Staff />
</ProtectedRoute>
```

### `src/components/Sidebar.jsx`
The left navigation menu. Renders different menu items based on `user.role`:
- Super admin sees: Dashboard, Clients, Analytics, Plans
- Owner sees: all operational modules (filtered by plan)
- Resident sees: Dashboard, Payments, Complaints, Mess, Gate Pass, Notices, Maintenance

Plan-based hiding: Premium modules are hidden from Basic plan owners. The sidebar shows a lock icon and upgrade prompt instead.

### `src/components/Navbar.jsx`
Top bar. Shows the property name (or "PGease" for super admin), theme toggle button, notification bell, and user avatar with dropdown (Profile, Logout).

### `src/components/NotificationBell.jsx`
Polls `GET /api/notifications/unread-count` every 60 seconds. Shows a red badge with the count. Clicking opens a dropdown of the latest notifications.

### `src/pages/`
28 page components. Each follows the same pattern:

```jsx
function Rooms() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    api.get('/rooms').then(data => setRooms(data));
  }, []);

  // JSX: Bootstrap table/cards with CRUD modals
}
```

Pages use Bootstrap modals for create/edit forms. API calls are made in `useEffect` for initial load and in event handlers for mutations. After each mutation the list is re-fetched to stay in sync.

---

## Data Flow Through the Stack

```
User action in React component
        ↓
api.js: adds JWT header, sends fetch to localhost:5000
        ↓
Flask route function
        ↓
jwt_required() decorator verifies token signature
        ↓
get_jwt_identity() extracts user_id
        ↓
Platform DB: look up user role + company_id
        ↓
Company DB: run the actual query
        ↓
Return JSON response
        ↓
React component updates state → re-renders UI
```

---

## Key Patterns

### Multi-Tenant DB Lookup
Every operational route does this at the start:

```python
user_id = get_jwt_identity()
platform_conn = get_platform_db()
user = platform_conn.execute(
    "SELECT * FROM users WHERE id = ?", [user_id]
).fetchone()
company_id = user['company_id']
conn = get_company_db(company_id)
```

This ensures each owner only queries their own isolated database. The lookup adds one extra DB read per request.

### Role Guard Pattern
```python
if user['role'] not in ['owner', 'super_admin']:
    return jsonify({'error': 'Unauthorized'}), 403
```

### Frontend Role-Based Rendering
```jsx
{user.role === 'owner' && <button>Add Room</button>}
{user.role === 'customer' && <span>Your Room: {room.number}</span>}
```

### Upsert Pattern (Utilities, Meal Settings)
Some tables use `INSERT OR REPLACE` to handle create-or-update in one query, enforced by a `UNIQUE` constraint on the natural key:

```sql
INSERT OR REPLACE INTO utility_bills (room_id, month, year, electricity, water)
VALUES (?, ?, ?, ?, ?)
```

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SECRET_KEY` | Flask session signing | `pgease_secret` |
| `JWT_SECRET_KEY` | JWT signing key | `pgease_jwt` |
| `SUPER_ADMIN_EMAIL` | Which email gets super_admin role | `admin@pgease.com` |
| `OWNER_EMAIL` | Which email gets owner role | `owner@pgease.com` |
| `DATABASE_URL` | Platform DB filename | `pgease.db` |
| `MAIL_SERVER` | SMTP server | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USERNAME` | From address | (none) |
| `MAIL_PASSWORD` | App password for Gmail | (none) |

Email only works when `MAIL_USERNAME` and `MAIL_PASSWORD` are set. Without them the app still runs — email calls fail silently.
