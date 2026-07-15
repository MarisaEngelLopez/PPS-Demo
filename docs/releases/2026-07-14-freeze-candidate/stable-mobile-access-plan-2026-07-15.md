# Stable Mobile Access Plan - 2026-07-15

## Goal

Implement Phase 1 stable mobile access before freezing the release:

- permanent Cloudflare Tunnel;
- stable mobile URL;
- mobile/PWA shortcut;
- PPS access token required from mobile;
- laptop remains the application server.

## App-Side Work Completed

The app has been prepared for mobile installation:

- Added `app/manifest.ts` so the app exposes `/manifest.webmanifest`.
- Added PPS mobile icons in `public/`.
- Added `public/sw.js` with a minimal service worker for installability.
- Added `ServiceWorkerRegistration` in the root layout.
- Added mobile metadata in `app/layout.tsx`.
- Kept the service worker intentionally minimal so it does not cache private PPS data.

The app has also been prepared for a future permanent hostname:

- `next.config.ts` now reads `PPS_PUBLIC_HOSTNAME`.
- `next.config.ts` also reads optional comma-separated `PPS_ALLOWED_ORIGINS` for transitional/test hostnames.
- The configured hostname is included in the Next allowed origins for Server Actions.
- The existing temporary `*.trycloudflare.com` path remains allowed during transition/testing.

## Tailscale Private Access Finding

Cloudflare permanent Tunnel requires a Cloudflare-managed domain. Since no Cloudflare zone is currently attached to the account, the no-cost stable access path was changed to Tailscale private access.

Current laptop Tailscale identity:

```text
portatil-me.tailae4e59.ts.net
100.100.208.124
```

The phone is connected to the same tailnet as:

```text
pixel-9a
```

The app responds through Tailscale and the PPS access gate is active. During testing, the authenticated `/projects` page returned successfully through both:

```text
http://100.100.208.124:3000/projects
http://portatil-me.tailae4e59.ts.net:3000/projects
```

Tailscale Serve was then enabled for the laptop and configured successfully:

```powershell
& "C:\Program Files\Tailscale\tailscale.exe" serve --bg --yes 3000
```

Result:

```text
https://portatil-me.tailae4e59.ts.net/
|-- proxy http://127.0.0.1:3000
```

The preferred stable mobile URL is now:

```text
https://portatil-me.tailae4e59.ts.net
```

For this private Tailscale Serve path, `.env.local` should include:

```env
PPS_PUBLIC_HOSTNAME=portatil-me.tailae4e59.ts.net
PPS_ALLOWED_ORIGINS=100.100.208.124:3000,portatil-me.tailae4e59.ts.net:3000
```

After changing these values, rebuild and restart the production app.

## Current Cloudflare Status

The laptop is not yet authenticated with Cloudflare Tunnel.

Observed command:

```powershell
& "C:\Users\maris\Documents\Project Management system 2\tools\cloudflared.exe" tunnel list
```

Result:

```text
No origin certificate was found in ~/.cloudflared.
```

This means the permanent tunnel cannot be created until the one-time Cloudflare login is completed.

## One-Time Cloudflare Setup Needed

Run this in PowerShell:

```powershell
& "C:\Users\maris\Documents\Project Management system 2\tools\cloudflared.exe" tunnel login
```

Expected behavior:

- A browser authorization page opens.
- You log in to Cloudflare.
- You choose the Cloudflare account/site that will host the tunnel.
- Cloudflare creates `cert.pem` under `C:\Users\maris\.cloudflared`.

After that, the permanent tunnel can be created.

## Permanent Tunnel Commands

These commands should be run only after Cloudflare login succeeds.

Create the tunnel:

```powershell
& "C:\Users\maris\Documents\Project Management system 2\tools\cloudflared.exe" tunnel create pps-mobile
```

Route a stable hostname to the tunnel:

```powershell
& "C:\Users\maris\Documents\Project Management system 2\tools\cloudflared.exe" tunnel route dns pps-mobile <your-stable-hostname>
```

Example placeholder:

```text
pps.<your-cloudflare-domain>
```

Add this to `.env.local` after the hostname is selected:

```env
PPS_PUBLIC_HOSTNAME=pps.<your-cloudflare-domain>
```

Then rebuild/restart the production app.

## Operating Model After Setup

Laptop:

```powershell
npm run build
npm run start
```

Tunnel:

```powershell
& "C:\Users\maris\Documents\Project Management system 2\tools\cloudflared.exe" tunnel run pps-mobile
```

Mobile:

- Open `https://pps.<your-cloudflare-domain>`.
- Enter the PPS access token when requested.
- Add the app to the phone home screen.

## Freeze Criteria

The release should only be frozen after:

- stable Tailscale hostname opens on mobile - validated;
- PPS Access token is required on mobile - validated;
- a mobile operational action is tested successfully - validated with time tracking pause/resume;
- mobile voice input works over HTTPS - validated;
- the installed PPS mobile app icon opens the app - validated;
- laptop access still works - validated during setup;
- final build/lint pass - validated.

## Validated Mobile Access Result

The selected Phase 1 mobile access model is:

```text
Laptop PPS app on localhost:3000
        |
Tailscale Serve HTTPS proxy
        |
https://portatil-me.tailae4e59.ts.net
        |
Android phone on the same tailnet
        |
PPS Access token
```

This avoids Cloudflare temporary tunnels and does not expose PPS to the public internet. The app is reachable only to devices in the private Tailscale tailnet, and PPS still requires the application access token.

Mobile validation completed:

- opened app through `https://portatil-me.tailae4e59.ts.net`;
- version tag visible on mobile;
- installed PPS mobile app icon opens successfully;
- time tracking pause/resume works from mobile;
- voice input button works from mobile after moving to HTTPS;
- PPS access gate remains active.
