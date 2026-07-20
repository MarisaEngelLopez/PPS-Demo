import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const sandboxRelativeDatabaseUrl = "file:./data/dev-sandbox.db";
const sandboxDatabasePath = path.resolve(repoRoot, "data", "dev-sandbox.db");
const devPort = process.env.DEV_SANDBOX_PORT ?? "3001";

if (!fs.existsSync(sandboxDatabasePath)) {
  console.error(`Sandbox database does not exist: ${sandboxDatabasePath}`);
  console.error("Run npm run db:create-sandbox first.");
  process.exit(1);
}

const nextCliPath = path.resolve(repoRoot, "node_modules", "next", "dist", "bin", "next");
const lanHosts = Object.values(os.networkInterfaces())
  .flat()
  .filter((address): address is os.NetworkInterfaceInfo => Boolean(address))
  .filter((address) => address.family === "IPv4" && !address.internal)
  .map((address) => address.address);
const lanOrigins = lanHosts.map((host) => `${host}:${devPort}`);
const configuredAllowedOrigins = process.env.PPS_ALLOWED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];
const allowedOrigins = [...new Set([...configuredAllowedOrigins, ...lanOrigins])];

console.log(`Starting development sandbox on http://localhost:${devPort}`);
lanHosts.forEach((host) => {
  console.log(`Mobile/demo URL: http://${host}:${devPort}/demo`);
});
console.log(`DATABASE_URL=${sandboxRelativeDatabaseUrl}`);
console.log(`BETTER_AUTH_URL=http://localhost:${devPort}`);
if (allowedOrigins.length) {
  console.log(`PPS_ALLOWED_ORIGINS=${allowedOrigins.join(",")}`);
}

const child = spawn(process.execPath, [nextCliPath, "dev", "-H", "0.0.0.0", "-p", devPort], {
  cwd: repoRoot,
  env: {
    ...process.env,
    BETTER_AUTH_URL: `http://localhost:${devPort}`,
    BETTER_AUTH_TRUSTED_ORIGINS: allowedOrigins
      .flatMap((origin) =>
        origin.startsWith("http://") || origin.startsWith("https://")
          ? [origin]
          : [`http://${origin}`, `https://${origin}`]
      )
      .join(","),
    DATABASE_URL: sandboxRelativeDatabaseUrl,
    NEXT_PUBLIC_APP_ENV: "DEV",
    NEXT_PUBLIC_GIT_BRANCH: "development",
    NEXT_PUBLIC_APP_VERSION: "v3.3-sandbox",
    PPS_ALLOWED_ORIGINS: allowedOrigins.join(","),
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
