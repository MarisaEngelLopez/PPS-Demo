# WP5 Defect Corrections and Demo Hardening - 2026-07-20

## Scope

This addendum records defects, configuration gaps, and hardening corrections detected while validating the V3.3 security, demo workspace, recovery, and packaging baseline.

It is intended to preserve the operational learning before the demo package branch/freeze.

## Environment Separation Findings

### Production code/database coupling risk

Finding:

- Production and development initially shared the same code folder.
- Continuing V3.3 development changed Prisma schema expectations while the live production database remained on the previous schema.
- This created a realistic failure mode: restarted production code could expect columns that did not exist in the live database.

Observed symptom:

- Runtime Prisma error on `Organization.workspaceId`.
- Root cause: app code expected the V3.3 workspace schema while the active database had not been migrated.

Correction:

- Recovered production into a separate frozen folder: `project-ops-system-production`.
- Production folder uses the live operational database and production configuration.
- Development continues in `project-ops-system` through `npm run dev:sandbox`.
- Development sandbox uses `data/dev-sandbox.db`.

Control now required:

- Do not use `npm run dev` for V3.3 sandbox testing.
- Use `npm run dev:sandbox` for development/security validation.
- Keep production recovery/start procedure documented separately in the production recovery runbook.

### Production recovery validation

Finding:

- The production backup was usable, but `.env.local` was not included in the copied backup code.
- Prisma client artifacts also needed regeneration after restoring the production copy.

Observed symptom:

- Runtime error: missing `.prisma/client/default`.

Correction:

- Copied the production `.env.local` into the recovered production folder.
- Regenerated Prisma client in the recovered production folder.
- Validated that production records created after the code backup were still visible because the live database was not restored from the old backup.

Learning:

- Code backup and database continuity are separate recovery concerns.
- A frozen production code folder plus current live database can recover the app without rolling back business data.

## Workspace Security and Data Separation Findings

### Review Suggestions and Open Sessions leakage

Finding:

- Agent review surfaces initially risked showing records outside the active workspace.
- This would break the demo/live separation model and the future tenant-style workspace model.

Correction:

- Review Suggestions and Open Sessions were checked for both Time Tracking Agent and Project Progress Assistant behavior.
- Agent context resolution was centralized so both agents resolve project/workstream candidates inside the active workspace.
- Suggestions now stay scoped to the active workspace.

Residual control:

- Any future agent surface must use the same workspace-aware context helper.

### Duplicate suggestion opening

Finding:

- The same agent suggestion could be opened twice as a workstream/session.

Correction:

- Duplicate opening is now blocked.
- The user receives an error-style message instead of a success-style message when the same suggestion already exists.

### Workspace switch and demo access visibility

Finding:

- Admin workspace switching is useful for owner/admin validation but must not be visible in the external demo.
- Unauthenticated visitors needed to land naturally in the demo entry path instead of discovering `/login`.

Correction:

- Demo visitor route directs unauthenticated users to `/demo`.
- Demo login hides live workspace indications and admin/configuration links.
- Admin workspace switch remains protected.

Residual control:

- Demo access is still interactive, not read-only. This is intentional for showcase and training value.

## Demo Mobile and Voice Findings

### Mobile demo authentication origin

Finding:

- Mobile browser could reach the demo login page using LAN/Tailscale address and port `3001`, but sign-in initially returned to the login page.

Correction:

- Development sandbox launcher now prints mobile demo URLs.
- Allowed origins/trusted origins are derived from detected LAN/Tailscale addresses.
- Next development origins are configured so mobile access to the dev server is accepted.

Validated:

- Mobile demo login works against the development sandbox on port `3001`.
- Mobile demo shows DEMO workspace data.

### Voice input over HTTP

Finding:

- Mobile voice input does not start on plain HTTP because browser speech recognition requires a secure context.

Observed symptom:

- Voice button reports that HTTPS is required.

Correction:

- Voice control now detects insecure contexts and shows a clear message instead of failing silently.

Residual constraint:

- For mobile voice demonstration, the app must be served over HTTPS or the voice feature must be demonstrated on a secure/local-supported context.

## Demo Story and Reporting Findings

### Narrative traceability

Finding:

- Demo narratives needed to show a clear difference between briefing and executive report.
- The explanation must not overstate automation.

Correction:

- DEMO 001 was rebuilt as a coherent client delivery story.
- DEMO 003 was added to explain the PPS operating philosophy.
- Both projects include approved short and detailed narrative assets.
- Approved narrative revisions include evidence snapshots linked to transactional project records.

Correct claim:

- PPS keeps operational data and approved management narrative in one source of truth, and the narrative is traceable to project records.

Avoided claim:

- The narrative is automatically generated from transactional data.

### Narrative rendering key warning

Finding:

- React reported a missing unique `key` prop in the project narrative view.

Correction:

- Narrative list rendering was adjusted so repeated narrative items have stable keys.

### Gantt visibility mismatch

Finding:

- Changing milestone visibility to `DETAILED` did not remove those milestones from the executive Gantt as expected.
- The pulse/cockpit should show the total project picture, but the Gantt should honor executive/detailed visibility controls.

Correction:

- Executive Gantt model now applies the normal visibility field for phase/milestone Gantt content.
- The rest of the project pulse/cockpit remains based on the total project picture.

Validated:

- DEMO 001 briefing looks coherent.
- DEMO 003 visibility settings now control Gantt density as intended.

### Label cleanup

Finding:

- DEMO 003 contained typo-like event label text: `Distinct lapto and mobile views`.

Correction:

- Cleaned to `Laptop and mobile views`.

## Agent Demonstration Findings

### Natural Language Pilot project context

Finding:

- A low-confidence instruction in the demo could resolve toward a live project name if the recognizer searched too broadly.

Correction:

- Agent project/workstream resolution now stays inside the active workspace and project context.
- When the project is not understood, the agent should ask for clarification instead of jumping across all application workstreams.

### Common agent behavior

Finding:

- Time Tracking Agent and Project Progress Assistant needed the same workspace/project attention boundary.

Correction:

- Shared helper behavior was introduced for project context resolution.
- Common UI behavior was added so creating a suggestion switches the user to Review Suggestions for both agents.

## Demo Package Database Finding

Finding:

- `data/dev-sandbox.db` contains both production-derived data and demo data, so it is not distributable.

Correction:

- Created separate package database: `data/pps-demo-package.db`.
- Package database contains only DEMO workspace business data plus required reference/configuration rows.
- Final verification showed:
  - 3 DEMO projects
  - 4 DEMO organizations
  - 1 demo operational user
  - 1 demo auth user
  - 1 active DEMO workspace membership
  - 0 LIVE projects
  - 0 LIVE organizations

Technical note:

- Prisma `migrate deploy` failed locally at the schema engine layer.
- The package builder therefore records the Prisma migration attempt and uses a controlled fallback:
  - initialize empty schema from the current sandbox schema
  - copy reference/configuration lookup tables only
  - seed security/workspace data
  - create/reset demo login
  - seed DEMO workspace and story data
  - verify no LIVE business records

## Freeze Implication

The demo package branch should preserve a coherent baseline:

- app code
- Prisma schema
- migration/backfill scripts
- demo seed scripts
- package DB builder
- `data/pps-demo-package.db`

Future security-layer development can continue against `data/dev-sandbox.db`. If later changes are needed in the demo package, they should be merged or cherry-picked intentionally and followed by rebuilding `data/pps-demo-package.db`.
