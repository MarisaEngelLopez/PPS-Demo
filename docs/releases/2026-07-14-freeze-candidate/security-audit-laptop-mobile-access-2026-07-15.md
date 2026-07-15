# Laptop and Mobile Access Security Audit

Date: 2026-07-15

Scope: laptop-side PPS app security before designing permanent mobile access.

## Purpose

Assess whether exposing the PPS app from the laptop to a mobile device could allow unintended access to the laptop, PPS database, app configuration, exports, or unrelated local files.

This audit was performed before choosing a permanent mobile access model, because the current development/mobile testing flow used a Cloudflare tunnel.

## Summary

The app does not appear to expose a direct path for a visitor to install malware, run shell commands, or execute arbitrary uploaded files.

The main risk is different: if the PPS app is exposed through a tunnel without an app-level access gate, anyone with the tunnel URL may be able to use the PPS app itself. That includes reading pages, exporting reports/logs, changing data, approving agent suggestions, and updating agent/admin configuration.

Therefore, the laptop-side app should be hardened before creating a permanent mobile access setup.

## Findings

### High: No App-Level Access Gate

No `middleware.ts`, login/session guard, or route-level authentication boundary was found.

The app has many server actions and route handlers that are intended for the owner, but they are not currently protected by an app-level access check.

Examples of write-capable areas:

- Project creation and updates: `app/projects/actions.ts`
- Project detail workstream/task/milestone updates: `app/projects/[id]/actions.tsx`
- Risks and decisions: `app/risks/actions.tsx`, `app/decisions/actions.tsx`
- Time tracking and assistant actions: `app/time-tracking/actions.tsx`, `app/time-tracking/assistant-actions.ts`
- Project progress assistant actions: `app/projects/progress-assistant-actions.ts`
- Agent configuration changes: `app/configuration/agents/page.tsx`
- Admin/configuration pages under `app/admin` and `app/configuration`

### High: Tunnel Origins Are Explicitly Allowed

`next.config.ts` currently allows Cloudflare tunnel origins:

- `allowedDevOrigins: ["*.trycloudflare.com"]`
- Server Actions `allowedOrigins` includes `"*.trycloudflare.com"`

This means that when the app is exposed through a Cloudflare tunnel, the tunnel can reach interactive server actions, not only read-only pages.

This was useful for testing, but it should not be considered a permanent access model without an additional access gate.

### Medium: Export and Data Routes Are Reachable

Several GET routes generate or expose data without an app-level access check:

- `app/executive-report/data/route.ts`
- `app/executive-report/pdf/route.ts`
- `app/executive-report/pptx/route.ts`
- `app/time-tracking/export/route.ts`
- `app/configuration/agents/logs/export/route.ts`
- `app/configuration/agents/transactions/export/route.ts`

These routes do not provide direct laptop access, but they can expose PPS data and logs if the app URL is reachable.

### Medium: Organization Logo URL Handling Should Be Constrained

PPT generation supports organization logo URLs in `lib/reporting/executiveReportPptx.ts`.

Current behavior can:

- use `data:` image URLs
- fetch remote `http(s)` URLs
- read local files under `public` based on the configured logo path

This is not a general malware path, but it is a server-side URL/file boundary. It should be tightened before permanent mobile access.

Recommended rule:

- allow local logos only under a controlled public subfolder, such as `public/logos`
- block path traversal such as `..`
- avoid arbitrary internal/localhost fetches
- optionally allow only trusted HTTPS logo domains

### Positive Findings

The audit did not find evidence of:

- exposed shell execution through app routes
- use of `child_process` from app routes
- arbitrary file upload execution
- broad filesystem write APIs exposed to browser users
- committed `.env` or SQLite database files; `.gitignore` excludes `.env*`, `dev.db`, and `*.db`

## Practical Risk Interpretation

The realistic risk is not that an attacker can directly install malware on the laptop through PPS.

The realistic risk is that, if a tunnel URL is reachable and unprotected, someone could operate PPS as if they were the owner:

- view PPS data
- export reports, logs, and time entries
- create/update/delete records
- change admin configuration
- change agent configuration
- approve or reject agent suggestions
- trigger report generation

That is enough risk to require hardening before permanent mobile access.

## Recommended Hardening Before Mobile Access

1. Add a simple app access gate.

   Use a shared access secret stored in `.env.local`, enforced by middleware for all pages, route handlers, and server actions.

2. Protect exports and data routes.

   The same access gate should apply to PDF, PPTX, CSV, Excel, JSON, and agent log routes.

3. Narrow allowed origins.

   Avoid broad `*.trycloudflare.com` as a permanent configuration. Prefer a stable, protected origin or explicit allowed origin list.

4. Constrain logo URL handling.

   Restrict local logo reads to a safe public folder and prevent path traversal. Consider blocking arbitrary remote fetches unless a trusted domain list is defined.

5. Keep the local app bound to `127.0.0.1`.

   Do not expose the laptop network interface directly. Mobile access should go through the selected controlled access layer.

6. Document the chosen mobile access model.

   The final release should state how mobile access is protected and what is intentionally exposed.

## Release Decision

Do not create the final freeze tag until the access gate and any required hardening are implemented and validated.

This audit should be followed by a security-hardening commit before deciding the permanent mobile access approach.
