# Security Access Gate Validation - 2026-07-15

## Purpose

This note documents the final laptop/mobile access-gate validation performed before moving to stable mobile access.

The objective was to confirm that exposing the PPS app through a Cloudflare tunnel does not leave the app open to anyone who has the tunnel URL.

## Issue Found

The first access-gate implementation allowed any request whose hostname appeared as `localhost`.

That protected normal remote hostnames, but it did not cover the Cloudflare tunnel path correctly. Cloudflare forwards traffic into the laptop through `http://localhost:3000`, so a mobile request could still arrive at Next.js looking like a local request and bypass the PPS Access screen.

## Change Made

`proxy.ts` now distinguishes between:

- direct local laptop requests, which may use the localhost bypass; and
- forwarded remote requests, including Cloudflare/mobile traffic, which must pass the PPS access token check.

The detection now checks forwarding and Cloudflare headers such as:

- `x-forwarded-host`
- `x-forwarded-for`
- `x-real-ip`
- `cf-connecting-ip`
- `cf-ray`
- `cf-visitor`

If any of those indicate a forwarded remote request, the app requires `PPS_ACCESS_TOKEN`.

## Validation

Validation performed:

- Production build passed with `npm run build`.
- Lint passed with `npm run lint`.
- Laptop access was tested and accepted the configured `PPS_ACCESS_TOKEN`.
- Mobile access through the Cloudflare tunnel was tested and accepted the configured `PPS_ACCESS_TOKEN`.

## Security Position After This Checkpoint

The current environment is considered acceptable for the freeze candidate path, with the following understanding:

- The Cloudflare/mobile URL is no longer open without the PPS token.
- The app still runs on the laptop under the current Windows user account.
- The app should only expose PPS application routes, the PPS database, and PPS-managed files.
- The Cloudflare tunnel should still be treated as a sensitive access path and stopped when not needed.
- A long, private `PPS_ACCESS_TOKEN` should be used.

This is a pragmatic local/mobile security posture, not a full enterprise hosting model.

## Remaining Before Release Freeze

The release should not be frozen until stable mobile access is implemented and tested:

- permanent Cloudflare Tunnel;
- stable mobile URL;
- mobile/PWA shortcut;
- PPS token still required from mobile access;
- final regression test after the stable mobile access path is in place.
