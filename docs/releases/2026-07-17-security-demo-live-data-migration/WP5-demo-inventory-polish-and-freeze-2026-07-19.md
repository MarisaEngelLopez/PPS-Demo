# WP5 Demo Inventory, Polish, and Freeze - 2026-07-19

## Scope

This checkpoint covers the development sandbox demo baseline only.

- Code workspace: `project-ops-system`
- Database: `data/dev-sandbox.db`
- Workspace: `DEMO`
- Production folder/database: not touched

## 1. Inventory

The DEMO workspace now contains three active projects:

| Project | Purpose | Baseline |
| --- | --- | --- |
| `DEMO_001 - Atlas Care Portal Launch` | Client-facing delivery story | Coherent healthcare launch briefing and executive report |
| `DEMO_002 - Finance Control Tower` | Lightweight portfolio/example project | Kept as secondary demo content |
| `DEMO_003 - PPS Operating Model Showcase` | Management philosophy story | Explains PPS as a single operational source of truth |

Validated DEMO 001 baseline:

- 8 workstreams
- 9 milestones/events
- 5 risks with actions
- 5 decisions
- 8 time entries
- 5 customer DNA items
- 1 approved reporting pack
- 12 approved/published managed narrative assets
- Approved narrative evidence snapshot: 35 linked project records

Validated DEMO 003 baseline:

- 8 workstreams
- 6 milestones/events
- 4 risks with actions
- 4 decisions
- 5 time entries
- 4 customer DNA items
- 1 approved reporting pack
- 12 approved/published managed narrative assets
- Approved narrative evidence snapshot: 27 linked project records

## 2. Narrative Baseline

DEMO 001 and DEMO 003 both have approved SHORT and DETAILED narrative assets.

- SHORT assets feed the one-page briefing.
- DETAILED assets feed the executive report/PDF/PPT surfaces.
- Narrative text is curated and approved, not auto-generated.
- Narrative evidence snapshots link the approved narrative revisions to transactional project records.

Correct statement for demonstration:

> PPS keeps operational data and approved management narrative in one single source of truth. The report narrative is traceable to the project's transactional records.

Avoid claiming:

> The narrative was automatically generated from the transactional data.

## 3. Clean Labels

Polished reference label:

- `APP_MOB`: changed from `Distinct lapto and mobile views` to `Laptop and mobile views`.

The DEMO 003 milestone visibility baseline is:

| Reporting Name | Visibility |
| --- | --- |
| Recovery validated | DETAILED |
| Demo access confirmed | EXECUTIVE |
| Agents stay in project context | DETAILED |
| DEMO 001 baseline | BOTH |
| Philosophy report review | DETAILED |
| Bundle decision | EXECUTIVE |

## 4. Agent-Ready Examples

DEMO 003 now seeds two open, reviewable agent suggestions:

| Agent | Suggestion | Target |
| --- | --- | --- |
| Project Progress Assistant | Move Bundle decision milestone to detailed | `PROJECT_EVENT` |
| Time Tracking Assistant | Create DEMO 003 report polish time entry | `TIME_ENTRY` |

These examples use the normal agent suggestion tables and should appear in the standard Review Suggestions flows. They are not auto-applied.

## 5. Packaging Review

Packaging is still deliberately not frozen as an implementation decision.

Open packaging question:

- How should the app, demo database, and mobile demonstration be bundled for an external reviewer?

Recommended next decision paths:

- Local bundle: strongest proof of recoverability, but more setup burden.
- Hosted demo: easiest reviewer experience, but requires separate deployment/security decisions.
- Guided recording plus local fallback: lowest risk for submission timing, but less interactive.

DEMO 003 contains this as an explicit open risk and decision so the management report can explain the packaging decision honestly.

## 6. Freeze Boundary

The development sandbox demo story baseline is frozen at this checkpoint.

Frozen baseline includes:

- DEMO workspace data separation
- Demo login and hidden live workspace behavior
- DEMO 001 client delivery story
- DEMO 003 operating model story
- Gantt visibility behavior based on normal product visibility fields
- Approved narrative evidence snapshots
- Agent-ready examples
- Cleaned mobile/laptop event label

Repeatable scripts:

- `npm run db:demo-001-story:v3-3 -- --database file:./data/dev-sandbox.db --apply`
- `npm run db:demo-003-story:v3-3 -- --database file:./data/dev-sandbox.db --apply`

Verification run:

- `npm run db:demo-003-story:v3-3 -- --database file:./data/dev-sandbox.db --apply`
- `npx tsc --noEmit --pretty false`

Important caveat:

Reapplying either story seed resets that project's manually edited story data to the scripted baseline. Any desired manual visibility default should be moved into the corresponding seed script before re-freezing.
