# WP1 Read-Only Inventory Runbook

Purpose: produce machine-readable evidence for V3.3 security and migration planning before any Prisma schema change or data backfill.

## Default Sandbox Command

Run from `project-ops-system`:

```powershell
npm run db:inventory:v3-3 -- --report docs/releases/2026-07-17-security-demo-live-data-migration/wp1-sandbox-inventory.json
```

The default script target is `file:./data/dev-sandbox.db`.

## Live Read Command

Live reads are allowed only for evidence capture and require an explicit flag:

```powershell
tsx scripts/migrations/v3_3_security_inventory.ts --database file:../dev.db --allow-live-read --report docs/releases/2026-07-17-security-demo-live-data-migration/wp1-live-inventory.json
```

Do not run live inventory while a migration, seed, reset or write operation is in progress. WP1 is read-only, but the live fingerprint becomes approval evidence for later production cutover.

## Exit Codes

- `0`: inventory completed and no relationship-health failures were detected.
- `1`: command/configuration error, such as missing database or disallowed live target.
- `2`: inventory completed but foreign-key or orphan checks found failures. Treat the JSON report as evidence and stop before migration design.

## Report Contract

- Schema: `wp1-inventory-report.schema.json`.
- Sandbox evidence: `wp1-sandbox-inventory.json`.

The report includes:

- resolved database path, classification, size, modified timestamp and SHA-256;
- SQLite integrity and foreign-key checks;
- Prisma migration history;
- all table counts;
- user and owner-candidate inventory;
- project, organization and contact inventory;
- status usage inventory;
- duplicate-code checks;
- nullable relation coverage;
- explicit orphan checks for current project/user/status relations.

## Operator Decisions Before WP2

- Approve the canonical live database fingerprint.
- Approve the owner `User.id` for OWNER_ADMIN bootstrap.
- Decide direct workspace scope for `Organization` and `OrganizationContact`.
- Decide whether `ProjectMembership` is needed in the first schema migration.
- Approve synthetic demo fixture scope.

## Non-Negotiables

- No `prisma migrate reset`.
- No destructive seed.
- No production backfill without rehearsal report, reconciliation report and rollback evidence.
- No demo data copied from live.
