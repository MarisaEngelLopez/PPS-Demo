# WP2 Implementation Report

Prepared: 2026-07-18

## Scope Completed

- Removed the stale Prisma seed reference from `prisma.config.ts`.
- Added the dedicated V3.3 security seed/backfill script with explicit `--database`, `--dry-run` and `--apply` modes.
- Added additive Prisma schema models for Better Auth, workspace security, project membership and audit events.
- Added nullable workspace scope fields:
  - `Project.workspaceId`
  - `Organization.workspaceId`
- Added a generated Prisma migration:
  - `prisma/migrations/20260718103000_v3_3_security_foundation/migration.sql`
- Installed Better Auth packages and added the minimal Next.js auth foundation:
  - `lib/auth.ts`
  - `lib/auth-client.ts`
  - `app/api/auth/[...all]/route.ts`

## Auth Model Decision Implemented

The existing operational `User` model remains untouched as the business/application actor.

Better Auth uses separate custom model names:

- `AuthUser`
- `AuthSession`
- `AuthAccount`
- `AuthVerification`

`AuthUser.appUserId` optionally links an auth principal to the existing `User.id`.

## Seed/Backfill Verification

The security seed/backfill was verified after applying the WP2 migration to a disposable database copy.

Dry-run evidence:

- Report: `wp2-security-seed-post-migration-dry-run.json`
- Planned roles: `3`
- Planned workspaces: `2`
- Projects assigned to LIVE: `5`
- Organizations assigned to LIVE: `4`

Apply-test evidence:

- Report: `wp2-security-seed-post-migration-apply-test.json`
- Roles upserted: `3`
- Workspaces upserted: `2`
- Projects assigned to LIVE: `5`
- Organizations assigned to LIVE: `4`

No live database writes were performed.

## Migration Verification Caveat

`prisma migrate dev` refused to apply the new migration to the current copied sandbox database because that database already has historical drift from earlier manual/schema evolution.

The copied sandbox must not be reset blindly. For WP2 verification, the migration SQL was applied to a disposable copy of `data/dev-sandbox.db`, then the seed dry-run and apply-test were run successfully against that disposable copy.

Before a real live migration, run a fresh migration rehearsal against a new clone of the live database and reconcile the existing migration history/drift deliberately.

## Validation

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npx eslint` on changed WP0/WP1/WP2 TypeScript files: passed.
- `npx tsc --noEmit`: passed.
