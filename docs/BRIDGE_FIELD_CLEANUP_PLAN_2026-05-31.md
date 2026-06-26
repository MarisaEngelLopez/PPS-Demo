# Bridge Field Cleanup Plan

Date: 2026-05-31

Backup created before planning:

- `C:\Users\maris\Documents\Project Management system 2\backups\backup_20260531_082121`
- Includes source code excluding generated/dependency folders and a copy of `dev.db`.

## Purpose

The application still contains bridge fields from the migration from early local
master data to standardized organization contacts and global statuses. These
fields are useful while the app is being stabilized, but they should not become
part of the hardened production architecture.

The cleanup should be progressive. We should not remove schema fields until the
application has one clear source of truth for each business concept and every
screen, report, export, and safeguard has been verified against that source.

## Current Source Of Truth Targets

| Business concept | Target source of truth |
| --- | --- |
| Project manager | `OrganizationContact` via `Project.projectManagerContactId` |
| Project sponsor | `OrganizationContact` via `Project.sponsorContactId` |
| Project lifecycle status | `Status` + `StatusUsage` via `Project.governedStatusId` |
| Workstream lifecycle status | Calculated from dates/tasks, or `Status` only where explicitly needed |
| Risk status | `Status` + `StatusUsage` via `ProjectRisk.statusId` |
| Risk action status | `Status` + `StatusUsage` via `ProjectRiskAction.statusId` |
| Decision status | `Status` + `StatusUsage` via `ProjectDecision.statusId` |

## Bridge Inventory

| Area | Bridge / legacy field | Current role | Cleanup direction |
| --- | --- | --- | --- |
| Project manager | `Project.projectManagerId` | Legacy relation to `User`; still required by schema and hidden in project forms. | Backfill contacts, remove UI/action dependency, then remove relation when security/user model is redesigned. |
| Project sponsor | `Project.sponsorId` | Legacy relation to `User`; sponsor contact is now organization-based. | Keep only until all reporting/project forms use `sponsorContactId`. |
| Project status | `Project.statusId` and `ProjectStatus` | Legacy required status bridge while `Project.governedStatusId` is the business source. | Make `governedStatusId` mandatory after backfill, remove legacy `statusId`, then remove `ProjectStatus` dependencies. |
| Project workstream status | `ProjectWorkstream.statusId` | Legacy `ProjectStatus` relation; workstream reporting uses governed/calculated logic. | Remove after confirming project workstream lifecycle/status logic no longer reads it. |
| Project task status | `ProjectTask.statusId` | Legacy `ProjectStatus` relation; tasks are mainly date/active controlled. | Remove unless we decide tasks need governed statuses later. |
| Risk status bridge | `ProjectRisk.riskStatusId` and `RiskStatus` | Old risk status model; standardized risk status uses `ProjectRisk.statusId` -> `Status`. | Backfill check, remove reads/counts, then remove field/model. |
| Risk action status bridge | `ProjectRiskAction.status` | Text status retained alongside `statusId`/`statusRef`. | Confirm all actions have `statusId`, then remove text fallback from queries/reports/actions. |
| Decision status bridge | `ProjectDecision.status` and `ProjectDecision.projectStatusId` | Text and old `ProjectStatus` bridge retained alongside `statusId`/`statusRef`. | Confirm all decisions have `statusId`, remove text fallback and `projectStatusId`. |

## Cleanup Principles

1. Back up before every destructive migration.
2. Backfill first, remove fallback reads second, remove schema fields last.
3. Avoid building security, segmentation, translation, or reporting rules on bridge fields.
4. Keep one cleanup phase per business concept so user testing stays focused.
5. After every phase, verify create, update, delete/safeguards, reporting, PDF, PPT, and project detail screens where applicable.

## Proposed Phases

### Phase 1: Baseline Audit And Data Completeness

Create read-only audit scripts or queries that answer:

- Projects missing `projectManagerContactId`.
- Projects missing `sponsorContactId` when a sponsor is expected.
- Projects missing `governedStatusId`.
- Workstreams or tasks still using only `ProjectStatus`.
- Risks missing `statusId`.
- Risk actions missing `statusId`.
- Decisions missing `statusId`.
- Any `ProjectStatus` or `RiskStatus` values that do not map cleanly to `Status`.

Deliverable: an audit result document and, if needed, a controlled backfill script.

### Phase 2: Project Contact Bridge

Goal: project manager and sponsor come from organization contacts only.

Steps:

- Confirm project create/detail pages no longer need visible `User` manager/sponsor values.
- Remove hidden form dependency on `projectManagerId` and `sponsorId` where possible.
- Update reporting data to use contact relations only.
- Decide the future role of `User`: authentication/security principal, not business contact.
- After verification, remove `Project.projectManagerId`, `Project.sponsorId`, and old relation usage.

Testing:

- Create project.
- Edit project manager and sponsor contact.
- Generate executive report cover page.
- Check organization contact delete safeguards.

### Phase 3: Project Status Bridge

Goal: project lifecycle status uses `Status` + `StatusUsage` only.

Steps:

- Make `Project.governedStatusId` the only project status used by project tables, detail pages, delete safeguards, and reporting.
- Remove `getLegacyProjectStatusId` usage.
- Remove reads of `Project.status`.
- Remove `Project.statusId` and the required legacy relation after all projects are backfilled.
- Evaluate whether `ProjectStatus` is still needed by workstreams/tasks before deleting the model.

