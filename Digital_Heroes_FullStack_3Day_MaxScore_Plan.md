# Digital Heroes — Full Stack Dev (Task A + B) — 3-Day, No-Shortcuts Plan

**Goal: maximum score on every weighted criterion, not just "done." Nothing below is cut for time.**

---

## 0. What Changes From a Rushed Version

Restored vs. a 1-day version: full UI (not bare-bones), admin-managed user accounts (not just 2 hardcoded logins), full test suite (unit + integration + a UI smoke test), CI, full API documentation (not just a README table), and Task B's four documents written in full depth — no bullet-point shortcuts.

Two decisions are **kept as-is** because they're sound engineering, not shortcuts:
- **Next.js API routes as the backend** — one repo, one deploy target, still fully server-enforced. A separate Express server would add a second free-tier host and CORS config for zero architecture benefit here.
- **Custom JWT auth** (bcrypt + jsonwebtoken, httpOnly cookie) — full control over role claims, easiest to write precise permission tests against. NextAuth would add config overhead for a 2-role system this simple.

---

## 1. Scoring Map — Where Each Point Comes From

**Task A**
| Criterion | Weight | Where it's earned |
|---|---|---|
| Architecture & data modeling | 30 | §3 data model, user management, activity log design |
| Auth & permission correctness | 25 | §3 permission middleware + §4 negative-path tests |
| API design & documentation | 20 | §3 API design + §4 OpenAPI/Postman docs |
| Test coverage & deployment | 25 | §4 full test suite + CI + live deploy |

**Task B**
| Criterion | Weight | Where it's earned |
|---|---|---|
| Prioritization & risk judgment | 30 | §5.1 assessment |
| Migration realism | 25 | §5.2 migration plan |
| Refactor quality | 25 | §5.3 refactor demo |
| Team/adoption thinking | 20 | §5.4 standards proposal |

---

## 2. Locked Architecture (final — build against this)

| Layer | Choice |
|---|---|
| Frontend/Backend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, API routes as backend |
| DB | MongoDB Atlas (free tier) + Mongoose |
| Auth | Custom JWT, bcrypt password hashing, httpOnly cookie |
| Validation | zod schemas, shared between client forms and API route handlers |
| Accounts | Seed **one** root admin. Admin can create/deactivate member accounts via a protected "Manage Users" screen — no public signup (this is an internal sales tool) |
| Testing | Vitest for unit + API integration tests; 1–2 Playwright tests for the top end-to-end flow |
| CI | GitHub Actions — lint + test on every push/PR |
| API docs | README (human-readable) + Postman collection or OpenAPI yaml (machine-readable) |
| Deploy | Vercel (app) + Atlas (DB), both free tier |

### Data model
```
User      { name, email, passwordHash, role: 'admin'|'member', active: boolean, createdAt }
Lead      { name, email, phone, company, source, status: enum[new, contacted, qualified, proposal, won, lost],
            assignedTo: ObjectId(User), createdAt, updatedAt }
Note      { leadId: ObjectId(Lead), authorId: ObjectId(User), text, createdAt }
Activity  { leadId: ObjectId(Lead), actorId: ObjectId(User), action, meta, createdAt }
```
Activity entries are written server-side, inside the same handler that makes the change — never accepted as direct client input, so they can't be spoofed.

### API surface
```
POST   /api/auth/login              public
POST   /api/leads                   public                 → capture form
GET    /api/leads                   auth   ?page &limit &status &assignedTo &search
GET    /api/leads/:id               auth
PATCH  /api/leads/:id               auth                    status / assignment update
POST   /api/leads/:id/notes         auth
GET    /api/leads/:id/activity      auth
GET    /api/users                   auth, admin only
POST   /api/users                   auth, admin only        → create member account
PATCH  /api/users/:id               auth, admin only         → deactivate / role change
```
Permission rules enforced **server-side** in every handler, not just hidden in the UI:
- Reassignment, user management → admin only
- Status update → admin on any lead, member only on leads assigned to them
- `GET /api/leads` → member's query auto-scoped to `assignedTo: req.user.id`, admin sees all
- Deactivated users' JWTs rejected on next request (check `active` flag server-side, not just at login)

Status codes: 201 create · 200 ok · 400 validation · 401 no/invalid token · 403 wrong role · 404 not found · 409 duplicate email · 422 invalid status transition.

---

## 3. Day 1 — Architecture & Backend

- [ ] **Setup (1 hr)** — `create-next-app`, Atlas cluster, GitHub repo (public), Vercel project linked, `.env.local`, GitHub Actions skeleton
- [ ] **Models + DB layer (1.5 hr)** — Mongoose schemas above, connection singleton, zod validation schemas shared client/server
- [ ] **Auth (2.5 hr)** — login route, JWT issue/verify, `withAuth` / `withRole` middleware wrappers, password hashing, root-admin seed script
- [ ] **User management API (1.5 hr)** — create/list/deactivate members, admin-only enforced server-side
- [ ] **Lead API (3 hr)** — full CRUD + status transitions + assignment + permission scoping per rules above
- [ ] **Activity + notes (1.5 hr)** — auto-logged activity trail, notes endpoint
- [ ] **Unit tests as you go (ongoing)** — validation schemas, permission-check helper functions, JWT utilities

