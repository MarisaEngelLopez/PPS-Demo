# WP2 Operator Decisions

Prepared: 2026-07-18  
Status: operator approved in principle.

## Approved Decisions

1. Live fingerprint approved for planning:
   - `0744a6fe3c7ce9c82a95ce696c39fc60a48546d50e2eddb2f7e8c78a3eb57d75`
2. Owner operational user approved:
   - Existing `User.id`: `f5f52a98-4a18-48bc-b0f7-788f1e3c9288`
   - Current database email: `marisa@example.com`
   - Approved real login email: `marisa.engel@protervitas.com`
   - Name: `Marisa Engel`
3. Better Auth with custom auth model names approved in principle.
4. `Organization.workspaceId` direct scope approved in principle; contacts inherit workspace scope through organization.
5. `ProjectMembership` approved for WP2 schema creation, even if first enforcement starts with owner/demo workspace memberships.
6. Stale Prisma seed config removal approved and completed.

## Maintainability Decision

Security tables must not become a large manual permission matrix.

Configuration UI should eventually expose:

- users and invitations;
- workspace membership;
- project membership, only where needed;
- role assignment from the three stable roles.

Configuration UI should not expose low-level auth internals such as sessions, auth accounts or verification tokens except for diagnostics/revocation.

## Contact Versus Project Membership Decision

Project membership should relate to the application `User`, not directly to `OrganizationContact`.

Reason:

- `OrganizationContact` is a business/contact-directory record.
- `User` is the application actor used for authentication, audit and authorization.
- A contact may never log in.
- A user may correspond to a contact, but that should be an optional profile link later, not the security boundary.

For V3.3, keep `ProjectMembership.userId -> User.id` and `ProjectMembership.projectId -> Project.id`.

Optional later enhancement:

- Add `User.organizationContactId` only if it becomes useful for profile display or contact-directory reconciliation.
- Do not require every contact to become a project member.

## Role Behavior Decision

Initial role behavior:

- `OWNER_ADMIN`: full control across LIVE and DEMO workspaces, equivalent to current owner control.
- `PROJECT_MANAGER`: access only to assigned LIVE projects, with maintenance privileges inside those projects.
- `DEMO_VIEWER`: read-only access to the DEMO workspace only.

Delete behavior must preserve existing domain rules:

- Authorization answers whether the user may act on a project.
- Existing business/domain rules still answer whether a record is deletable.
- Project managers may delete only entities that current rules consider safe, such as draft/open/unreferenced records.
- Historical, approved, converted, linked or otherwise protected records must continue to use archive, close or status transitions instead of hard delete.
