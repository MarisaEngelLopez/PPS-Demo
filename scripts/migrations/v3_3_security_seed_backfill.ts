import "dotenv/config";

import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type Args = {
  database?: string;
  dryRun: boolean;
  apply: boolean;
  report?: string;
  approvedFingerprint?: string;
  allowLiveApply: boolean;
};

type DatabaseClassification = "PROTECTED_LIVE" | "LEGACY_REPO_DEV" | "SANDBOX_DEV" | "CUSTOM";

const REQUIRED_TABLES = [
  "Workspace",
  "Role",
  "WorkspaceMembership",
  "Project",
  "Organization",
  "User",
] as const;

const REQUIRED_ROLES = [
  { code: "OWNER_ADMIN", name: "Owner administrator" },
  { code: "PROJECT_MANAGER", name: "Project manager" },
  { code: "DEMO_OPERATOR", name: "Demo operator" },
  { code: "DEMO_VIEWER", name: "Demo viewer" },
] as const;

const REQUIRED_WORKSPACES = [
  { code: "LIVE", name: "Live workspace", type: "LIVE" },
  { code: "DEMO", name: "Demo workspace", type: "DEMO" },
] as const;

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();

if (!args.database) {
  fail("Pass --database explicitly. This script never silently defaults to DATABASE_URL.");
}

if (args.dryRun === args.apply) {
  fail("Pass exactly one mode: --dry-run or --apply.");
}

const databasePath = resolveSqlitePath(args.database, repoRoot);
const classification = classifyDatabase(databasePath, repoRoot);

if (!fs.existsSync(databasePath)) {
  fail(`Database file does not exist: ${databasePath}`);
}

const fingerprint = hashFile(databasePath);

if (args.approvedFingerprint && args.approvedFingerprint !== fingerprint) {
  fail(
    `Approved fingerprint mismatch. Expected ${args.approvedFingerprint}, actual ${fingerprint}.`,
  );
}

if (args.apply && classification === "PROTECTED_LIVE" && !args.allowLiveApply) {
  fail("Refusing --apply on PROTECTED_LIVE without --allow-live-apply.");
}

if (args.apply && classification === "PROTECTED_LIVE" && !args.approvedFingerprint) {
  fail("Refusing --apply on PROTECTED_LIVE without --approved-fingerprint.");
}

const db = new Database(databasePath, {
  readonly: args.dryRun,
  fileMustExist: true,
});

try {
  const missingTables = REQUIRED_TABLES.filter((tableName) => !tableExists(db, tableName));
  const missingColumns = [
    ["Project", "workspaceId"],
    ["Organization", "workspaceId"],
  ].filter(([tableName, columnName]) => tableExists(db, tableName) && !columnExists(db, tableName, columnName));

  const report = {
    reportType: "V3_3_SECURITY_SEED_BACKFILL",
    generatedAt: new Date().toISOString(),
    mode: args.dryRun ? "dry-run" : "apply",
    database: {
      configuredUrl: args.database,
      resolvedPath: databasePath,
      classification,
      sha256: fingerprint,
      bytes: fs.statSync(databasePath).size,
      modifiedAt: fs.statSync(databasePath).mtime.toISOString(),
    },
    gates: {
      missingTables,
      missingColumns: missingColumns.map(([tableName, columnName]) => `${tableName}.${columnName}`),
      canRunDataPlan: missingTables.length === 0 && missingColumns.length === 0,
    },
    plan: {
      roles: REQUIRED_ROLES,
      workspaces: REQUIRED_WORKSPACES,
      liveProjectBackfill: "Set Project.workspaceId to LIVE only where workspaceId is NULL.",
      organizationBackfill: "Set Organization.workspaceId to LIVE only where workspaceId is NULL.",
      ownerBootstrap:
        "Create OWNER_ADMIN workspace memberships only after operator supplies an approved owner User.id in a later script revision.",
      demoFixtures:
        "Create synthetic DEMO records only after fixture scope is approved. Never copy LIVE records into DEMO.",
    },
    results: {
      rolesUpserted: 0,
      workspacesUpserted: 0,
      projectsAssignedToLive: 0,
      organizationsAssignedToLive: 0,
    },
    warnings: [] as string[],
  };

  if (!report.gates.canRunDataPlan) {
    report.warnings.push(
      "V3.3 security schema is not present yet. This script is intentionally scaffolded and made no data changes.",
    );
    writeReport(report);
    console.log(summary(report));
    process.exitCode = args.apply ? 2 : 0;
  } else if (args.dryRun) {
    report.results.rolesUpserted = REQUIRED_ROLES.length;
    report.results.workspacesUpserted = REQUIRED_WORKSPACES.length;
    report.results.projectsAssignedToLive = scalar<number>(
      db,
      'SELECT COUNT(*) FROM "Project" WHERE "workspaceId" IS NULL',
    );
    report.results.organizationsAssignedToLive = scalar<number>(
      db,
      'SELECT COUNT(*) FROM "Organization" WHERE "workspaceId" IS NULL',
    );
    writeReport(report);
    console.log(summary(report));
  } else {
    db.transaction(() => {
      for (const role of REQUIRED_ROLES) {
        upsertRole(db, role);
      }

      for (const workspace of REQUIRED_WORKSPACES) {
        upsertWorkspace(db, workspace);
      }

      const liveWorkspace = db
        .prepare('SELECT id FROM "Workspace" WHERE code = ?')
        .get("LIVE") as { id: string } | undefined;

      if (!liveWorkspace) {
        throw new Error("LIVE workspace was not found after upsert.");
      }

      report.results.rolesUpserted = REQUIRED_ROLES.length;
      report.results.workspacesUpserted = REQUIRED_WORKSPACES.length;
      report.results.projectsAssignedToLive = runUpdate(
        db,
        'UPDATE "Project" SET "workspaceId" = ? WHERE "workspaceId" IS NULL',
        [liveWorkspace.id],
      );
      report.results.organizationsAssignedToLive = runUpdate(
        db,
        'UPDATE "Organization" SET "workspaceId" = ? WHERE "workspaceId" IS NULL',
        [liveWorkspace.id],
      );
    })();

    writeReport(report);
    console.log(summary(report));
  }
} finally {
  db.close();
}

