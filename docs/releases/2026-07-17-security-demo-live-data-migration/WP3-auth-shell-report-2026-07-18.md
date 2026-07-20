# WP3 Auth Shell Report

Prepared: 2026-07-18

## Scope Completed

- Added a sandbox-ready sign-in page at `/login`.
- Added a navigation auth status control:
  - shows `Sign in` when unauthenticated;
  - shows the signed-in user and `Sign out` when authenticated.
- Disabled open email/password self-signup in the runtime auth configuration.
- Added explicit owner bootstrap script:
  - `npm run auth:bootstrap-owner`
- Bootstrapped sandbox owner auth principal:
  - auth email: `marisa.engel@protervitas.com`
  - linked operational `User.id`: `f5f52a98-4a18-48bc-b0f7-788f1e3c9288`
  - workspace memberships: `LIVE`, `DEMO`
- Updated `npm run dev:sandbox` to set:
  - `DATABASE_URL=file:./data/dev-sandbox.db`
  - `BETTER_AUTH_URL=http://localhost:3001`

## Deliberately Not Done Yet

- No route protection has been enabled.
- No server action authorization guards have been added.
- No project manager restrictions have been enforced.
- No demo read-only behavior has been enforced.

This keeps the auth shell testable without blocking current workflows.

## Validation

- `npx eslint` on auth shell and bootstrap files: passed.
- `npx tsc --noEmit`: passed.
- Sandbox auth bootstrap verification:
  - owner auth user exists;
  - `AuthUser.appUserId` points to the approved operational owner user;
  - two owner workspace memberships exist;
  - no script-created sessions remain.
