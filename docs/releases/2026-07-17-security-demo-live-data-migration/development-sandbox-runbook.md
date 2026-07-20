# V3.3 Development Sandbox Runbook

Live data is protected. The parent database `../dev.db` is treated as the canonical live database and must not be used for development, migration experiments, destructive seeds, or reset commands.

## Ports

- Live/local production-like app: `http://localhost:3000`
- Development sandbox app: `http://localhost:3001`

## Database Roles

- Protected live DB: `C:\Users\maris\Documents\Project Management system 2\dev.db`
- Development sandbox DB: `project-ops-system\data\dev-sandbox.db`

## First-Time Sandbox Setup

```powershell
npm run db:create-sandbox
npm run db:preflight:sandbox
npm run dev:sandbox
```

## Refreshing the Sandbox Copy

Only refresh the sandbox when you intentionally want to replace local development data with a fresh copy of the protected live database.

```powershell
npm run db:create-sandbox -- --overwrite
npm run db:preflight:sandbox
```

## Guardrail

`npm run dev:sandbox` forces `DATABASE_URL=file:./data/dev-sandbox.db` and runs Next.js on port `3001`. This avoids accidental development writes to the protected parent `dev.db`.

Before migration or security backfill work, run:

```powershell
npm run db:preflight
```

If the reported classification is `PROTECTED_LIVE`, the command is looking at the real live data and must remain read-only unless an approved production cutover runbook is being executed.
