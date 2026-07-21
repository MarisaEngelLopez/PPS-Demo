import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const packageRelativeDatabaseUrl = "file:./data/pps-demo-package.db";
const packageDatabasePath = path.resolve(repoRoot, "data", "pps-demo-package.db");
const packagePort = process.env.DEMO_PACKAGE_PORT ?? "3002";

function getTailscaleDnsHost() {
  try {
    const result = spawnSync("tailscale", ["status", "--json"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status !== 0 || !result.stdout) return "";

    const status = JSON.parse(result.stdout) as { Self?: { DNSName?: string } };
    return status.Self?.DNSName?.replace(/\.$/, "") ?? "";
  } catch {
    return "";
  }
}

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
const tailscaleHost = process.env.PPS_PUBLIC_HOSTNAME?.trim() || getTailscaleDnsHost();
const tailscaleOrigins = tailscaleHost ? [tailscaleHost, `https://${tailscaleHost}`] : [];
const configuredAllowedOrigins =
  process.env.PPS_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
const allowedOrigins = [...new Set([...configuredAllowedOrigins, ...lanOrigins, ...tailscaleOrigins])];
const childEnv = { ...process.env };
delete childEnv.PPS_ACCESS_TOKEN;

console.log(`Starting demo package on http://localhost:${packagePort}`);
lanHosts.forEach((host) => {
  console.log(`Mobile/demo package URL: http://${host}:${packagePort}/demo`);
});
if (tailscaleHost) {
  console.log(`Mobile/demo package HTTPS URL: https://${tailscaleHost}/demo`);
}
console.log(`DATABASE_URL=${packageRelativeDatabaseUrl}`);
console.log(`BETTER_AUTH_URL=http://localhost:${packagePort}`);
if (allowedOrigins.length) {
  console.log(`PPS_ALLOWED_ORIGINS=${allowedOrigins.join(",")}`);
}

async function waitForServer(url: string) {
  const startedAt = Date.now();
  const timeoutMs = 45_000;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status < 500) return true;
    } catch {
      // Keep polling until Next finishes booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  return false;
}

function openBrowser(url: string) {
  if (process.env.PPS_NO_BROWSER_OPEN === "1") return;

  const command =
    process.platform === "win32"
      ? "cmd"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  const args =
    process.platform === "win32"
      ? ["/c", "start", "", url]
      : [url];

  const opener = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  opener.unref();
}

const child = spawn(process.execPath, [nextCliPath, "dev", "--webpack", "-H", "0.0.0.0", "-p", packagePort], {
  cwd: repoRoot,
  env: {
    ...childEnv,
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
    PPS_PUBLIC_HOSTNAME: tailscaleHost,
  },
  stdio: "inherit",
});

void waitForServer(`http://localhost:${packagePort}/demo`).then((ready) => {
  if (!ready) {
    console.warn(`Demo package server did not become ready within the startup timeout.`);
    return;
  }

  openBrowser(`http://localhost:${packagePort}/demo`);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
