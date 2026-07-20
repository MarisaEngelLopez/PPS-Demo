# WP2 Auth and Additive Schema Decision Memo

Prepared: 2026-07-18  
Scope: live fingerprint evidence, authentication approach, additive schema direction and operator decisions before implementation.  
Status: decision memo only. No Prisma schema changes, package installs, migrations or data writes were performed.

## Live Evidence Captured

Read-only live inventory completed against the protected live database:

- Evidence file: `wp1-live-inventory-2026-07-18.json`.
- Database classification: `PROTECTED_LIVE`.
- Database path: `C:\Users\maris\Documents\Project Management system 2\dev.db`.
- SHA-256: `0744a6fe3c7ce9c82a95ce696c39fc60a48546d50e2eddb2f7e8c78a3eb57d75`.
- Modified at: `2026-07-18T08:18:08.744Z`.
- SQLite integrity check: `ok`.
- SQLite foreign-key check rows: `0`.
- Application orphan check failures: `0`.
- Prisma migration count: `43`.

The live database is relationally healthy for planning. This fingerprint must be treated as the current canonical approval fingerprint until the live database changes again.

## Local Framework Constraints

Current stack:

- Next.js `16.2.4`.
- React `19.2.4`.
- Prisma `7.8.0`.
- SQLite with `@prisma/adapter-better-sqlite3`.
- App Router, Server Actions and `proxy.ts`.

Local Next.js documentation checked:

- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`

Relevant guidance:

- Next separates authentication, session management and authorization.
- Next recommends an authentication library over custom authentication for security and simplicity.
- Server Actions must authenticate and authorize from server-side request state, not trusted client parameters.
- Proxy is useful for optimistic or perimeter checks, but must not be the full authorization solution.
- Server Actions already have origin checks; additional allowed origins are needed when safe proxy/tunnel origins differ from the host.

## External Library Check

Official docs reviewed:

- [Better Auth database concepts](https://better-auth.com/docs/concepts/database)
- [Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma)
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Prisma guide: Better Auth with Next.js](https://docs.prisma.io/docs/guides/authentication/better-auth/nextjs)
- [Prisma guide: Auth.js with Next.js](https://docs.prisma.io/docs/guides/authentication/authjs/nextjs)

Better Auth is a better first fit than Auth.js for this phase because:

- It supports Prisma and SQLite.
- It supports email/password for local named credentials.
- It supports custom table/model names, which avoids overwriting the existing operational `User` model.
- It supports trusted origins, which matters because local dev runs on `localhost:3001`.
- It gives maintained session/auth behavior without requiring an external OAuth provider or stable public callback flow on day one.

Auth.js remains a viable later option, especially for OAuth/SSO, but it is less directly aligned with the immediate local named-credentials requirement.

## Recommended Auth Decision

Use Better Auth with Prisma adapter, email/password enabled and custom auth model names.

Do not allow the Better Auth CLI to overwrite `prisma/schema.prisma`. If its schema generation is used, run it only on a throwaway copy and manually reconcile the generated models into the real schema.

Recommended model naming:

- Existing `User`: keep as operational/business user profile. Preserve all existing IDs and relations.
- New `AuthUser`: Better Auth user/principal table, linked to existing `User.id` through an explicit `appUserId` field.
- New `AuthSession`: Better Auth session table.
- New `AuthAccount`: Better Auth account/credential/provider table.
- New `AuthVerification`: Better Auth verification table.

This avoids the most dangerous mistake: replacing or reshaping the existing `User` table that already owns work sessions, risks, approvals, customer DNA and intelligence history.

## Recommended Additive Schema Direction

Add only new structures and nullable scope fields first:

### Auth and access

- `AuthUser`
- `AuthSession`
- `AuthAccount`
- `AuthVerification`
- `Role`
- `Workspace`
- `WorkspaceMembership`
- `ProjectMembership`
- `AuditEvent`

### Scope fields

- `Project.workspaceId String?`
- `Organization.workspaceId String?`

Do not add `workspaceId` to every project child table. Child records should inherit workspace scope through `Project`.

Do not add `workspaceId` to `OrganizationContact` in the first pass unless a concrete cross-workspace/shared-contact requirement appears. Contacts already belong to `Organization`; scoping contacts through `Organization.workspaceId` avoids duplicated scope state.

### Global governance to preserve

Keep these global in V3.3:

- `Status`, `StatusScope`, `StatusUsage`
- `ProjectType`
- `TaskFamily`
- `Phase`
- `Workstream`
- `ProjectTemplate`, `TemplateWorkstream`
- `EventType`
- `RiskCategory`
- `EvidenceType`
- `RiskReviewType`, `RiskReviewOutcome`
- Agent definitions/capabilities/rules/source config/templates

Do not reopen status homogenization.

## Recommended Initial Roles

Seed with stable codes only:

- `OWNER_ADMIN`
- `PROJECT_MANAGER`
- `DEMO_VIEWER`

Role rows must be created with upsert, never destructive seed.

## Recommended First Enforcement Order

1. Auth shell: login/logout/session resolution on sandbox only.
2. `requireUser` and `requireAuthorizationContext`.
3. Owner/admin bootstrap linked to approved existing `User.id`.
4. Workspace role checks for admin/config routes.
5. Project capability checks for project detail, exports and high-risk server actions.
6. Demo viewer read-only route set.
7. Audit events for login, membership changes, export, privileged configuration and destructive actions.

## Migration Sequence Direction

WP2 should create an additive migration only after operator decisions below are approved:

1. Add auth/access tables and nullable scope fields.
2. Run schema validation on sandbox.
3. Recreate Prisma client on sandbox.
4. Run existing smoke paths on sandbox.
5. Only then draft deterministic backfill.

Backfill belongs to WP5, not hidden inside the WP2 schema migration.

## Seed Policy Fix Required

Current `prisma.config.ts` references `npx tsx prisma/seed.ts`, but `prisma/seed.ts` does not exist.

Before WP2 implementation, choose one:

1. Remove the stale seed reference until a real non-destructive security seed exists.
2. Add an explicit `prisma/seed.ts` that only delegates to stable-code upserts and refuses `PROTECTED_LIVE` without an approved production flag.

Recommendation: remove the stale seed reference now, then introduce a dedicated V3.3 security seed/backfill script with explicit `--database`, `--dry-run` and `--apply` modes.

## Operator Decisions Required Before Code Implementation

1. Approve live fingerprint:
   - `0744a6fe3c7ce9c82a95ce696c39fc60a48546d50e2eddb2f7e8c78a3eb57d75`
2. Approve owner operational user:
   - `User.id = f5f52a98-4a18-48bc-b0f7-788f1e3c9288`
   - `email = marisa@example.com`
   - `fullName = Marisa Engel`
3. Approve Better Auth with custom model names.
4. Approve `Organization.workspaceId` direct scope and contact scope through organization.
5. Approve creating `ProjectMembership` in WP2 even if first enforcement uses owner/demo workspace memberships.
6. Approve removing stale Prisma seed config before schema migration.

## Recommendation

Proceed with a small WP2 implementation branch only after these decisions are approved:

- remove stale seed config;
- install Better Auth packages;
- add manually reconciled additive Prisma models;
- generate a reviewed migration against the sandbox database only;
- do not backfill live records inside the migration.

If any decision is uncertain, stop before schema work and resolve it in the release docs. The cheapest mistake to fix is a decision memo; the most expensive one is an unnecessary live database migration.
