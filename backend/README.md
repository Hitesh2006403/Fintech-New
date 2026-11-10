# Uncertain Income Planner — Backend API Architecture

This directory houses the complete backend service for **Uncertain Income Planner**, built with Node.js and Express.js with full user isolation, cryptographic session management, and Supabase Cloud PostgreSQL integration.

---

## 1. Directory Structure

```text
backend/
├── server.js          # Express API server entry point, CORS, session middleware, and REST endpoints
├── index.js           # Module alias forwarding to server.js
├── supabase.js        # Supabase Cloud client initialization, URL sanitization, and health diagnostics
├── auth.js            # Authentication logic, Google OAuth verification, password hashing (scrypt)
├── db.js              # User-isolated persistence engine, benchmark demo datasets, and dual-sync layer
├── README.md          # Backend documentation and API reference
├── scripts/
│   └── migrate_json_to_supabase.js # Non-destructive migration script with timestamped backups
└── data/              # Local isolated data store partitions
    ├── backups/       # Timestamped migration backups (git-ignored)
    ├── financials.json # User-scoped financial datasets (incomes, bills, savings, scenarios)
    ├── sessions.json   # Active cryptographic sessions
    └── users.json      # Registered users, credential hashes, and OAuth IDs
```

---

## 2. Supabase Cloud Integration

The backend supports **Supabase Cloud PostgreSQL** with automatic URL sanitization and non-destructive offline fallback.

### Environment Variables (`backend/.env`)

```env
PORT=3001
FRONTEND_URL=http://localhost:5174

# Supabase Cloud Project Configuration
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-publishable-or-anon-key>
# Optional: SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> (server-side only, bypasses RLS)
```

> **Note**: Even if you copy the URL with a trailing `/rest/v1/`, `backend/supabase.js` automatically strips it to the base URL required by the official `@supabase/supabase-js` client.

---

## 3. Core Modules

### `backend/server.js` (or `backend/index.js`)
The main server application running on `http://localhost:3001` (proxied by Vite at `/api`).
- **CORS & Credentials**: Allows credentials from `http://localhost:5174` and `http://localhost:5173`.
- **Authentication Middleware**: Supports both HttpOnly `session_token` cookies and `Authorization: Bearer <token>` headers.
- **REST Endpoints**:
  - `GET /api/health` — Service health check.
  - `GET /api/database/status` — Operational status, Supabase Cloud connection state, and diagnostics.
  - `GET /api/financials` — Current user's isolated financial dataset.
  - `PUT /api/preferences` — Updates starting balance, safety buffer, and horizon.
  - `POST /api/incomes`, `PUT /api/incomes/:id`, `DELETE /api/incomes/:id` — Income management.
  - `POST /api/expenses`, `PUT /api/expenses/:id`, `DELETE /api/expenses/:id` — Bills & cash expenses.
  - `PUT /api/savings`, `POST /api/savings/deposit` — Lean-week savings goals & deposits.
  - `PUT /api/notifications/:id/read`, `POST /api/notifications/read-all`, `DELETE /api/notifications` — Alert management.
  - `POST /api/scenarios` — Preserves hypothetical payment delay simulations.
  - `POST /api/demo/reset` — Resets current account to benchmark demo data.
  - `POST /api/demo/clear` — Clears all records for a clean fresh start.

### `backend/supabase.js`
- Initializes the official `@supabase/supabase-js` client with credentials loaded from `backend/.env`.
- Cleans and formats URLs automatically.
- Provides `testSupabaseCloudConnection()` for non-blocking health checks and diagnostic error code inspection.

### `backend/auth.js`
- **Google OAuth**: Verifies Google Identity Services ID tokens via official `google-auth-library` `OAuth2Client`.
- **Account Linking**: Securely links Google identities with existing local passwords.
- **Password Security**: Zero plaintext storage; hashes passwords with Node `crypto.scryptSync` with random 16-byte salts.
- **Sanitization**: Filters out password hashes, tokens, and sensitive keys from API responses.

