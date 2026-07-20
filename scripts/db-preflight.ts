import "dotenv/config";

import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type Args = {
  database?: string;
  report?: string;
  requireSandbox: boolean;
};

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();
const configuredDatabaseUrl = args.database ?? process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  fail("DATABASE_URL is not configured. Pass --database or set DATABASE_URL.");
}

const databasePath = resolveSqlitePath(configuredDatabaseUrl, repoRoot);
const liveDatabasePath = path.resolve(repoRoot, "..", "dev.db");
const repoDevDatabasePath = path.resolve(repoRoot, "dev.db");
const sandboxDatabasePath = path.resolve(repoRoot, "data", "dev-sandbox.db");
const classification = classifyDatabase(databasePath, {
  liveDatabasePath,
  repoDevDatabasePath,
  sandboxDatabasePath,
});

if (!fs.existsSync(databasePath)) {
  fail(`Database file does not exist: ${databasePath}`);
}

const stat = fs.statSync(databasePath);
const sha256 = hashFile(databasePath);
const db = new Database(databasePath, { readonly: true, fileMustExist: true });

try {
  const integrityCheck = db
    .prepare("PRAGMA integrity_check")
    .all()
    .map((row: unknown) => Object.values(row as Record<string, unknown>).join(" "));
  const foreignKeyCheck = db
    .prepare("PRAGMA foreign_key_check")
    .all() as Record<string, unknown>[];
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all() as { name: string }[];
  const tableCounts = Object.fromEntries(
    tables.map(({ name }) => [
      name,
      (db.prepare(`SELECT COUNT(*) AS count FROM "${name}"`).get() as { count: number }).count,
    ]),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    database: {
      configuredUrl: configuredDatabaseUrl,
      resolvedPath: databasePath,
      classification,
      bytes: stat.size,
      sha256,
      modifiedAt: stat.mtime.toISOString(),
    },
    checks: {
      integrityCheck,
      foreignKeyCheckRows: foreignKeyCheck.length,
      foreignKeyCheckSample: foreignKeyCheck.slice(0, 20),
    },
    tableCounts,
  };

  if (args.report) {
    const reportPath = path.resolve(repoRoot, args.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));

  if (args.requireSandbox && classification !== "SANDBOX_DEV") {
    fail(
      `Refusing to continue: --require-sandbox expected ${sandboxDatabasePath}, got ${databasePath} (${classification}).`,
    );
  }
} finally {
  db.close();
}

function parseArgs(argv: string[]): Args {
  const parsed: Args = { requireSandbox: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--database") {
      parsed.database = argv[++index];
      continue;
    }

    if (arg === "--report") {
      parsed.report = argv[++index];
      continue;
    }

    if (arg === "--require-sandbox") {
      parsed.requireSandbox = true;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function resolveSqlitePath(databaseUrl: string, baseDir: string) {
  if (!databaseUrl.startsWith("file:")) {
    fail(`Only SQLite file: URLs are supported by this preflight. Received: ${databaseUrl}`);
  }

  const rawPath = databaseUrl.slice("file:".length);
  return path.resolve(baseDir, rawPath);
}

function classifyDatabase(
  databasePath: string,
  paths: {
    liveDatabasePath: string;
    repoDevDatabasePath: string;
    sandboxDatabasePath: string;
  },
) {
  const normalized = path.normalize(databasePath).toLowerCase();

  if (normalized === path.normalize(paths.liveDatabasePath).toLowerCase()) {
    return "PROTECTED_LIVE";
  }

  if (normalized === path.normalize(paths.repoDevDatabasePath).toLowerCase()) {
    return "LEGACY_REPO_DEV";
  }

  if (normalized === path.normalize(paths.sandboxDatabasePath).toLowerCase()) {
    return "SANDBOX_DEV";
  }

  return "CUSTOM";
}

function hashFile(filePath: string) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
