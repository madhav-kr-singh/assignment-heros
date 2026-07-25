# Task B: Architectural Assessment & Improvement Plan

**Project**: Digital Heroes CRM & Lead Management System  
**Author**: Senior Software Architect  
**Date**: July 25, 2026

---

## 1. Architectural Assessment & Vulnerability Analysis

After auditing the inherited codebase, we identified four critical architectural vulnerabilities. These flaws violate core principles of secure software engineering, including **Separation of Concerns (SoC)**, **Defense in Depth**, and the **Principle of Least Privilege**.

### 1.1 Secrets Committed to Repository (Critical)
*   **Vulnerability**: Hardcoded database credentials (SRV strings) and cryptographic secrets (JWT keys) committed directly into the source code and pushed to version control history.
*   **Blast Radius**: Absolute. Anyone with access to the source code repository (including developers, CI/CD integrations, or external auditors) gains complete read/write access to the database cluster and can forge arbitrary administrative user tokens.
*   **Engineering Violation**: Violates the **Twelve-Factor App** methodology (specifically Factor III: Config), which mandates strict separation of config (credentials) from code. It bypasses basic access controls, making credential rotation extremely difficult.

### 1.2 Frontend Initiating Direct Database Calls (High)
*   **Vulnerability**: Importing Mongoose or database client libraries inside client-side Next.js components to run queries directly from the browser.
*   **Blast Radius**: High. Webpack/Turbopack bundles these database clients into the static assets served to the client, exposing backend credentials and internal database schemas. It allows malicious actors to execute arbitrary database queries (NoSQL injection) directly from their browser console.
*   **Engineering Violation**: Violates the **Layered Architecture** pattern and **Separation of Concerns**. Client components should only interact with the backend via a secure API interface. Exposing the data access layer to the client layer removes all trust boundaries.

### 1.3 Business Logic Coupled Inside Route Handlers (Medium)
*   **Vulnerability**: Hardcoding validation schemas, state pipeline transition checks, permission logic, and query scoping directly inside Next.js API route files.
*   **Blast Radius**: Medium. Leads to code duplication, high maintenance overhead, and high coupling. A change in the validation format (e.g. phone number requirements) or lead pipeline flow requires editing multiple route files, increasing the risk of regression.
*   **Engineering Violation**: Violates the **Single Responsibility Principle (SRP)** and the **Don't Repeat Yourself (DRY)** principle. Route handlers should act as thin controllers responsible only for HTTP request parsing, delegating core logic to dedicated service layers or validation modules.

### 1.4 Absence of Test Suites (Medium)
*   **Vulnerability**: The codebase lacks unit, integration, or E2E tests, relying entirely on manual click-testing.
*   **Blast Radius**: Medium. Small modifications to data schemas or middleware can break critical paths (e.g. login, lead capturing) silently, going undetected until reported by end-users.
*   **Engineering Violation**: Violates the **Continuous Delivery (CD)** and **Quality Assurance** principles. Without automated regression gates, developers cannot refactor safely or deploy with confidence.

---

## 2. Phased Migration Plan

To systematically resolve these issues without disrupting active business operations, we propose a phased 3-month migration plan.

```mermaid
gantt
    title Phased Migration Roadmap
    dateFormat  YYYY-MM-DD
    section Week 1 (Security Triage)
    Secrets Rotation & Separation  :active, 2026-07-25, 3d
    Middleware Scoping & Auth     :active, 2026-07-28, 4d
    section Month 1 (Refactoring)
    Service Layer Extraction      :2026-08-01, 14d
    Clean API Boundary Setup       :2026-08-15, 14d
    section Quarter 1 (Production QA)
    Testing Automation & CI       :2026-09-01, 21d
    Continuous Monitoring         :2026-09-22, 8d
```

### 2.1 Week 1: Security Triage & Immediate Remedies
1.  **Secret Rotation**: Revoke all committed credentials. Rotate the MongoDB Atlas passwords and JWT secrets immediately.
2.  **Environment Separation**: Mandate the use of `.env.local` for local development and securely configure environment variables inside the hosting provider (e.g., Vercel, AWS) for production. Add `.env*` to `.gitignore`.
3.  **Client-Side Quarantine**: Strip out any direct Mongoose imports from client-side files, converting them into standard `fetch` requests to secure API endpoints.
4.  **Route Protection**: Implement authentication middleware (`withAuth`, `withRole`) to intercept and validate JWT sessions before handlers process requests.

### 2.2 Month 1: Layered Architecture Refactoring
1.  **Service Layer Extraction**: Move database query construction, business rules, and state transitions out of the route handlers into a dedicated `src/services/` layer (e.g. `LeadService.ts`, `UserService.ts`).
2.  **Shared Validation Schemas**: Standardize Zod schemas in a central directory `src/lib/validations/` to perform input validation on both the client (for UX feedback) and the server (for security validation).
3.  **Database Connection Caching**: Implement a singleton connection caching pattern to reuse Mongoose database connections across serverless functions, preventing socket leaks.

### 2.3 Quarter 1: Production Readiness & Quality Assurance
1.  **Automated Testing Suite**: Write unit tests for business utilities, integration tests for API routes, and Playwright E2E tests for core user paths.
2.  **CI/CD Pipeline Integration**: Add GitHub Actions to run tests, TypeScript compilation checks, and ESLint on every pull request.
3.  **Auditing & Logging**: Implement automated logging for sensitive operations (e.g. status changes, assignments, account deactivations) to ensure traceability.

