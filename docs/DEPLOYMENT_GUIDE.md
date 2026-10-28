# Production Deployment Guide

## Agency SLA and Margin Leakage Tracker

---

### 1. Recommended Deployment Topology
- **Frontend**: Static SPA hosted on Cloudflare Pages, Vercel, AWS S3 + CloudFront, or Nginx.
- **Backend API**: Node.js service running on AWS ECS, Render, Fly.io, or DigitalOcean App Platform.
- **Database**: Managed PostgreSQL instance (AWS RDS, Supabase, Neon, or DigitalOcean Managed PostgreSQL).

---

### 2. Managed PostgreSQL Setup
1. Create a PostgreSQL 14+ database instance.
2. In the backend environment settings, configure the connection string:
   ```bash
   DATABASE_URL="postgresql://agency_db_user:YOUR_STRONG_PASSWORD@db-host.com:5432/agency_tracker?schema=public&sslmode=require"
   ```
3. Apply migrations to the PostgreSQL database:
   ```bash
   cd server
   # Switch schema provider or run prisma with PostgreSQL schema
   npx prisma db push --schema=prisma/schema.postgresql.prisma
   ```

---

### 3. Production Environment Variables
Set the following mandatory environment variables in your deployment dashboard:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment | `production` |
| `PORT` | API listen port | `5000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://...` |
| `JWT_SECRET` | 64-char random hex key | `<secure-random-token>` |
| `CORS_ORIGIN` | Allowed Frontend Origin | `https://tracker.youragency.com` |
| `SLACK_WEBHOOK_URL` | Slack alerting channel webhook | `https://hooks.slack.com/...` |
| `SMTP_HOST` | Production SMTP provider | `smtp.sendgrid.net` |
| `SMTP_USER` | SMTP username / API key | `apikey` |
| `SMTP_PASS` | SMTP secret password | `<sendgrid-key>` |
| `SMTP_FROM` | Sender email address | `alerts@youragency.com` |

---

### 4. Build Commands
```bash
# Backend Build:
cd server
npm install --omit=dev
npm run build
# Start command: node dist/index.js

# Frontend Build:
cd client
npm install
npm run build
# Publish directory: client/dist
```

---

### 5. Docker Deployment
A production `Dockerfile` can be used to run the backend and client:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm --prefix server install && npm --prefix server run build
RUN npm --prefix client install && npm --prefix client run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/server /app/server
COPY --from=builder /app/client/dist /app/client/dist
EXPOSE 5000
CMD ["node", "server/dist/index.js"]
```
