# FD Portal — Quick Start Guide

## Option A: Docker (recommended — no setup required)

> Works on any machine worldwide. Requires only Docker Desktop.

**Step 1 — Install Docker Desktop**
- Windows/Mac: https://www.docker.com/products/docker-desktop/
- Linux: `curl -fsSL https://get.docker.com | sh`

**Step 2 — Start everything with one command**

```bash
docker compose up --build
```

This will:
1. Start a PostgreSQL 15 database (password: `fdportal123`)
2. Run all database migrations automatically
3. Seed demo data (banks, users, sample deposits)
4. Start the Next.js app on http://localhost:3000

**Default login credentials (seeded automatically):**

| Role            | Email                    | Password               |
|-----------------|--------------------------|------------------------|
| Super Admin     | admin@fdportal.dev       | Admin@Password123!     |
| Finance Manager | manager@fdportal.dev     | Manager@Password123!   |
| Finance Officer | officer@fdportal.dev     | Officer@Password123!   |

**Stop the app:**
```bash
docker compose down        # keeps database data
docker compose down -v     # also deletes database data
```

---

## Option B: Local development (requires PostgreSQL)

### If you don't know your PostgreSQL password

Run this **as Administrator** in PowerShell (resets postgres password to `fdportal123`):

```powershell
.\scripts\reset-postgres-password.ps1
```

### Setup steps

```powershell
# 1. Install dependencies
npm install

# 2. Create the database (you will be prompted for password if reset didn't run)
.\scripts\setup-db.ps1

# 3. Run migrations and seed
npm run db:migrate:dev
npm run db:seed

# 4. Start the development server
npm run dev
```

App runs at http://localhost:3000

---

## Option C: Production deployment

### Vercel + Neon (free tier, worldwide)

1. Create a free Neon database at https://neon.tech → copy the connection string
2. Push code to GitHub
3. Import project at https://vercel.com/new
4. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` = your Neon connection string
   - `NEXTAUTH_SECRET` = run `openssl rand -base64 32` to generate
   - `NEXTAUTH_URL` = your Vercel app URL (e.g. `https://fdportal.vercel.app`)
5. Deploy — migrations run automatically on first request

### Railway (one-click, includes PostgreSQL)

1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Add a PostgreSQL plugin
4. Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` in Variables tab
5. Deploy

---

## Changing the production secret

Generate a secure secret:
```bash
openssl rand -base64 32
```
Set it as `NEXTAUTH_SECRET` in your environment. Never use the dev default in production.
