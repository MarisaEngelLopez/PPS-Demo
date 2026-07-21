# PPS Hosted Demo

This repository can be deployed as a hosted PPS demo.

The hosted app uses the demo-only SQLite database:

`data/pps-demo-package.db`

On Render Free, the app uses the bundled demo database directly.

## Render Settings

Use the included `render.yaml` as a Render Blueprint, or create a Web Service manually with these settings:

- Runtime: `Node`
- Build command: `npm ci && npx prisma generate && npm run build`
- Start command: `npm run start:hosted-demo`
- Plan: Free

Environment variables:

```text
DATABASE_URL=file:./data/pps-demo-package.db
NEXT_PUBLIC_APP_ENV=DEMO_PACKAGE
NEXT_PUBLIC_APP_VERSION=v3.3-demo-hosted
BETTER_AUTH_SECRET=<generate a secure value>
```

Render provides `RENDER_EXTERNAL_URL` and `RENDER_EXTERNAL_HOSTNAME` automatically. The hosted start script uses those values for auth and allowed origins.

## Reviewer Access

After deploy, open:

`https://<your-render-service>.onrender.com/demo`

Credentials:

```text
User: demoPPS
Password: demoPPS
```

## Important Notes

- This is a hosted interactive demo, not the production system.
- No production database is included.
- Mobile/Tailscale remains part of the architecture and video story, but the hosted reviewer URL is the easiest way to test the app.