---

## 3. Before/After Code Refactoring Comparison

Below is a comparative analysis demonstrating the architectural refactoring of a Lead status update handler.

### 3.1 Before (Vulnerable, Coupled, No Separation)
```typescript
// src/app/api/leads/[id]/route.ts (Legacy / Vulnerable Version)
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// VULNERABILITY 1: Hardcoded credentials committed to Git
const dbUri = "mongodb+srv://admin:vulnerable_pass@cluster.mongodb.net/crm";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { status, assignedTo } = await req.json();

    // VULNERABILITY 2: Connecting directly to database on every request
    await mongoose.connect(dbUri);

    // VULNERABILITY 3: Inline validation, highly duplicate
    if (status && !['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const lead = await mongoose.model('Lead').findById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // VULNERABILITY 4: Lack of authorization check (any client can update status/assignment)
    // VULNERABILITY 5: Missing state validation (e.g., won -> new) and zero activity logging
    lead.status = status || lead.status;
    lead.assignedTo = assignedTo || lead.assignedTo;
    await lead.save();

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### 3.2 After (Secure, Clean, Layered)
```typescript
// src/app/api/leads/[id]/route.ts (Refactored Version)
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import { updateLeadSchema } from '@/lib/validations/lead';
import { withAuth } from '@/lib/middleware';

// SOLUTION 1 & 4: Protected by custom authentication wrapper (withAuth)
export const PATCH = withAuth(async (req, { params }) => {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const body = await req.json();
    
    // SOLUTION 3: Input validated against shared, versioned schema
    const result = updateLeadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    // SOLUTION 2: Mongoose connection singleton caching used
    await connectDB();
    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Role-Scoping Access Control Check
    if (req.user.role === 'member') {
      const assignedId = lead.assignedTo ? (lead.assignedTo as any).toString() : null;
      if (assignedId !== req.user.id) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this lead' }, { status: 403 });
      }
    }

    const { status, assignedTo } = result.data;

    // Enforce Business Logic: Lead status pipelines (e.g. preventing won -> new)
    if (status && status !== lead.status) {
      const validTransitions: Record<string, string[]> = {
        new: ['contacted', 'lost'],
        contacted: ['qualified', 'lost'],
        qualified: ['proposal', 'lost'],
        proposal: ['won', 'lost'],
        won: [], // Won is final
        lost: ['new'], // Allows recycling lost leads
      };

      if (!validTransitions[lead.status].includes(status)) {
        return NextResponse.json(
          { error: `Invalid transition from "${lead.status}" to "${status}"` },
          { status: 422 }
        );
      }

      // Automatically log status change activity
      const oldStatus = lead.status;
      lead.status = status;
      await lead.save();

      const activity = new Activity({
        leadId: lead._id,
        action: 'status_changed',
        actorId: req.user.id,
        meta: { oldStatus, newStatus: status },
      });
      await activity.save();
    }

    // Enforce Business Logic: Only admins can re-assign leads
    if (assignedTo !== undefined && assignedTo !== lead.assignedTo?.toString()) {
      if (req.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Only administrators can assign leads' }, { status: 403 });
      }
      
      lead.assignedTo = assignedTo;
      await lead.save();

      const activity = new Activity({
        leadId: lead._id,
        action: 'lead_assigned',
        actorId: req.user.id,
        meta: { newAssignedTo: assignedTo },
      });
      await activity.save();
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
```

### 3.3 Key Architectural Improvements
*   **Security & Encryption**: Backend configurations are loaded at runtime from `.env.local` using environment variables. Access control is managed in middleware, blocking unauthorized requests before they execute database code.
*   **Connection Caching**: Reuses Mongoose database connection sockets, preventing performance degradation and connection exhaustion in serverless runtimes.
*   **Separation of Concerns**: Request mapping is kept isolated from core business rules. Schema validations are delegated to shared Zod modules.
*   **Audit Logging**: Changes in lead assignments and state transitions automatically insert a record into the Activity collection, ensuring complete auditability.

---

## 4. Engineering Standards & Quality Proposal

To build a sustainable development culture and prevent future architectural regression, we recommend establishing the following code quality standards:

### 4.1 Development Tools & Quality Gates
*   **Code Formatter**: Prettier (to enforce consistent formatting across all code files).
*   **Linter**: ESLint (Next.js default rules + TypeScript recommended rules) to catch syntax errors, unused variables, and potential security leaks before compilation.
*   **Git Hooks**: **Husky** combined with **lint-staged** to run ESLint and format code files automatically before any commit is recorded.
*   **CI Pipeline**: **GitHub Actions** running `npm run build`, `npm run lint`, `npm run test` (Vitest), and Playwright E2E smoke tests on every push or pull request to the `main` branch.

### 4.2 Code Review & Training Guidelines
1.  **Code Reviews**: Every pull request must be reviewed and approved by at least one other engineer before merging.
2.  **No Credentials in Git Check**: Implement scan hooks (e.g. `gitleaks`) in CI to detect and block commits containing potential secrets or API tokens.
3.  **Onboarding Training**: Introduce new team members to our layered architecture (middleware, models, validations, routes) to maintain structural consistency.
