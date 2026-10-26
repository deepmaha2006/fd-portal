# Deployment Guide

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15+
- SMTP server (for email notifications)
- A secrets manager or environment variable injection (no `.env` files in production)

## Environment Variables

Copy `.env.example` and set all values. Critical variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string with SSL |
| `NEXTAUTH_SECRET` | Random 32+ byte hex string (`openssl rand -hex 32`) |
| `NEXTAUTH_URL` | Public app URL, must be `https://` in production |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for TLS) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `UPLOAD_DIR` | Absolute path for document storage |
| `APP_ENV` | Set to `production` to enable startup secret validation |

## Build and Deploy

```bash
# Install dependencies (production only)
npm ci --omit=dev

# Run database migrations
DATABASE_URL=... npx prisma migrate deploy

# Build Next.js
npm run build

# Start the server
npm start
```

## Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## Background Worker

The reminder processor must run as a separate process:

```bash
node -e "require('./src/server/workers/scheduler')"
```

Or add it to your process manager (PM2, systemd, or a Kubernetes CronJob).

## Health Check

`GET /api/health` — returns `200 OK` when the app is running. Wire this to your load balancer.

## Production Checklist

- [ ] `APP_ENV=production` set
- [ ] `NEXTAUTH_URL` uses `https://`
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] `NEXTAUTH_SECRET` is 32+ bytes, randomly generated
- [ ] `UPLOAD_DIR` is outside the web root and not publicly accessible
- [ ] Reverse proxy (nginx/Caddy) terminates TLS
- [ ] Database backups configured (see `docs/BACKUP_AND_RECOVERY.md`)
- [ ] Log rotation configured for application logs
- [ ] Monitoring and alerting set up for error rates and uptime
