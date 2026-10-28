# Environment Setup and Local Development Guide

## Agency SLA and Margin Leakage Tracker

---

### Prerequisites
- Node.js 20+ or 22+ (tested on Node.js v22.20.0).
- npm 10+.
- Optional: PostgreSQL 14+ for production environments (SQLite supported for immediate local execution).

---

### 1. Installation
Clone the repository and install dependencies:
```bash
# Install root orchestrator dependencies
npm install

# Install server backend dependencies
cd server
npm install

# Install client frontend dependencies
cd ../client
npm install
cd ..
```

---

### 2. Environment Configuration
Copy `.env.example` into `server/.env`:
```bash
cp .env.example server/.env
```
Default local values:
```ini
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=dev_super_secret_jwt_key_agency_tracker_2026
JWT_EXPIRES_IN=24h
DATABASE_URL=file:./dev.db
```

---

### 3. Database Initialization & Demo Seeding
Initialize the database schema and populate tagged demo records:
```bash
# Push schema to local database
cd server
npx prisma db push

# Seed realistic demo agency dataset
npm run prisma:seed
```

**Pre-seeded Demo Personas (`Password123!` for all)**:
- **Agency Owner / Director**: `owner@agency.io`
- **Delivery Manager**: `manager@agency.io`
- **Senior Recruiter**: `recruiter1@agency.io`
- **Executive Recruiter**: `recruiter2@agency.io`
- **Finance Lead**: `finance@agency.io`

---

### 4. Running Development Servers
To run both backend API (port 5000) and frontend client (port 5173):
```bash
# From workspace root:
npm run dev
```
Or independently:
```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev
```

Visit the dashboard in your browser: `http://localhost:5173`.

