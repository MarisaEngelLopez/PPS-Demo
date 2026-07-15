# Bridge Field Audit

Date: 2026-05-31

Command:

```bash
npx tsx prisma/auditBridgeFields.ts
```

## Result

| Area | Check | Count |
| --- | --- | ---: |
| Projects | Total projects | 1 |
| Projects | Active projects | 1 |
| Projects | Missing manager contact | 0 |
| Projects | Missing governed status | 0 |
| Contacts | Projects with legacy manager | 1 |
| Contacts | Projects with legacy sponsor | 0 |
| Contacts | Projects with sponsor contact | 1 |
| Project status | Legacy `ProjectStatus` records | 12 |
| Project status | Workstreams with legacy status | 0 |
| Project status | Workstreams with governed status | 19 |
| Project status | Tasks with legacy status | 0 |
| Risk status | Risks missing `statusId` | 0 |
| Risk status | Risks with legacy `RiskStatus` | 0 |
| Risk status | Legacy `RiskStatus` records | 5 |
| Risk action status | Risk actions missing `statusId` | 1 |
| Risk action status | Risk actions with text status | 4 |
| Decision status | Decisions missing `statusId` | 0 |
| Decision status | Decisions with text status | 2 |
| Decision status | Decisions with `ProjectStatus` bridge | 0 |

## Interpretation

- Project manager/contact migration is complete at data level.
- Sponsor contact migration is complete for the current project.
- Project governed status migration is complete at data level.
- Workstreams and tasks are not using legacy `ProjectStatus.statusId`.
- Risk records are already using global `Status`.
- Legacy `RiskStatus` records exist but are not referenced by current risks.
- One risk action still needs `statusId` backfilled from its text status.
- Decisions are already using global `Status`, but text status remains as a bridge.

## Safe Next Actions

1. Backfill missing risk action `statusId`.
2. Remove project form/action dependency on hidden legacy `projectManagerId`.
3. Keep schema fields until each bridge fallback is removed and manually tested.
4. Defer destructive Prisma schema cleanup until after project/contact/status bridges are fully dependency-free.

## Backfill Applied

Command:

```bash
npx tsx prisma/backfillBridgeFields.ts
```

Result:

| Backfill | Checked | Updated | Missing mappings |
| --- | ---: | ---: | ---: |
| Risk action `statusId` from text status | 1 | 1 | 0 |

Follow-up audit result:

| Area | Check | Count |
| --- | --- | ---: |
| Risk action status | Risk actions missing `statusId` | 0 |

## Legacy Risk Status Removal

Migration applied:

- `prisma/migrations/20260531084000_remove_legacy_risk_status/migration.sql`

Removed:

- `ProjectRisk.riskStatusId`
- `ProjectRisk.riskStatus`
- `RiskStatus`

Post-migration audit:

| Area | Check | Count |
| --- | --- | ---: |
| Risk status | Risks missing `statusId` | 0 |

## Risk Action Text Status Removal

Migration applied:

- `prisma/migrations/20260531094500_remove_risk_action_text_status/migration.sql`

Removed:

- `ProjectRiskAction.status`

Changed:

- `ProjectRiskAction.statusId` is now required.
- Risk action UI, reporting, delete safeguard, and status reference counts use
  `statusId/statusRef` only.

## Decision Status Bridge Removal

Migration applied:

- `prisma/migrations/20260531101500_remove_decision_status_bridges/migration.sql`

Removed:

- `ProjectDecision.status`
- `ProjectDecision.projectStatusId`

Changed:

- `ProjectDecision.statusId` is now required.
- Decision UI, reporting, PDF export, PPT export, cockpit logic, and status
  reference counts use `statusId/statusRef` only.

Post-migration audit:

| Area | Check | Count |
| --- | --- | ---: |
| Decision status | Decisions missing `statusId` | 0 |
