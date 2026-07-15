# Bridge Cleanup Register

Temporary bridge fields kept the app stable while data ownership was being
standardized. The known bridge fields have now been removed from the active
schema and code path.

Detailed cleanup plan: `docs/BRIDGE_FIELD_CLEANUP_PLAN_2026-05-31.md`

## Active Bridges

None.

## Removed Bridges

| Area | Removed bridge | Current source of truth | Removed in |
| --- | --- | --- | --- |
| Project manager | `Project.projectManagerId` / `Project.projectManager` | `Project.projectManagerContactId` -> `OrganizationContact` | `20260601165000_remove_project_bridges` |
| Project sponsor | `Project.sponsorId` / `Project.sponsor` | `Project.sponsorContactId` -> `OrganizationContact` | `20260601165000_remove_project_bridges` |
| Project status | `Project.statusId` and `ProjectStatus` | `Project.governedStatusId` -> `Status` + `StatusUsage` | `20260601165000_remove_project_bridges` |
| Workstream/task status | `ProjectWorkstream.statusId`, `ProjectTask.statusId`, and `ProjectStatus` references | date/active/visibility logic; scoped `Status` only where explicitly needed | `20260601165000_remove_project_bridges` |
| Template workstream default status | `TemplateWorkstream.defaultStatusId` | template timing and workstream structure | `20260601165000_remove_project_bridges` |
| Risk status | `ProjectRisk.riskStatusId` / `RiskStatus` | `ProjectRisk.statusId` -> `Status` + `StatusUsage` | `20260531084000_remove_legacy_risk_status` |
| Risk action status | `ProjectRiskAction.status` | `ProjectRiskAction.statusId` -> `Status` + `StatusUsage` | `20260531094500_remove_risk_action_text_status` |
| Decision status | `ProjectDecision.status` and `ProjectDecision.projectStatusId` | `ProjectDecision.statusId` -> `Status` + `StatusUsage` | `20260531101500_remove_decision_status_bridges` |

## Rules

- Do not expose bridge fields in normal business UI.
- Do not build future security rules on bridge fields.
- Backfill first, verify all screens and exports, then remove schema fields.
- Create a fresh code and database backup immediately before bridge removal.
