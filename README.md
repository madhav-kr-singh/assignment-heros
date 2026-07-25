# Digital Heroes CRM & Lead Management System

A secure, high-fidelity full-stack CRM and Lead Management platform built with Next.js (Turbopack, App Router), MongoDB Atlas, Mongoose, Zod, Vitest, and Playwright.

---

## 🚀 Key Features

*   **Public Lead Capture**: Beautiful, responsive landing page with client-side validation and automated server-side activity logging.
*   **Role-Based Access Control (RBAC)**: Distinct permissions for `admin` (can manage staff, assign leads, view all logs) and `member` (can only view and update leads assigned to them).
*   **Pipeline Transition Enforcement**: State validation that prevents invalid lead statuses (e.g. from `won` to `new`).
*   **Auditing Trails**: Automated activity logs detailing status transitions, assignment updates, and notes.
*   **Quality Assurance Gates**: 30 Vitest unit/integration tests and automated Playwright E2E smoke tests.

---

## 🛠️ Tech Stack

*   **Core**: Next.js 16 (React 19, Turbopack, App Router)
*   **Database**: MongoDB Atlas (via Mongoose ODM)
*   **Styling**: Tailwind CSS 4
*   **Validation**: Zod
*   **Authentication**: Custom JWT (stored in HttpOnly secure cookies)
*   **Testing**: Vitest & Playwright

---

## 📋 Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm installed.

### 2. Environment Configuration
Create a `.env.local` file in the project root (reference [.env.local.example](file:///c:/Users/ADMIN/Desktop/digital%20heros/.env.local.example)):
```bash
MONGODB_URI=your_mongodb_connection_uri
JWT_SECRET=your_jwt_signing_key
```

### 3. Installation
Install all dependencies:
```bash
npm install
```

### 4. Database Seeding
Initialize the database with the default root admin account (`admin@digitalheroes.com` / `admin123`):
```bash
npx tsx scripts/seed-admin.ts
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Suites

### Running Backend Unit & Integration Tests (Vitest)
Executes 30 test cases validating authentication, route middleware security, lead pipelines, and scoping:
```bash
npm run test
```

### Running E2E Smoke Tests (Playwright)
Launches Next.js, simulates public capture submissions, tests staff login, performs lead modifications, and logs out:
```bash
npx playwright install chromium
npm run test:e2e
```

---

## 🛰️ API Reference

The machine-readable OpenAPI specification is documented in [openapi.yaml](file:///c:/Users/ADMIN/Desktop/digital%20heros/openapi.yaml).

| Endpoint | Method | Auth Scope | Description |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Validates credentials, returns user details, and sets HttpOnly JWT cookie. |
| `/api/auth/logout` | POST | Authenticated | Clears the session HttpOnly cookie. |
| `/api/auth/me` | GET | Authenticated | Retrieves current logged-in user profile metadata. |
| `/api/users` | GET | Admin | Lists all staff accounts in the portal. |
| `/api/users` | POST | Admin | Creates a new staff member account. |
| `/api/users/:id` | PATCH | Admin | Activates/deactivates accounts, or edits roles (with self-deactivation protection). |
| `/api/leads` | POST | Public | Public lead submission form endpoint. Logs capture activity. |
| `/api/leads` | GET | Authenticated | Lists leads (with search/pagination/filters). Auto-scopes to assigned leads for members. |
| `/api/leads/:id` | GET | Authenticated | Retrieves details for a specific lead. Scopes to assigned owner for members. |
| `/api/leads/:id` | PATCH | Authenticated | Updates status (validated pipeline) or assignment (admin-only). Logs activity. |
| `/api/leads/:id/notes` | GET | Authenticated | Retrieves discussion notes trail for a lead. |
| `/api/leads/:id/notes` | POST | Authenticated | Adds a note to a lead. Logs note addition activity. |
| `/api/leads/:id/activity`| GET | Authenticated | Retrieves the audit trail log of actions taken on a lead. |

---

## 🏗️ Architectural Review & Migration Plan

The complete architectural assessment, refactored code patterns, and phased Week 1 / Month 1 / Quarter 1 migration strategy are documented in the Task B document included in the Google Drive submission folder.

---

## 🤖 AI Pairing Disclosure & Collaboration

This application was engineered in a collaborative pair-programming session with **Antigravity**, an agentic AI coding assistant developed by Google DeepMind.

### How AI Was Utilized:
1.  **Test-Driven Development**: Antigravity generated a robust, 30-case integration test suite before implementation to enforce pipeline rules and access controls.
2.  **Debugging & Environment Isolation**: Diagnosed Windows DNS resolver limits on MongoDB Atlas SRV links and Next.js parent-lockfile path resolution bugs, implementing manual `.env.local` parsers for both Vitest and Playwright.
3.  **UI Design Integration**: Assisted in writing clean Tailwind styling for the dark-mode dashboard, details views, and user forms following strict HIG guidelines.
4.  **Refactoring**: Provided code comparisons to demonstrate transitioning legacy coupled systems into secure, middleware-protected handlers.
