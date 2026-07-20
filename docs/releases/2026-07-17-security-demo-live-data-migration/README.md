# 2026-07-17 Security Demo and Live Data Migration

Next release architecture documentation for V3.3 security demo and live data migration.

## Documents

- `Project_Operations_System_V3.3_Security_Demo_and_Live_Data_Migration_Architecture.docx` - V3.3 security demo and live data migration architecture document.
- `development-sandbox-runbook.md` - Local live/dev port and database separation runbook.
- `WP0-impact-report-2026-07-17.md` - Repository impact report and implementation boundary map for V3.3 WP0.
- `wp0-sandbox-db-preflight.json` - Read-only sandbox database fingerprint and reconciliation evidence.
- `WP1-read-only-inventory-runbook.md` - WP1 operator runbook for read-only inventory evidence.
- `wp1-inventory-report.schema.json` - Machine-readable contract for WP1 inventory reports.
- `wp1-sandbox-inventory.json` - WP1 read-only sandbox inventory and relationship-health evidence.
- `wp1-live-inventory-2026-07-18.json` - WP1 read-only live database fingerprint and relationship-health evidence.
- `WP1-completion-report-2026-07-18.md` - Summary of WP1 findings and remaining operator decisions.
- `WP2-auth-and-schema-decision-memo-2026-07-18.md` - Auth library, additive schema and operator-decision memo for WP2.
- `WP2-seed-backfill-runbook.md` - Explicit V3.3 security seed/backfill command runbook.
- `WP2-operator-decisions-2026-07-18.md` - Approved WP2 operator decisions, login email and membership/contact boundary.
- `WP5-demo-inventory-polish-and-freeze-2026-07-19.md` - DEMO workspace inventory, label polish, agent-ready examples, packaging review and demo freeze boundary.

## Current Status

Architecture document added, development sandbox separated from live, WP0 repository impact report completed, WP1 sandbox/live inventory completed, WP2 decision memo drafted, stale implicit Prisma seed config removed, and WP2 operator decisions approved in principle. Next step is additive schema/auth implementation on the sandbox database only.
