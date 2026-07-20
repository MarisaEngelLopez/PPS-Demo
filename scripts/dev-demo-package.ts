import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const packageRelativeDatabaseUrl = "file:./data/pps-demo-package.db";
const packageDatabasePath = path.resolve(repoRoot, "data", "pps-demo-package.db");
const packagePort = process.env.DEMO_PACKAGE_PORT ?? "3002";

if (!fs.existsSync(packageDatabasePath)) {
  console.error(`Demo package database does not exist: ${packageDatabasePath}`);
  console.error(
    "Run npm run db:create-demo-package -- --database file:./data/pps-demo-package.db --apply --overwrite first.",
  );
  process.exit(1);
}

const nextCliPath = path.resolve(repoRoot, "node_modules", "next", "dist", "bin", "next");
const lanHosts = Object.values(os.networkInterfaces())
  .flat()
  .filter((address): address is os.NetworkInterfaceInfo => Boolean(address))
  .filter((address) => address.family === "IPv4" && !address.internal)
  .map((address) => address.address);
const lanOrigins = lanHosts.map((host) => `${host}:${packagePort}`);
const configuredAllowedOrigins =
  process.env.PPS_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
const allowedOrigins = [...new Set([...configuredAllowedOrigins, ...lanOrigins])];

console.log(`Starting demo package on http://localhost:${packagePort}`);
lanHosts.forEach((host) => {
  console.log(`Mobile/demo package URL: http://${host}:${packagePort}/demo`);
});
console.log(`DATABASE_URL=${packageRelativeDatabaseUrl}`);
console.log(`BETTER_AUTH_URL=http://localhost:${packagePort}`);
if (allowedOrigins.length) {
  console.log(`PPS_ALLOWED_ORIGINS=${allowedOrigins.join(",")}`);
}

const child = spawn(process.execPath, [nextCliPath, "dev", "-H", "0.0.0.0", "-p", packagePort], {
  cwd: repoRoot,
  env: {
    ...process.env,
    BETTER_AUTH_URL: `http://localhost:${packagePort}`,
    BETTER_AUTH_TRUSTED_ORIGINS: allowedOrigins
      .flatMap((origin) =>
        origin.startsWith("http://") || origin.startsWith("https://")
          ? [origin]
          : [`http://${origin}`, `https://${origin}`],
      )
      .join(","),
    DATABASE_URL: packageRelativeDatabaseUrl,
    NEXT_PUBLIC_APP_ENV: "DEMO_PACKAGE",
    NEXT_PUBLIC_GIT_BRANCH: "codex/demo-package-distribution",
    NEXT_PUBLIC_APP_VERSION: "v3.3-demo-package",
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
