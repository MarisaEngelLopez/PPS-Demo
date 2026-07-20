# WP5 Workspace Data Separation Report - 2026-07-19

## Scope

Extended the protected LIVE/DEMO workspace switch from the first project and organization screens into the main project-data surfaces.

This work was applied only in the development codebase:

- `C:\Users\maris\Documents\Project Management system 2\project-ops-system`

The frozen production codebase was not changed.

## Separation Rule

The selected workspace is read server-side through `getSelectedWorkspace()`.

Project-owned data is scoped through `Project.workspaceId`.

Organization-owned data is scoped through `Organization.workspaceId`; contacts inherit workspace scope through their organization.

Server actions now treat posted ids as untrusted selectors. Where an action receives `projectId`, `organizationId`, `workSessionId`, `suggestionId`, or another child id, it verifies that the referenced record belongs to the selected workspace before updating, deleting, approving, rejecting, exporting, or generating derived data.

## Updated Surfaces

Read/query scoping was added or extended for:

- Projects and organizations.
- Customer DNA.
- Executive intelligence.
- Decisions.
- Risks, risk actions, evidence, assessments and reviews.
- Executive report and reporting pack queries.
- Time tracking base data, time entries, work sessions and CSV export.
- Daily attention engine.
- Project Progress Assistant context.
- Time Tracking Assistant context.
- Agent transaction logs.
- Business-code configuration counts.

Mutation/action scoping was added or extended for:

- Organization and contact create/update/delete.
- Project header, workstreams, tasks, subtasks and milestones.
- Customer DNA create/update/delete.
- Executive intelligence create/update/delete.
- Decisions create/update/archive/delete.
- Risks, actions, evidence, assessments and reviews.
- Time entries and work-session lifecycle actions.
- Time-entry suggestion approve/reject.
- Project-progress suggestion approve/reject.
- Reporting pack creation, update, narrative copy/generation/review/archive/delete.
- Business-code cleanup actions.

## Demo/Live Sandbox Count Check

Read-only check against `data/dev-sandbox.db`:

| Workspace | Projects | Organizations | Time Entries |
| --- | ---: | ---: | ---: |
| DEMO | 2 | 3 | 3 |
| LIVE | 5 | 4 | 144 |

This confirms that the sandbox contains separate LIVE and DEMO record sets after the demo seed.

## Verification

Passed:

- `npx tsc --noEmit`
- `npm run lint`
- Read-only sandbox workspace count check

## Manual Test Path

1. Start development with `npm run dev:sandbox`.
2. Sign in as the owner account.
3. Switch to `DEMO`.
4. Confirm project, organization, time tracking, reporting, risk, decision, customer DNA and assistant pages show demo data only.
5. Create or edit a small demo record.
6. Switch to `LIVE`.
7. Confirm the demo record is not visible in live views.
8. Switch back to `DEMO` and confirm the demo record is still present.

## Remaining Work

This pass separates LIVE and DEMO for the main operational surfaces.

Next authorization work should enforce role-specific behavior inside a workspace:

- `OWNER_ADMIN`: full control in LIVE and DEMO.
- `PROJECT_MANAGER`: maintain only assigned projects.
- `DEMO_VIEWER`: read-only in DEMO.

Admin reference/configuration tables remain global unless a future requirement says configuration itself must vary per workspace.
