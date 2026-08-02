# Leasify - Commercial Rental Management System

Leasify is a production-ready, full-stack commercial-grade SaaS Rental Management System designed for property owners and tenants. It features a modern, premium glassmorphism user interface tailored for both dark and light modes, with dynamic animations, inline widgets, geocoded map integration, automatic late-fee invoice calculation, document vaults, and sandbox payment integrations.

---

## Technical Stack

*   **Frontend**: React.js (Vite), Tailwind CSS, React Router, Axios, React Hook Form, Framer Motion, React Hot Toast, Chart.js.
*   **Backend**: Node.js, Express.js, MongoDB Atlas (Mongoose), JWT Session (Access + Refresh tokens), bcrypt, Multer, Cloudinary, Nodemailer.
*   **Payments**: Razorpay Node SDK (sandbox simulator fallback + dynamic UPI QR Code).
*   **Geolocation**: Address Autocomplete, coordinates picking and interactive maps (sandbox offline grid map fallback).
*   **Documentation**: Swagger / OpenAPI, detailed code comment logging.

---

## Directory Layout

```text
d:\LEASIFY\
├── backend\
│   ├── config\             # DB, Mailer, Storage configurations
│   ├── controllers\        # Express route handlers
│   ├── middleware\         # JWT Auth, Roles, Multer, Error handlers
│   ├── models\             # Mongoose Schemas (Owner, Tenant, Bill, etc.)
│   ├── routes\             # Express routing maps
│   ├── seeds\              # Database seeding scripts
│   ├── utils\              # PDF kit invoice builders, storage uploads
│   ├── app.js              # Express app boots
│   ├── server.js           # Server listen binder
│   ├── package.json        # Dependencies
│   └── swagger.json        # Swagger API Documentation spec
├── frontend\
│   ├── public\             # PWA manifests
│   ├── src\
│   │   ├── components\     # Reusable glass widgets, maps, calendars
│   │   ├── context\        # ThemeContext, AuthContext
│   │   ├── pages\          # Pages (Dashboards, Properties, Invoices, Repairs)
│   │   ├── services\       # Axios api client interceptors
│   │   ├── App.jsx         # App router layouts
│   │   ├── index.css       # Design variables and scrollbars
│   │   └── main.jsx        # Mount entrypoint
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── docker-compose.yml      # Containerized orchestrator
```

---

## Quick Start Installation Guide

### Option 1: Docker Compose (Easiest)

Build and boot the Node API, MongoDB database, and Nginx React server automatically:

```bash
docker-compose up --build
```

Access the frontend dashboard at `http://localhost` and the API documentation at `http://localhost:5000/api-docs`.

---

### Option 2: Manual Local Startup

#### Step 1: Initialize the Backend
1. Open a terminal, go to the backend folder:
   ```bash
   cd backend
   npm install
   ```
2. Copy the `.env.example` file to `.env` and configure MongoDB Atlas and other optional variables (Cloudinary, Razorpay):
   ```bash
   cp .env.example .env
   ```
3. Pre-populate the database with the verified Owner, Tenants, Invoices, and Maintenance tickets:
   ```bash
   npm run seed
   ```
4. Boot the API server in development mode:
   ```bash
   npm run dev
   ```

The API service runs on `http://localhost:5000`. You can inspect the OpenAPI Swagger details at `http://localhost:5000/api-docs`.

#### Step 2: Initialize the Frontend
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   npm install
   ```
2. Launch the Vite development server:
   ```bash
   npm run dev
   ```

Open `http://localhost:5173` in your browser.

---

## Test Login Credentials (Seed Data)

*   **Property Owner Account**:
    *   **Email**: `owner@leasify.com`
    *   **Password**: `Password123`
*   **Resident Tenant Account**:
    *   **Email**: `tenant@leasify.com`
    *   **Password**: `Password123`

---

## Core System Walkthroughs

### 1. Verification & Security Checks
Landlord register actions generate unique `verificationTokens` and dispatch email confirmations. Standard login returns a 15-minute JWT Access Token alongside a 7-day HTTP-Only Cookie Refresh Token. If access expires, Axios interceptors request silent refreshes in the background, preventing session breaks.

### 2. Tenant Move-In / Move-Out Workflow
*   **Move-In**: Requires assigning a vacant unit, inputting lease dates, uploading identity docs, and logging initial utility meter values. Property status changes to `Occupied`.
*   **Move-Out**: Collects final meter numbers, inputs physical inspections, computes refundable deposit balances (deducting damages/bills), and resets property statuses back to `Vacant`.

### 3. Automated Late Fee Billing
Monthly invoices carry due dates. Query requests trigger on-demand late-fee runs: overdue unpaid bills auto-accumulate late fees at `50 INR / day past due`, incrementing invoice sums.
