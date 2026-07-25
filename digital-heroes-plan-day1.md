# Digital Heroes - Day 1 Backend Setup

## Goal
Build the robust backend foundation for the internal lead platform: Database, Mongoose Models, Zod Validations, JWT Authentication, and User Management API routes, all fully verified with unit tests.

## Tasks
- [x] Task 1: Create the Next.js project with `npx create-next-app@latest ./ --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes` → Verify: `npm run dev` starts without errors
- [x] Task 2: Configure Git, create `.gitignore`, `.env.local` with placeholders (`MONGODB_URI`, `JWT_SECRET`), and setup GitHub Actions skeleton in `.github/workflows/ci.yml` → Verify: `git status` shows files ready for commit
- [x] Task 3: Create `src/lib/db.ts` to implement the Mongoose connection singleton → Verify: Connection singleton handles multiple serverless requests without spawning extra connections
- [x] Task 4: Define Mongoose schemas and models in `src/models/` for `User`, `Lead`, `Note`, and `Activity` → Verify: Schemas match the specifications and compile successfully
- [x] Task 5: Define shared Zod schemas in `src/lib/validations/` for auth and lead payloads → Verify: Zod schemas block invalid emails, missing required fields, and invalid lead status transitions
- [x] Task 6: Implement JWT generation, signature verification, and bcrypt hashing in `src/lib/auth.ts`, plus create a root admin seeding script `scripts/seed-admin.ts` → Verify: Running `npx tsx scripts/seed-admin.ts` hashes password and seeds the root admin successfully
- [x] Task 7: Implement `withAuth` and `withRole` middleware wrappers to intercept API route requests and enforce token and role permissions → Verify: Unauthenticated or unauthorized calls return `401` and `403` respectively
- [x] Task 8: Set up Vitest test environment and write unit tests for validation schemas and auth utilities → Verify: `npx vitest run` passes all tests

## Done When
- Next.js application runs locally and builds without errors.
- Database connection, models, and shared validation schemas are fully integrated.
- JWT-based authentication, authorization wrappers, and admin seeding script are operational.
- All backend unit tests pass successfully.