## 4. Day 2 — Frontend, Full Test Suite, Docs, CI, Deploy

- [ ] **Public capture form (1 hr)** — clean, validated, rate-limit-aware (basic throttle on the endpoint to block spam bots)
- [ ] **Auth UI (0.5 hr)** — login page
- [ ] **Lead dashboard (3 hr)** — table view with status/assignee filters + search + pagination controls; consider a lightweight kanban-by-status view as a stretch add
- [ ] **Lead detail view (2 hr)** — status change, reassignment (admin), notes, activity trail, permission-aware UI (members don't see admin-only controls)
- [ ] **Admin "Manage Users" screen (1.5 hr)** — create member, deactivate, list
- [ ] **Integration tests (2.5 hr)** — every endpoint above, both roles, explicit negative-path tests (member tries admin action → expect 403; deactivated user's token → expect 401)
- [ ] **Playwright smoke test (1.5 hr)** — one real browser flow: login → view assigned leads → update status → note appears in activity trail
- [ ] **CI (0.5 hr)** — GitHub Actions running lint + Vitest (+ Playwright if fast enough) on push
- [ ] **API documentation (1.5 hr)** — README with full endpoint table + a Postman collection or OpenAPI yaml, exported/linked
- [ ] **Deploy + verify (1 hr)** — Vercel deploy, seed prod Atlas with root admin, footer credit line (`Built for Digital Heroes Training Task` → digitalheroesco.com), confirm both role logins live

## 5. Day 3 — Task B (Full Depth) + Final QA + Submission

Task B deliverables are documents, no live site required (the "Live Build Requirement" text is boilerplate reused across every role in the kit — Task B's own deliverables list is four documents only; state that as your assumption rather than forcing an unneeded live page).

### 5.1 Assessment (1.5 hr)
For each of the four named problems (secrets in repo, frontend-direct-DB-calls, business logic in route handlers, no tests): what's wrong, the concrete operational/security risk of leaving it, and a justified priority rank. Risk-based order to argue from: secrets (breach risk — fix immediately) → frontend DB calls (security hole, bypasses all validation) → no tests (blocks safe change, compounds risk of every other fix) → logic in handlers (maintainability drag, not urgent but slows everything after).

### 5.2 Migration plan (1.5 hr)
Full detail per horizon, no bullet-shortcuts:
- **Week 1** — rotate/remove secrets, move to env vars + secrets manager, add a smoke-test harness on the critical paths so nothing regresses silently
- **Month 1** — replace direct-frontend-DB calls with real API endpoints module by module; add input validation everywhere the frontend currently bypasses it; expand test coverage per module as it's touched
- **Quarter 1** — extract business logic into a service layer incrementally (route → service → repository), CI gate enforcing lint + test + coverage minimum, retire legacy direct-DB code paths entirely

### 5.3 Before/after refactor (2 hr)
Write your own realistic bad sample (15-25 lines) — an Express/Next.js handler mixing business logic, a raw DB query, no validation, a hardcoded secret. Refactor into route → service → repository layers, env config, zod validation, centralized error handling. Comment what improved and why, tied back to the risks named in §5.1. This is the one place they explicitly want work you wrote yourself — use AI to sanity-check afterward, not to generate the sample from scratch.

### 5.4 Standards proposal (1.5 hr)
Concrete tools, not principles: ESLint + Prettier, Husky pre-commit hooks, secret scanning in CI, PR review checklist, minimum test coverage threshold enforced in CI. Adoption plan for a resistant team: apply to new code only first (no forced retrofit), pair on the first few PRs, make tooling block bad patterns automatically rather than relying on willpower, surface one early win (a bug the new tests actually caught) to build buy-in before asking for more.

### 5.5 Final QA (1.5 hr)
- [ ] Re-verify both live credentials still work
- [ ] Click through every permission boundary once more as each role
- [ ] Confirm footer credit line + live URL both correct
- [ ] Proofread all four Task B documents
- [ ] Write the "where I used AI" paragraph for each task — what you used it for, what you changed after

### 5.6 Submission packaging (1 hr)
- [ ] Google Drive folder `FullStackDevelopment_YourFullName`, set to "anyone with the link can view"
- [ ] Folder contains: GitHub repo link, live URL + credentials doc, Task A README/API docs link, Task B write-up as one doc/PDF
- [ ] Follow @realshreyanshsingh on Instagram **before** sending the DM (unfollowed = lands in Requests, unseen)
- [ ] Send the single Drive link via Instagram DM
- [ ] Both tasks' stated assumptions written where a reviewer will see them (README / top of doc)

---

## 6. Stretch Goals — Only If You Finish Day 2 Early

Rate-limit tuning on the public form · basic dashboard chart (leads by status) · dark mode · full-text search across leads · API versioning (`/api/v1/...`). None of these are scored criteria — treat them as buffer-time fillers, not required work.

---

## 7. Deliverables Checklists

**Task A** — public GitHub repo with tests · live deployed URL with footer credit · admin + member credentials, both correctly scoped · README with full API docs (+ Postman/OpenAPI) · stated assumptions

**Task B** — assessment document · phased migration plan · before/after refactor with commentary · standards proposal
