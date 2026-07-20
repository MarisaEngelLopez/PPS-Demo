import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Mode = "dry-run" | "apply";

const defaultDatabaseUrl = "file:./data/pps-demo-package.db";
const protectedDatabaseNames = new Set(["dev.db", "dev-sandbox.db"]);
const schemaTemplateDatabase = path.resolve(process.cwd(), "data/dev-sandbox.db");
const referenceTables = [
  "Status",
  "StatusScope",
  "StatusUsage",
  "ProjectType",
  "TaskFamily",
  "Phase",
  "Workstream",
  "EventType",
  "RiskCategory",
  "EvidenceType",
];

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArg(name: string) {
  return process.argv.includes(name);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function resolveDatabaseUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    fail("Only SQLite file: database URLs are supported.");
  }

  const rawPath = databaseUrl.slice(5);
  const databasePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);

  return {
    databasePath,
    databaseUrl: `file:${databasePath.replaceAll("\\", "/")}`,
  };
}

function runStep(
  label: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  options: { allowFailure?: boolean } = {},
) {
  console.log(`\n[package-db] ${label}`);
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    shell: false,
    stdio: "inherit",
  });

  if (result.error) {
    if (options.allowFailure) {
      console.warn(`${label} failed: ${result.error.message}`);
      return false;
    }
    throw result.error;
  }
  if (result.status !== 0) {
    if (options.allowFailure) {
      console.warn(`${label} failed with exit code ${result.status ?? "unknown"}.`);
      return false;
    }
    fail(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
  return true;
}

function runNodeStep(
  label: string,
  entrypoint: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  options: { allowFailure?: boolean } = {},
) {
  return runStep(label, process.execPath, [entrypoint, ...args], env, options);
}

function initializeSchemaFromTemplate(targetDatabasePath: string) {
  if (!fs.existsSync(schemaTemplateDatabase)) {
    fail(
      `Schema fallback failed: template database not found at ${schemaTemplateDatabase}.`,
    );
  }

  console.log("\n[package-db] Initialize schema from current sandbox schema");
  console.log(`> source ${schemaTemplateDatabase}`);
  console.log(`> target ${targetDatabasePath}`);

  const db = new Database(targetDatabasePath);

  try {
    db.pragma("foreign_keys = OFF");
    db.prepare("ATTACH DATABASE ? AS source").run(schemaTemplateDatabase);

    const schemaRows = db
      .prepare(
        `
          SELECT type, name, sql
          FROM source.sqlite_schema
          WHERE sql IS NOT NULL
            AND name NOT LIKE 'sqlite_%'
          ORDER BY
            CASE type
              WHEN 'table' THEN 1
              WHEN 'index' THEN 2
              WHEN 'trigger' THEN 3
              WHEN 'view' THEN 4
              ELSE 5
            END,
            name
        `,
      )
      .all() as Array<{ type: string; name: string; sql: string }>;

    const applySchema = db.transaction(() => {
      for (const row of schemaRows) {
        db.exec(row.sql);
      }

      const migrationTableExists = db
        .prepare(
          "SELECT 1 FROM source.sqlite_schema WHERE type = 'table' AND name = '_prisma_migrations'",
        )
        .get();

      if (migrationTableExists) {
        db.exec("INSERT INTO main._prisma_migrations SELECT * FROM source._prisma_migrations");
      }
    });

    applySchema();
  } finally {
    try {
      db.prepare("DETACH DATABASE source").run();
    } catch {
      // The database may not have been attached if initialization failed early.
    }
    db.close();
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function copyReferenceDataFromTemplate(targetDatabasePath: string) {
  if (!fs.existsSync(schemaTemplateDatabase)) {
    fail(
      `Reference data copy failed: template database not found at ${schemaTemplateDatabase}.`,
    );
  }

  console.log("\n[package-db] Copy reference/configuration data");
  console.log(`> source ${schemaTemplateDatabase}`);
  console.log(`> target ${targetDatabasePath}`);

  const db = new Database(targetDatabasePath);

  try {
    db.pragma("foreign_keys = OFF");
    db.prepare("ATTACH DATABASE ? AS source").run(schemaTemplateDatabase);

    const copyReferenceTables = db.transaction(() => {
      for (const table of referenceTables) {
        const tableExists = db
          .prepare(
            "SELECT 1 FROM source.sqlite_schema WHERE type = 'table' AND name = ?",
          )
          .get(table);

        if (!tableExists) {
          console.warn(`[package-db] Reference table missing in source: ${table}`);
          continue;
        }

        const quoted = quoteIdentifier(table);
        db.exec(`DELETE FROM main.${quoted}`);
        db.exec(`INSERT INTO main.${quoted} SELECT * FROM source.${quoted}`);
      }
    });

    copyReferenceTables();
  } finally {
    try {
      db.prepare("DETACH DATABASE source").run();
    } catch {
      // The database may not have been attached if initialization failed early.
    }
    db.close();
  }
}

async function verifyPackageDatabase(databaseUrl: string) {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const [projects, organizations, authUsers, liveProjects, liveOrganizations] =
      await Promise.all([
        prisma.project.findMany({
          select: {
            projectCode: true,
            name: true,
            workspace: { select: { code: true } },
          },
          orderBy: { projectCode: "asc" },
        }),
        prisma.organization.findMany({
          select: {
            code: true,
            name: true,
            workspace: { select: { code: true } },
          },
          orderBy: { code: "asc" },
        }),
        prisma.authUser.findMany({
          select: { email: true, name: true, appUserId: true },
          orderBy: { email: "asc" },
        }),
        prisma.project.count({ where: { workspace: { code: "LIVE" } } }),
        prisma.organization.count({ where: { workspace: { code: "LIVE" } } }),
      ]);

    if (liveProjects > 0 || liveOrganizations > 0) {
      fail(
        `Package DB verification failed: LIVE records found. Projects=${liveProjects}, organizations=${liveOrganizations}.`,
      );
    }

    const unexpectedProjects = projects.filter(
      (project) => project.workspace?.code !== "DEMO",
    );
    if (unexpectedProjects.length > 0) {
      fail(
        `Package DB verification failed: non-DEMO projects found: ${unexpectedProjects
          .map((project) => project.projectCode)
          .join(", ")}`,
      );
    }

    return {
      projects: projects.map((project) => ({
        code: project.projectCode,
        name: project.name,
        workspace: project.workspace?.code ?? null,
      })),
      organizations: organizations.map((organization) => ({
        code: organization.code,
        name: organization.name,
        workspace: organization.workspace?.code ?? null,
      })),
      authUsers,
      liveProjects,
      liveOrganizations,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const databaseArg = argValue("--database") ?? defaultDatabaseUrl;
  const dryRun = hasArg("--dry-run");
  const apply = hasArg("--apply");
  const overwrite = hasArg("--overwrite");

  if (dryRun === apply) fail("Choose exactly one mode: --dry-run or --apply.");

  const mode: Mode = apply ? "apply" : "dry-run";
  const { databasePath, databaseUrl } = resolveDatabaseUrl(databaseArg);
  const databaseName = path.basename(databasePath).toLowerCase();

  if (protectedDatabaseNames.has(databaseName)) {
    fail(`Refusing to create package DB at protected database name: ${databaseName}`);
  }

  const plan = {
    mode,
    databasePath,
    databaseUrl,
    exists: fs.existsSync(databasePath),
    overwrite,
    steps: [
      "create empty SQLite database from Prisma migrations or schema-copy fallback",
      "copy reference/configuration lookup rows",
      "apply V3.3 security/workspace seed",
      "create/reset DEMO login user",
      "apply DEMO workspace seed",
      "apply DEMO 001 story seed",
      "apply DEMO 003 story seed",
      "reset DEMO login password after content seeding",
      "verify no LIVE projects or organizations",
    ],
  };

  if (mode === "dry-run") {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  if (fs.existsSync(databasePath)) {
    if (!overwrite) {
      fail(`Package database already exists: ${databasePath}. Use --overwrite to rebuild it.`);
    }
    fs.unlinkSync(databasePath);
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: "http://localhost:3001",
  };
  const prismaCli = path.resolve(process.cwd(), "node_modules/prisma/build/index.js");
  const tsxCli = path.resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs");

  const migrated = runNodeStep(
    "Apply Prisma migrations",
    prismaCli,
    ["migrate", "deploy"],
    env,
    { allowFailure: true },
  );
  if (!migrated) {
    if (fs.existsSync(databasePath)) fs.unlinkSync(databasePath);
    initializeSchemaFromTemplate(databasePath);
  }
  copyReferenceDataFromTemplate(databasePath);
  runNodeStep("Seed V3.3 security/workspace data", tsxCli, [
    "scripts/migrations/v3_3_security_seed_backfill.ts",
    "--database",
    databaseUrl,
    "--apply",
  ], env);
  runNodeStep("Create/reset DEMO login", tsxCli, [
    "scripts/auth-bootstrap-demo.ts",
    "--database",
    databaseUrl,
    "--apply",
    "--reset-password",
  ], env);
  runNodeStep("Seed DEMO workspace data", tsxCli, [
    "scripts/migrations/v3_3_demo_workspace_seed.ts",
    "--database",
    databaseUrl,
    "--apply",
    "--allow-non-sandbox",
  ], env);
  runNodeStep("Seed DEMO 001 story", tsxCli, [
    "scripts/migrations/v3_3_demo_001_story_polish.ts",
    "--database",
    databaseUrl,
    "--apply",
    "--allow-non-sandbox",
  ], env);
  runNodeStep("Seed DEMO 003 story", tsxCli, [
    "scripts/migrations/v3_3_demo_003_operating_model_showcase.ts",
    "--database",
    databaseUrl,
    "--apply",
    "--allow-non-sandbox",
  ], env);
  runNodeStep("Reset DEMO login", tsxCli, [
    "scripts/auth-bootstrap-demo.ts",
    "--database",
    databaseUrl,
    "--apply",
    "--reset-password",
  ], env);

  const verification = await verifyPackageDatabase(databaseUrl);
  console.log(JSON.stringify({ ...plan, verification }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
