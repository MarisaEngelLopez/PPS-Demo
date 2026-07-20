# WP5 Workspace Switch Report

Prepared: 2026-07-18

## Scope Completed

Added a protected LIVE/DEMO workspace switch for development.

New files:

- `lib/workspaceContext.ts`
- `app/workspace-actions.ts`
- `components/workspace/WorkspaceSwitcher.tsx`

Updated files:

- `app/layout.tsx`
- `lib/domain/projects/projectQueries.ts`
- `app/projects/page.tsx`
- `app/projects/actions.ts`
- `app/organizations/page.tsx`
- `app/organizations/actions.tsx`

## Protection Rule

Only signed-in users with the `OWNER_ADMIN` role can see and apply the workspace switch.

The switch action checks authorization on the server before setting the workspace cookie.

Cookie:

- `pps_workspace_code`

Allowed values:

- `LIVE`
- `DEMO`

Default:

- `LIVE`

## Scoped Surfaces

The selected workspace now filters:

- project portfolio page;
- project detail lookup;
- project organization options;
- organization page.

Create behavior now inherits the selected workspace for:

- new projects;
- new organizations.

## Sandbox Verification

Current sandbox counts:

- LIVE projects: `5`
- DEMO projects: `2`
- LIVE organizations: `4`
- DEMO organizations: `3`

## Deliberately Not Done Yet

Other project-consuming pages still need workspace scoping in later steps, including:

- time tracking project selectors;
- risk pages;
- decisions pages;
- executive report selectors;
- customer DNA;
- executive intelligence;
- agent assistant project selectors.

DEMO read-only enforcement is not implemented yet.

## Validation

- `npx eslint` on changed workspace switch/filter files: passed.
- `npx tsc --noEmit`: passed.
- Read-only sandbox count verification by workspace: passed.
