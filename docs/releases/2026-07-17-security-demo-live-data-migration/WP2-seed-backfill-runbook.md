# WP2 Security Seed and Backfill Runbook

Purpose: replace the stale implicit Prisma seed hook with an explicit V3.3 security seed/backfill command.

## Commands

Dry run against sandbox:

```powershell
npm run db:security-seed:v3-3 -- --database file:./data/dev-sandbox.db --dry-run --report docs/releases/2026-07-17-security-demo-live-data-migration/wp2-security-seed-dry-run.json
```

Apply against sandbox after the additive V3.3 schema exists:

```powershell
npm run db:security-seed:v3-3 -- --database file:./data/dev-sandbox.db --apply --report docs/releases/2026-07-17-security-demo-live-data-migration/wp2-security-seed-apply.json
```

Live apply requires all of the following:

- `--database file:../dev.db`
- `--apply`
- `--approved-fingerprint <approved sha256>`
- `--allow-live-apply`
- approved production cutover runbook

## Current Behavior

Before the V3.3 additive schema exists, the script reports missing tables/columns and makes no data changes. This is intentional.

## Guardrails

- The script never defaults to `DATABASE_URL`.
- Exactly one of `--dry-run` or `--apply` is required.
- `PROTECTED_LIVE` apply is refused unless an approved fingerprint and live-apply flag are both supplied.
- Planned seed data uses stable codes and upsert semantics.
- Backfill updates only `NULL` workspace fields.
- Demo fixtures are not created until synthetic fixture scope is approved.
