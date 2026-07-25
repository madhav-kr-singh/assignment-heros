# Digital Heroes - Day 2 & Day 3 Plan

## Goal
Build a beautiful, responsive, and permission-aware Frontend UI, configure Playwright E2E testing, deploy to Vercel, and write the complete Task B architectural deliverables.

## Tasks
- [x] Task 1: Create the public lead capture form on the home page `/` with validation and success states → Verify: Submitting the form creates a new lead in Atlas and logs the event
- [x] Task 2: Create the Auth Login page `/login` with credentials validation and secure cookie setting → Verify: Logging in successfully redirects to `/dashboard`
- [x] Task 3: Build the Lead Dashboard `/dashboard` featuring search, status/assignee filters, pagination, and role-based scoping → Verify: Members only see leads assigned to them; admins see all leads
- [x] Task 4: Create the Lead Detail view `/dashboard/leads/[id]` displaying details, notes trail (add note), and activity log → Verify: Members cannot edit or add notes to unassigned leads; admins can reassign leads
- [x] Task 5: Build the Admin Manage Users screen `/dashboard/users` to list, create, and activate/deactivate users → Verify: Admins can successfully manage member accounts; members cannot access this screen
- [x] Task 6: Set up Playwright and write E2E smoke tests for the primary user flow (Login → View Leads → Update Lead status → Add Note) → Verify: Running `npx playwright test` passes
- [x] Task 7: Deploy the project to Vercel and seed production Atlas database with admin credentials → Verify: Deployed site functions correctly with footer credit link
- [x] Task 8: Write the Task B document in `Task_B_Inherit_and_Improve.md` covering the 4 architectural problems, phased migration plan, before/after refactor code sample, and team standards → Verify: File is generated with all required sections
- [x] Task 9: Perform final QA checks, review permissions, verify credit footer link, and write AI usage disclosures in `README.md` and Task B document → Verify: App is fully compliant with qualification guidelines

## Done When
- Full-stack web application is fully operational and deployed live on Vercel.
- Footer credit link "Built for Digital Heroes Training Task" is present.
- All Playwright E2E smoke tests pass.
- Task B document is complete and saved in the repository.
