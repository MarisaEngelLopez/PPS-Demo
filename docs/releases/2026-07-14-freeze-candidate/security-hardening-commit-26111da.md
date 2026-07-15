# Security Hardening Commit 26111da

Date: 2026-07-15

Commit: `26111da Harden remote app access and logo loading`

## Purpose

Implement the two laptop-side hardening actions identified in the mobile access security audit before selecting a permanent mobile access model.

## Included Changes

### Remote Access Gate

Added `proxy.ts` to protect non-localhost access.

Behavior:

- Local laptop access through `localhost`, `127.0.0.1`, or `::1` remains available without a token.
- Any non-localhost host, including Cloudflare tunnel URLs, requires `PPS_ACCESS_TOKEN`.
- If `PPS_ACCESS_TOKEN` is not configured, non-localhost access returns a 503 response.
- If the token is configured, remote users must provide it once using `?accessToken=...`; the app then stores an HTTP-only cookie and redirects to the clean URL.
- Non-GET requests without the cookie or `x-pps-access-token` header are rejected with 401.

This protects pages, exports, route handlers, and server actions from being reachable just because a tunnel URL exists.

### Logo Loading Boundary

Restricted PPT logo loading in `lib/reporting/executiveReportPptx.ts`.

Allowed:

- `data:image/png`, `data:image/jpeg`, and `data:image/webp` base64 URLs.
- Local logo paths under `public/logos`.
- HTTPS remote logos only when the hostname is listed in `PPS_TRUSTED_LOGO_HOSTS`.

Blocked:

- `http://` logo URLs.
- local logo paths outside `public/logos`.
- path traversal such as `..`.
- remote image responses that are not PNG, JPEG, or WebP.

## Required Environment Configuration

Before using any tunnel or permanent mobile access, set a strong token in `.env.local`:

```text
PPS_ACCESS_TOKEN=<long-random-secret>
```

Optional, only if remote organization logos are needed:

```text
PPS_TRUSTED_LOGO_HOSTS=example.com,cdn.example.com
```

If local logo files are used, place them under:

```text
public/logos/
```

and configure paths such as:

```text
/logos/client-logo.png
```

## Validation

The following checks passed before committing:

- `npm run lint`
- `npm run build` with `NODE_OPTIONS='--use-system-ca'`

## Remaining Release Decision

The laptop-side app now has a basic access gate for remote/tunnel use. The next decision is the permanent mobile access model and whether `*.trycloudflare.com` should remain in `next.config.ts` or be replaced by a stable explicit origin.
