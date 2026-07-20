# WP5 Demo Workspace Seed Report

Prepared: 2026-07-18

## Scope Completed

Created the first deterministic V3.3 demo workspace seed for the development sandbox.

Script:

- `scripts/migrations/v3_3_demo_workspace_seed.ts`

Package command:

- `npm run db:demo-seed:v3-3`

The script requires:

- explicit `--database file:...`;
- exactly one of `--dry-run` or `--apply`;
- sandbox database path `dev-sandbox.db` unless `--allow-non-sandbox` is explicitly supplied for disposable test copies.

## Demo Records Seeded

Seeded into the existing `DEMO` workspace:

- Projects: `2`
  - `DEMO_001` - Atlas Care Portal Launch
  - `DEMO_002` - Finance Control Tower
- Organizations: `3`
  - Nova Health Group
  - BrightBridge Delivery
  - Atlas Insurance Services
- Project workstreams: `5`
- Project events: `3`
- Risks: `1`
- Risk actions: `1`
- Decisions: `2`
- Time entries: `3`
- Customer DNA items: `2`
- Executive intelligence items: `2`
- Reporting packs: `1`
- Managed narratives: `1`

## Design Intent

The seed creates a clean, synthetic portfolio suitable for:

- demo workspace testing;
- read-only demo viewer testing;
- executive reporting demonstrations;
- a future prize/submission bundle.

No real production data is copied into DEMO.

## Repeatability

The seed is repeatable. On apply, it replaces only records with the known demo codes:

- project codes beginning with the controlled set:
  - `DEMO_001`
  - `DEMO_002`
- organization codes:
  - `DEMO-NOVA-HEALTH`
  - `DEMO-BRIGHTBRIDGE`
  - `DEMO-ATLAS-INSURANCE`

It does not modify LIVE workspace projects.

## Validation

- Dry-run against `data/dev-sandbox.db`: passed.
- `npx eslint scripts/migrations/v3_3_demo_workspace_seed.ts`: passed.
- `npx tsc --noEmit`: passed.
- Apply against `data/dev-sandbox.db`: passed.
- Read-only verification after apply:
  - demo projects: `2`
  - demo organizations: `3`
  - demo workstreams: `5`
  - demo events: `3`
  - demo risks: `1`
  - demo decisions: `2`
  - demo time entries: `3`
  - demo reporting packs: `1`

## Next Step

Add a workspace selector/filter so users can view LIVE and DEMO separately.