Testing:

- Create project in Open.
- Edit project status to In Progress.
- Confirm delete is visible only for Open.
- Confirm project appears correctly in reporting.

### Phase 4: Workstream And Task Status Bridge

Goal: avoid misleading status fields for workstreams/tasks if dates are the true controller.

Steps:

- Confirm our agreed rule: project workstreams, events, and tasks are mainly active/inactive plus date-driven lifecycle.
- Remove `ProjectWorkstream.statusId` if no business logic depends on legacy `ProjectStatus`.
- Remove `ProjectTask.statusId` unless a scoped governed task status is explicitly introduced later.
- Keep reporting visibility independent from status bridges.

Testing:

- Project detail workstream/task editing.
- Gantt screen.
- Executive report screen/PDF/PPT Gantt.
- Time tracking workstream/task selection.

### Phase 5: Risk Status Bridge

Goal: risks use the global `Status` model only.

Steps:

- Confirm all active risks have `ProjectRisk.statusId`.
- Remove any fallback to `RiskStatus`.
- Remove `ProjectRisk.riskStatusId`.
- Remove `RiskStatus` model after reference count is zero.

Testing:

- Risk create/update/delete.
- Risk cockpit lifecycle and attention KPIs.
- Risk actions nested table.
- Executive report risk section, PDF, and PPT.

### Phase 6: Risk Action Status Bridge

Goal: risk action status uses `ProjectRiskAction.statusId` only.

Steps:

- Backfill `statusId` from text `status` where missing.
- Update queries and reporting rules to read `statusRef.code`.
- Remove text-status fallback from actions and view models.
- Remove `ProjectRiskAction.status` after verification.

Testing:

- Add action to risk.
- Update action status.
- Confirm delete only for Open.
- Confirm executive report includes correct mitigation actions.

### Phase 7: Decision Status Bridge

Goal: decisions use `ProjectDecision.statusId` only.

Steps:

- Backfill `statusId` from text `status` where missing.
- Remove fallback logic that checks both text status and `statusRef`.
- Remove `ProjectDecision.projectStatusId`.
- Remove `ProjectDecision.status` after all decision filters, delete safeguards, and reports read `statusRef`.

Testing:

- Create decision.
- Update decision status.
- Confirm delete only for Open.
- Confirm only escalated in-progress decisions appear in executive reporting.
- Confirm recent decision outcomes and decision cockpit remain correct.

### Phase 8: Schema Migration And Final Verification

Steps:

- Create a dedicated Prisma migration for removed bridge fields.
- Regenerate Prisma client.
- Run full build.
- Verify all standardized entities manually.
- Create a fresh backup after the migration succeeds.
- Update architecture documentation and the bridge cleanup register.

## Recommended Execution Order

1. Audit and backfill scripts.
2. Project contact bridge.
3. Project status bridge.
4. Workstream/task status bridge.
5. Risk status bridge.
6. Risk action status bridge.
7. Decision status bridge.
8. Final schema migration and architecture documentation update.

This order keeps the highest architectural dependencies first: projects are the
root entity, then workstream/task structure, then transactional entities.

## Progress Log

### 2026-05-31

- Created `prisma/auditBridgeFields.ts`.
- Created audit result document: `docs/BRIDGE_FIELD_AUDIT_2026-05-31.md`.
- Created `prisma/backfillBridgeFields.ts`.
- Backfilled 1 risk action from text `status` to `statusId`.
- Removed project detail form/action dependency on hidden legacy
  `projectManagerId` and `sponsorId` values. The schema fields remain for now,
  but project updates now use organization contacts as the business input.
- Removed the unused legacy risk status bridge:
  `ProjectRisk.riskStatusId` and `RiskStatus`.
- Added migration `20260531084000_remove_legacy_risk_status`.
- Removed risk status reference-count fallbacks to `RiskStatus`.
- Removed risk action status display/delete fallbacks from text `status` where
  `statusRef` is now available.
- Removed the risk action text status bridge:
  `ProjectRiskAction.status`.
- Made `ProjectRiskAction.statusId` required.
- Added migration `20260531094500_remove_risk_action_text_status`.
- Removed the decision status bridges:
  `ProjectDecision.status` and `ProjectDecision.projectStatusId`.
- Made `ProjectDecision.statusId` required.
- Added migration `20260531101500_remove_decision_status_bridges`.
- Updated decision UI, reporting, PDF export, PPT export, cockpit logic, and
  status reference counts to use `statusId/statusRef`.
- Verified focused lint and full production build.

### 2026-06-01

- Created backup `backups/bridge_cleanup_20260601_163318`.
- Removed the final project bridge fields:
  `Project.projectManagerId`, `Project.sponsorId`, and `Project.statusId`.
- Removed the legacy `ProjectStatus` model and table.
- Removed legacy workstream/task status bridges:
  `ProjectWorkstream.statusId` and `ProjectTask.statusId`.
- Removed `TemplateWorkstream.defaultStatusId`.
- Updated project creation, project queries, reporting data, PDF export, PPT
  export, status reference counts, and template application to use the current
  source-of-truth fields only.
- Added migration `20260601165000_remove_project_bridges`.
- Removed obsolete seed and bridge scripts:
  `prisma/seed.ts`, bridge audit/backfill scripts, and project status seed/
  migration helpers.
