# WP5 Demo Entry Architecture Note - 2026-07-19

## Purpose

Define the target architecture for an interactive DEMO-only entry path suitable for external presentation use, including OpenAI Build Week-style demonstrations.

This note intentionally does not cover application bundling, database packaging, mobile app distribution, or how the system will be sent to reviewers. Those topics require a separate packaging and distribution decision document.

## Design Position

The demo experience should feel like a standalone product demonstration, not like restricted access to an internal owner environment.

The demo user should enter through a curated front page, authenticate with demo credentials, and land directly inside the DEMO workspace.

The demo user should not see, select, or infer the existence of a LIVE workspace.

## Experience Goals

- Provide a simple front page similar in spirit to the current PPS access gate.
- Allow a demo credential such as `demoPPS / demoPPS`.
- Route the demo user directly into the DEMO workspace after login.
- Keep the demo interactive, because a working operational system is more compelling than a read-only tour.
- Hide LIVE workspace concepts from the demo user interface.
- Preserve owner/admin access to both LIVE and DEMO for internal operation and development.

## Role Model

The previous `DEMO_VIEWER` concept should be replaced or complemented by a read-write demo role.

Recommended role:

- `DEMO_OPERATOR`

Expected permissions:

- DEMO workspace only.
- Can use operational project surfaces in DEMO.
- Can create and edit demo records where ordinary operational workflows require it.
- Can use the Time Tracking Assistant and Project Progress Assistant in DEMO.
- Can review and approve/reject DEMO agent suggestions.
- Cannot access LIVE data.
- Cannot switch workspace.
- Cannot access admin or configuration areas.
- Cannot run migration, seed, reset, or owner-level functions.

## Workspace Boundary

The DEMO workspace remains the security boundary for the demo user.

All server-side queries and mutations must continue to derive workspace access from the authenticated session and membership, not from hidden form fields or client-side selectors.

For project-owned data, the authoritative scope remains:

- `Project.workspaceId`

For organization-owned data, the authoritative scope remains:

- `Organization.workspaceId`

Contacts inherit scope through their organization.

## Navigation Model

Owner/admin:

- Normal sign-in.
- Can see the workspace switch.
- Can access LIVE and DEMO.
- Can access admin/configuration.

Demo user:

- Dedicated demo front page.
- Demo credentials only.
- Lands in DEMO.
- No workspace switch.
- No LIVE labels, LIVE navigation, or LIVE empty states.
- No admin/configuration navigation.

## Interactive Demo Safety

Interactive DEMO is preferred over read-only DEMO.

To keep it safe:

- DEMO user must have no LIVE membership.
- Workspace switch must be hidden and blocked server-side.
- Admin/configuration routes must remain blocked.
- Destructive operations should remain governed by existing lifecycle rules, such as delete only for draft/open entities.
- A DEMO reset script should be available for the owner/admin to restore the demo data set after experiments or presentations.

## Presentation Value

The system is strongest when it demonstrates one operational truth across multiple interfaces:

- web operational UI;
- assistant-driven operational updates;
- reporting and narrative generation;
- attention/suggestion surfaces;
- mobile operational input, once packaging strategy is agreed separately.

This single-source-of-truth model is a core differentiator. Demo architecture should preserve that impression by making the DEMO environment coherent, interactive and self-contained.

## Excluded From This Note

The following topics are intentionally deferred:

- How to bundle the app with a database.
- Whether to ship the mobile app together with the web app.
- Whether reviewers receive a local executable, hosted instance, zipped source, container, or another package.
- How demo data resets are triggered in a distributed package.

These should be covered in a later packaging and distribution architecture document.

## Implementation Checklist

1. Create `DEMO_OPERATOR` role if not already present.
2. Create `demoPPS` user credentials for DEMO access.
3. Add DEMO-only workspace membership for `demoPPS`.
4. Ensure `demoPPS` has no LIVE membership.
5. Add dedicated demo login/front page.
6. Route successful demo login directly to DEMO.
7. Hide workspace switch unless user has owner/admin privileges.
8. Hide admin/configuration navigation for demo user.
9. Enforce admin/configuration denial server-side.
10. Validate TT/PP agents, Review Suggestions, Open Sessions and Attention surfaces under `demoPPS`.
11. Add owner-only DEMO reset workflow.
