# Digital Heroes - Day 1 Backend API Routes

## Goal
Implement and test the complete REST API for authentication, admin user management, lead lifecycle CRUD, note adding, and activity trail logging.

## Tasks
- [x] Task 1: Create `src/app/api/auth/login/route.ts` (public login endpoint, returns JWT in HttpOnly cookie `auth_token` and JSON user response) → Verify: Sending valid credentials returns `200` with user details and sets cookie, invalid returns `400`/`401`
- [x] Task 2: Create `src/app/api/users/route.ts` (GET lists all users for admin; POST creates a new member account) and `src/app/api/users/[id]/route.ts` (PATCH activates/deactivates or edits user role) → Verify: Endpoints are protected by `withRole('admin')`, non-admins receive `403`
- [x] Task 3: Create `src/app/api/leads/route.ts` (POST is public lead capture; GET returns all leads for admin or only assigned leads for member) → Verify: GET results are automatically scoped by role on the server side
- [x] Task 4: Create `src/app/api/leads/[id]/route.ts` (GET retrieves lead details; PATCH updates status/assignment, verifying permissions and status transition rules) → Verify: Members cannot update status of leads not assigned to them (expect `403`), and invalid transitions (e.g. from `won` to `new`) return `422`
- [x] Task 5: Create `src/app/api/leads/[id]/notes/route.ts` (POST adds note, auto-logs note addition activity) and `src/app/api/leads/[id]/activity/route.ts` (GET lists activity trail) → Verify: Creating a note saves to Mongoose and creates an Activity entry containing note metadata
- [x] Task 6: Write integration test suites in `src/tests/api.test.ts` for all route handlers (testing positive paths, negative paths, role constraints, and status transition errors) → Verify: Running `npx vitest run` executes all test files and all tests pass

## Done When
- All authentication, user, lead, note, and activity API route handlers are fully functional and secure.
- Role-based permissions, query scoping, and status transition logic are fully enforced.
- Integration tests cover all API routes, verifying all success and error responses.