### `backend/db.js`
- **User-Isolated Storage**: Partitioned per `userId`. User A's incomes, bills, and balances are physically segregated from User B.
- **Dual Persistence Bridge**: Synchronously updates local JSON and in-memory caches for 0ms latency, while asynchronously syncing changes to Supabase Cloud when connected.
- **Resilient Fallback**: If Supabase Cloud encounters a network interruption or permission restriction (Postgres 42501), the application seamlessly continues functioning via local JSON storage without user-facing failures.

---

## 4. Database Setup & Migration

### Step 1: Execute SQL Schema in Supabase
Run the contents of `supabase/schema.sql` in the **SQL Editor** of your Supabase Cloud Dashboard. This sets up:
- Profiles table (`public.profiles`) with `TEXT PRIMARY KEY` supporting custom user IDs.
- User preferences, incomes, expenses, savings goals, notifications, and scenarios tables.
- Performance indexes on dates and statuses.
- Schema grants resolving PostgreSQL `42501 permission denied` for `anon`, `authenticated`, and `service_role`.
- Row Level Security (RLS) policies.

### Step 2: Run the Safe Migration Script
To migrate existing data from `backend/data/` to Supabase Cloud:
```bash
node backend/scripts/migrate_json_to_supabase.js
```
The script will:
1. Automatically create an immutable timestamped backup in `backend/data/backups/`.
2. Upsert existing users and all user-isolated financial records into Supabase PostgreSQL.
3. Keep the original JSON files intact without data loss.

---

## 5. Running the Backend Locally

From project root:
```bash
npm run backend
# or
npm test
```

From inside the `backend` folder:
```bash
cd backend
node server.js
```

The server automatically binds to port `3001` and logs:
```text
[FinSight Auth Server] Running on http://localhost:3001
[FinSight Auth Server] Authorized origin: http://localhost:5174
[FinSight Auth Server] Google Client ID loaded: YES
[FinSight Auth Server] Supabase Cloud configured: YES (https://<project-ref>.supabase.co)
```

---

## 6. Deploying Backend to Vercel as a Separate Service

The backend is fully configured for Vercel's Serverless Node.js runtime.

### Step 1: Import in Vercel
1. In your **Vercel Dashboard**, click **Add New...** > **Project**.
2. Select your repository: `Hitesh2006403/Fin-Tech-`.
3. In **Project Settings**:
   - **Root Directory**: Click "Edit" and choose `backend`.
   - **Framework Preset**: Leave as `Other`.
   - **Build & Output Settings**: Leave defaults (no custom build command needed; `backend/package.json` and `backend/vercel.json` handle everything automatically).

### Step 2: Configure Environment Variables in Vercel
In the Vercel project settings (**Settings** > **Environment Variables**), add:

| Variable Name | Required | Purpose / Example |
| :--- | :---: | :--- |
| `SUPABASE_URL` | **Yes** | Your Supabase project URL (e.g. `https://<ref>.supabase.co`) |
| `SUPABASE_PUBLISHABLE_KEY` | **Yes** | Supabase anon or publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | *Optional* | Supabase service-role secret key (bypasses RLS) |
| `FRONTEND_URL` | **Yes** | URL of your deployed frontend (e.g. `https://finsight-client.vercel.app`) |
| `APP_ORIGIN` | *Optional* | Additional frontend origin (can be comma-separated) |
| `ADMIN_EMAILS` | *Optional* | Comma-separated admin whitelist (`hiteshav2006@gmail.com,admin@finsight.internal`) |
| `GOOGLE_CLIENT_ID` | *Optional* | Custom Google OAuth Client ID |
| `NODE_ENV` | *Optional* | Set to `production` |

### Step 3: Link Deployed Backend to Frontend
In your separate frontend Vercel deployment (or `.env.production`):
```env
VITE_API_URL=https://<your-backend-project>.vercel.app
```
All frontend services (`authService`, `apiService`, `adminService`) will automatically route API requests directly to this URL.
