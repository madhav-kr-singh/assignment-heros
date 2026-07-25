# Digital Heroes - Day 1 Middleware and Testing Setup

## Goal
Implement route middleware wrappers to enforce authentication and authorization (roles) on backend API routes, and set up Vitest to run unit tests verifying Zod validations, JWT logic, and role checks.

## Tasks
- [x] Task 1: Create `src/lib/middleware.ts` implementing `withAuth` and `withRole` wrapper functions for Next.js App Router route handlers → Verify: Unauthorized requests receive `401` and non-admin requests to admin routes receive `403`
- [x] Task 2: Install Vitest and testing dependencies: `npm install --save-dev vitest @testing-library/react @vitejs/plugin-react` → Verify: `npx vitest --version` outputs the installed version
- [x] Task 3: Create `vitest.config.ts` in the project root to configure the test runner and alias paths → Verify: Test runner starts without configuration errors
- [x] Task 4: Write unit tests in `src/tests/auth.test.ts` to verify:
  - Zod validation schemas (valid/invalid cases for login, user creation)
  - JWT utility functions (`signToken`, `verifyToken`)
  - Permission middleware logic (using mock Request/Response)
  → Verify: Running `npx vitest run` executes all test suites and reports 100% pass rate

## Done When
- API middleware wrappers successfully authenticate requests using HTTP-only cookies and reject unauthorized attempts.
- Vitest test suite is configured, fully implemented, and all unit tests pass.
