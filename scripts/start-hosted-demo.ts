import { spawn } from "node:child_process";
import process from "node:process";

import "./prepare-hosted-demo-db";

const port = process.env.PORT ?? "10000";
const publicUrl = process.env.RENDER_EXTERNAL_URL ?? process.env.BETTER_AUTH_URL;

const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", port],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BETTER_AUTH_URL: publicUrl,
      DATABASE_URL: process.env.DATABASE_URL ?? "file:/var/data/pps-demo-package.db",
      NEXT_PUBLIC_APP_ENV: "DEMO_PACKAGE",
      NEXT_PUBLIC_APP_VERSION: "v3.3-demo-hosted",
      PPS_PUBLIC_HOSTNAME: process.env.RENDER_EXTERNAL_HOSTNAME ?? "",
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
