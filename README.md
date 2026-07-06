# New Era Alumni Association Portal

A production-ready web application for managing an alumni association and providing transparent financial records to members.

---

## Features

- **Role-based access**: Administrator and Member roles
- **Member management**: Add, edit, search, filter, activate/deactivate, soft delete
- **Financial Ledger**: Monthly contributions per member across multiple financial years
- **Excel/CSV Import**: Upload historical records with validation and preview
- **Reports & Exports**: Excel exports and printable PDF of member statements, annual ledger, savings reports
- **Audit Logs**: Every admin action is logged with actor, timestamp, and details
- **Password management**: Default password, forced change on first login, admin-initiated resets
- **Security**: JWT auth (HTTP-only cookies), Argon2 password hashing, role middleware on every route

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (managed PostgreSQL) |
| DB Client | `@supabase/supabase-js` |
| Styling | Tailwind CSS |
| Forms | React Hook Form + Zod |
| Auth | JWT (jose) + Argon2 — custom, not Supabase Auth |
| File Handling | XLSX (SheetJS) |
| Notifications | react-hot-toast |

> **Note on auth:** This app uses its own phone-number + password login with JWT cookies (not Supabase Auth). Supabase is used purely as the Postgres database, accessed server-side via the Supabase JS client and the service role key — never from the browser.

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) project

### 2. Clone and Install

```bash
git clone <your-repo-url> new-era
cd new-era
npm install
```

### 3. Create the Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Once created, go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (not the `anon` key!) → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Run the Schema

Go to **SQL Editor** in your Supabase dashboard → **New query**, paste the contents of `supabase/schema.sql`, and run it. This creates all tables, enums, and indexes, and enables Row Level Security (locked down, since only the server-side service role key ever talks to the database).

### 5. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=change-this-to-a-very-long-random-string-in-production
DEFAULT_MEMBER_PASSWORD=NewEra2026!
NODE_ENV=development
```

### 6. Seed the Admin Account

```bash
npm run db:seed
```

This creates:
- Admin account: phone `08000000000`, password `NewEra2026!`
- Current financial year

### 7. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## First Login

1. Go to `http://localhost:3000/login`
2. Phone: `08000000000`
3. Password: `NewEra2026!`
4. You will be redirected to set a new password immediately

---

## Default Credentials

| Role | Phone | Default Password |
|------|-------|-----------------|
| Administrator | 08000000000 | NewEra2026! |

> **Security Note:** Change the default admin password immediately after your first login.

---

## Usage Guide

### Adding Members

1. Log in as Administrator
2. Go to **Members → Add Member**
3. Enter the member's full name and phone number
4. New member gets default password `NewEra2026!`
5. Share phone + default password with the member — they must change it on first login

### Managing the Ledger

1. Go to **Ledger**
2. Select the financial year and member
3. Click the **Edit** icon on any month row
4. Update the contribution figures and click **Save**

### Importing Historical Data

1. Go to **Import Data**
2. Download the Excel template to see the expected format
3. Fill in your data: Name, Phone, Year, Month, and contribution columns
4. Upload the file and review the preview
5. Confirm the import — rows are processed one at a time against Supabase, with a per-row error report

**Required columns:**
- `Name` — member full name
- `Phone` — member phone number (used to match/create members)
- `Year` — financial year (integer, e.g. 2023)
- `Month` — month number (1–12)

**Optional columns:**
- `Subscription`, `Savings`, `Interest`, `Loan Repayment`, `Social Fund`, `Hosting Fund`

### Generating Reports

1. Go to **Reports**
2. Select report type, financial year, and member (if applicable)
3. Click **Generate Report**
4. Export to Excel or Print to PDF

### Resetting a Member's Password

**Method 1 — Via Members list:**
- Go to Members → click the **Key** icon on any member row

**Method 2 — Via Admin Panel:**
- When a member submits a password reset request, it appears in **Admin → Password Resets**
- Click **Reset Password** to reset it to the default

The member will be required to change the password on their next login.

---

## Database Schema

```
members                 — Core member accounts
password_reset_requests — Password reset workflow
financial_years          — Year definitions (one active at a time)
ledger_entries           — Monthly contribution records
audit_logs                — Immutable admin action log
import_logs                — Import history and reports
```

Full DDL lives in `supabase/schema.sql`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (Project Settings → API). **Never expose this to the browser.** |
| `JWT_SECRET` | ✅ | Secret for signing JWTs (32+ chars in production) |
| `DEFAULT_MEMBER_PASSWORD` | ✅ | Default password for new members |
| `NODE_ENV` | — | `development` or `production` |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:seed` | Seed initial admin account and financial year |

---

## Production Deployment

### Security Checklist

- [ ] Set a strong `JWT_SECRET` (use `openssl rand -hex 32`)
- [ ] Change `DEFAULT_MEMBER_PASSWORD` to something non-default
- [ ] Use `NODE_ENV=production`
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is only set as a server-side env var (never `NEXT_PUBLIC_*`)
- [ ] Change the default admin password after deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard or:
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
vercel env add DEFAULT_MEMBER_PASSWORD
```

Then in the Vercel Dashboard, make sure those same four variables are set for the **Production** environment before redeploying.

### Deploy with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Mobile / WhatsApp WebView

The application is designed to work inside WhatsApp WebView:
- Mobile-first layout with large touch targets (48px min)
- Responsive sidebar (drawer on mobile)
- Large readable fonts (16px base)
- High-contrast color scheme

---

## License

MIT © New Era Alumni Association