function parseArgs(argv: string[]): Args {
  const parsed: Args = { dryRun: false, apply: false, allowLiveApply: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--database") {
      parsed.database = argv[++index];
      continue;
    }

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (arg === "--apply") {
      parsed.apply = true;
      continue;
    }

    if (arg === "--report") {
      parsed.report = argv[++index];
      continue;
    }

    if (arg === "--approved-fingerprint") {
      parsed.approvedFingerprint = argv[++index];
      continue;
    }

    if (arg === "--allow-live-apply") {
      parsed.allowLiveApply = true;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function resolveSqlitePath(databaseUrl: string, baseDir: string) {
  if (!databaseUrl.startsWith("file:")) {
    fail(`Only SQLite file: URLs are supported. Received: ${databaseUrl}`);
  }

  return path.resolve(baseDir, databaseUrl.slice("file:".length));
}

function classifyDatabase(databasePath: string, root: string): DatabaseClassification {
  const normalized = path.normalize(databasePath).toLowerCase();
  const live = path.normalize(path.resolve(root, "..", "dev.db")).toLowerCase();
  const repoDev = path.normalize(path.resolve(root, "dev.db")).toLowerCase();
  const sandbox = path.normalize(path.resolve(root, "data", "dev-sandbox.db")).toLowerCase();

  if (normalized === live) return "PROTECTED_LIVE";
  if (normalized === repoDev) return "LEGACY_REPO_DEV";
  if (normalized === sandbox) return "SANDBOX_DEV";
  return "CUSTOM";
}

function tableExists(db: Database.Database, tableName: string) {
  return Boolean(
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
      .get(tableName),
  );
}

function columnExists(db: Database.Database, tableName: string, columnName: string) {
  return db
    .prepare(`PRAGMA table_info("${tableName}")`)
    .all()
    .some((row: unknown) => (row as { name: string }).name === columnName);
}

function scalar<T>(db: Database.Database, sql: string) {
  const row = db.prepare(sql).get() as Record<string, T>;
  return Object.values(row)[0];
}

function runUpdate(db: Database.Database, sql: string, parameters: unknown[]) {
  return db.prepare(sql).run(...parameters).changes;
}

function upsertRole(db: Database.Database, role: (typeof REQUIRED_ROLES)[number]) {
  db.prepare(
    `
      INSERT INTO "Role" (id, code, name, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        isActive = 1,
        updatedAt = CURRENT_TIMESTAMP
    `,
  ).run(crypto.randomUUID(), role.code, role.name);
}

function upsertWorkspace(
  db: Database.Database,
  workspace: (typeof REQUIRED_WORKSPACES)[number],
) {
  db.prepare(
    `
      INSERT INTO "Workspace" (id, code, name, type, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        isActive = 1,
        updatedAt = CURRENT_TIMESTAMP
    `,
  ).run(crypto.randomUUID(), workspace.code, workspace.name, workspace.type);
}

function writeReport(report: Record<string, unknown>) {
  if (!args.report) return;
  const reportPath = path.resolve(repoRoot, args.report);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function summary(report: {
  mode: string;
  database: { classification: string; resolvedPath: string };
  gates: { canRunDataPlan: boolean; missingTables: readonly string[]; missingColumns: readonly string[] };
  results: Record<string, number>;
  warnings: readonly string[];
}) {
  return [
    `V3.3 security seed/backfill ${report.mode}: ${report.database.classification}`,
    `Database: ${report.database.resolvedPath}`,
    `Can run data plan: ${report.gates.canRunDataPlan}`,
    `Missing tables: ${report.gates.missingTables.join(", ") || "none"}`,
    `Missing columns: ${report.gates.missingColumns.join(", ") || "none"}`,
    `Results: ${JSON.stringify(report.results)}`,
    ...report.warnings.map((warning) => `Warning: ${warning}`),
  ].join("\n");
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
