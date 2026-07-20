import "dotenv/config";

import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type Args = {
  database?: string;
  report?: string;
  allowLiveRead: boolean;
  quiet: boolean;
};

type DatabaseClassification = "PROTECTED_LIVE" | "LEGACY_REPO_DEV" | "SANDBOX_DEV" | "CUSTOM";

type OrphanCheck = {
  name: string;
  childTable: string;
  childColumn: string;
  parentTable: string;
  count: number;
  sample: Record<string, unknown>[];
};

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();
const configuredDatabaseUrl = args.database ?? process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  fail("DATABASE_URL is not configured. Pass --database explicitly.");
}

const databasePath = resolveSqlitePath(configuredDatabaseUrl, repoRoot);
const classification = classifyDatabase(databasePath, repoRoot);

if (classification === "PROTECTED_LIVE" && !args.allowLiveRead) {
  fail(
    "Refusing to inventory PROTECTED_LIVE without --allow-live-read. Use a sandbox/rehearsal copy for WP1 by default.",
  );
}

if (!fs.existsSync(databasePath)) {
  fail(`Database file does not exist: ${databasePath}`);
}

const stat = fs.statSync(databasePath);
const db = new Database(databasePath, { readonly: true, fileMustExist: true });

try {
  const tables = getTableNames(db);
  const tableCounts = Object.fromEntries(
    tables.map((tableName) => [tableName, scalar<number>(db, `SELECT COUNT(*) FROM "${tableName}"`)]),
  );
  const orphanChecks = buildOrphanChecks(db).filter((check) => check.count > 0);
  const report = {
    reportType: "V3_3_SECURITY_WP1_INVENTORY",
    generatedAt: new Date().toISOString(),
    database: {
      configuredUrl: configuredDatabaseUrl,
      resolvedPath: databasePath,
      classification,
      bytes: stat.size,
      sha256: hashFile(databasePath),
      modifiedAt: stat.mtime.toISOString(),
    },
    checks: {
      integrityCheck: pragmaRows(db, "integrity_check").map((row) =>
        Object.values(row).join(" "),
      ),
      foreignKeyCheck: pragmaRows(db, "foreign_key_check"),
      orphanCheckFailureCount: orphanChecks.length,
    },
    prisma: {
      migrationCount: tableExists(db, "_prisma_migrations")
        ? scalar<number>(db, 'SELECT COUNT(*) FROM "_prisma_migrations"')
        : 0,
      migrations: tableExists(db, "_prisma_migrations") ? getMigrationHistory(db) : [],
    },
    tableCounts,
    inventory: {
      users: rows(db, `
        SELECT
          u.id,
          u.email,
          u.fullName,
          u.preferredLanguage,
          (SELECT COUNT(*) FROM "WorkSession" ws WHERE ws.userId = u.id) AS workSessionCount,
          (SELECT COUNT(*) FROM "WorkSession" convertedWs WHERE convertedWs.userId = u.id AND convertedWs.convertedTimeEntryId IS NOT NULL) AS convertedTimeEntryCount,
          (SELECT COUNT(*) FROM "ProjectRisk" pr WHERE pr.ownerId = u.id) AS ownedRiskCount,
          (SELECT COUNT(*) FROM "ProjectRiskAction" pra WHERE pra.ownerId = u.id) AS ownedRiskActionCount,
          (SELECT COUNT(*) FROM "AgentInstruction" ai WHERE ai.userId = u.id) AS agentInstructionCount,
          (SELECT COUNT(*) FROM "AgentApproval" aa WHERE aa.approverUserId = u.id) AS agentApprovalCount
        FROM "User" u
        ORDER BY u.fullName, u.email
      `),
      ownerCandidates: rows(db, `
        SELECT
          u.id,
          u.email,
          u.fullName,
          u.preferredLanguage,
          (SELECT COUNT(*) FROM "WorkSession" ws WHERE ws.userId = u.id) AS workSessionCount,
          (SELECT COUNT(*) FROM "AgentInstruction" ai WHERE ai.userId = u.id) AS agentInstructionCount,
          (SELECT COUNT(*) FROM "AgentApproval" aa WHERE aa.approverUserId = u.id) AS agentApprovalCount,
          (SELECT COUNT(*) FROM "AgentActionLog" aal WHERE aal.actorUserId = u.id) AS agentActionLogCount
        FROM "User" u
        ORDER BY workSessionCount DESC, agentInstructionCount DESC, u.fullName
      `),
      projects: rows(db, `
        SELECT
          p.id,
          p.projectCode,
          p.name,
          p.isActive,
          p.governedStatusId,
          s.code AS governedStatusCode,
          pt.code AS projectTypeCode,
          (SELECT COUNT(*) FROM "ProjectWorkstream" pw WHERE pw.projectId = p.id) AS workstreamCount,
          (SELECT COUNT(*) FROM "ProjectEvent" pe WHERE pe.projectId = p.id) AS eventCount,
          (SELECT COUNT(*) FROM "TimeEntry" te WHERE te.projectId = p.id) AS timeEntryCount,
          (SELECT COUNT(*) FROM "WorkSession" ws WHERE ws.projectId = p.id) AS workSessionCount,
          (SELECT COUNT(*) FROM "ProjectRisk" pr WHERE pr.projectId = p.id) AS riskCount,
          (SELECT COUNT(*) FROM "ProjectDecision" pd WHERE pd.projectId = p.id) AS decisionCount,
          (SELECT COUNT(*) FROM "ProjectReportingPack" rp WHERE rp.projectId = p.id) AS reportingPackCount,
          (SELECT COUNT(*) FROM "CustomerDna" cd WHERE cd.projectId = p.id) AS customerDnaCount
        FROM "Project" p
        LEFT JOIN "Status" s ON s.id = p.governedStatusId
        LEFT JOIN "ProjectType" pt ON pt.id = p.projectTypeId
        ORDER BY p.projectCode, p.name
      `),
      organizations: rows(db, `
        SELECT
          o.id,
          o.code,
          o.name,
          o.organizationType,
          o.isActive,
          (SELECT COUNT(*) FROM "OrganizationContact" c WHERE c.organizationId = o.id) AS contactCount,
          (SELECT COUNT(*) FROM "Project" issuer WHERE issuer.issuerOrganizationId = o.id) AS issuerProjectCount,
          (SELECT COUNT(*) FROM "Project" client WHERE client.clientOrganizationId = o.id) AS clientProjectCount,
          (SELECT COUNT(*) FROM "Project" delivery WHERE delivery.deliveryOrganizationId = o.id) AS deliveryProjectCount,
          (SELECT COUNT(*) FROM "ExecutiveIntelligence" ei WHERE ei.organizationId = o.id) AS executiveIntelligenceCount
        FROM "Organization" o
        ORDER BY o.name
      `),
      contacts: rows(db, `
        SELECT
          c.id,
          c.organizationId,
          o.name AS organizationName,
          c.name,
          c.email,
          c.roleTitle,
          c.isSponsor,
          c.isActive,
          (SELECT COUNT(*) FROM "Project" managerProject WHERE managerProject.projectManagerContactId = c.id) AS managedProjectCount,
          (SELECT COUNT(*) FROM "Project" sponsorProject WHERE sponsorProject.sponsorContactId = c.id) AS sponsoredProjectCount,
          (SELECT COUNT(*) FROM "ExecutiveIntelligence" ei WHERE ei.contactId = c.id) AS executiveIntelligenceCount
        FROM "OrganizationContact" c
        LEFT JOIN "Organization" o ON o.id = c.organizationId
        ORDER BY o.name, c.name
      `),
      statusUsage: rows(db, `
        SELECT
          ss.code AS scopeCode,
          s.code AS statusCode,
          s.name AS statusName,
          su.isDefault,
          su.isActive,
          su.sortOrder
        FROM "StatusUsage" su
        JOIN "Status" s ON s.id = su.statusId
        JOIN "StatusScope" ss ON ss.id = su.scopeId
        ORDER BY ss.code, su.sortOrder, s.code
      `),
      duplicateCodes: buildDuplicateCodeInventory(db),
      nullableRelationCoverage: buildNullableRelationCoverage(db),
      destructiveScriptWarnings: {
        deleteTestProjectsScriptPresent: fs.existsSync(path.resolve(repoRoot, "scripts", "delete-test-projects.ts")),
        prismaSeedConfiguredButMissing: !fs.existsSync(path.resolve(repoRoot, "prisma", "seed.ts")),
      },
    },
    relationshipHealth: {
      orphanChecks,
    },
    operatorDecisionsRequired: [
      "Approve the canonical live database fingerprint before any production migration.",
      "Approve the owner User.id for OWNER_ADMIN bootstrap.",
      "Decide whether Organization and OrganizationContact receive direct workspaceId in V3.3.",
      "Decide whether ProjectMembership is required in the first security migration or deferred.",
      "Approve synthetic demo fixture scope before any Demo Viewer invitation.",
    ],
  };

  if (args.report) {
    const reportPath = path.resolve(repoRoot, args.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (args.quiet) {
    console.log(
      [
        `WP1 inventory complete: ${report.database.classification}`,
        `Database: ${report.database.resolvedPath}`,
        `Integrity: ${report.checks.integrityCheck.join(", ")}`,
        `Foreign key rows: ${report.checks.foreignKeyCheck.length}`,
        `Orphan check failures: ${orphanChecks.length}`,
        args.report ? `Report: ${path.resolve(repoRoot, args.report)}` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  if (report.checks.foreignKeyCheck.length > 0 || orphanChecks.length > 0) {
    process.exitCode = 2;
  }
} finally {
  db.close();
}

function parseArgs(argv: string[]): Args {
  const parsed: Args = { allowLiveRead: false, quiet: false };

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

    if (arg === "--allow-live-read") {
      parsed.allowLiveRead = true;
      continue;
    }

    if (arg === "--quiet") {
      parsed.quiet = true;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function resolveSqlitePath(databaseUrl: string, baseDir: string) {
  if (!databaseUrl.startsWith("file:")) {
    fail(`Only SQLite file: URLs are supported by this inventory. Received: ${databaseUrl}`);
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

function getTableNames(db: Database.Database) {
  return rows<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).map((row) => row.name);
}

function tableExists(db: Database.Database, tableName: string) {
  return Boolean(
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
      .get(tableName),
  );
}

function columnExists(db: Database.Database, tableName: string, columnName: string) {
  if (!tableExists(db, tableName)) return false;
  return pragmaRows(db, `table_info("${tableName}")`).some((row) => row.name === columnName);
}

function rows<T extends Record<string, unknown> = Record<string, unknown>>(
  db: Database.Database,
  sql: string,
  parameters: unknown[] = [],
) {
  return db.prepare(sql).all(...parameters) as T[];
}

function scalar<T>(db: Database.Database, sql: string, parameters: unknown[] = []) {
  const row = db.prepare(sql).get(...parameters) as Record<string, T>;
  return Object.values(row)[0];
}

function pragmaRows(db: Database.Database, pragmaName: string) {
  return db.prepare(`PRAGMA ${pragmaName}`).all() as Record<string, unknown>[];
}

function getMigrationHistory(db: Database.Database) {
  return rows(db, `
    SELECT
      migration_name,
      started_at,
      finished_at,
      rolled_back_at,
      applied_steps_count
    FROM "_prisma_migrations"
    ORDER BY started_at
  `);
}

function buildOrphanChecks(db: Database.Database): OrphanCheck[] {
  const checks: Array<Omit<OrphanCheck, "count" | "sample">> = [
    rel("Project governed status", "Project", "governedStatusId", "Status"),
    rel("Project type", "Project", "projectTypeId", "ProjectType"),
    rel("Project issuer organization", "Project", "issuerOrganizationId", "Organization"),
    rel("Project client organization", "Project", "clientOrganizationId", "Organization"),
    rel("Project delivery organization", "Project", "deliveryOrganizationId", "Organization"),
    rel("Project manager contact", "Project", "projectManagerContactId", "OrganizationContact"),
    rel("Project sponsor contact", "Project", "sponsorContactId", "OrganizationContact"),
    rel("ProjectWorkstream project", "ProjectWorkstream", "projectId", "Project"),
    rel("ProjectWorkstream workstream", "ProjectWorkstream", "workstreamId", "Workstream"),
    rel("ProjectWorkstream governed status", "ProjectWorkstream", "governedStatusId", "Status"),
    rel("ProjectEvent project", "ProjectEvent", "projectId", "Project"),
    rel("ProjectEvent type", "ProjectEvent", "eventTypeId", "EventType"),
    rel("ProjectEvent linked workstream", "ProjectEvent", "linkedProjectWorkstreamId", "ProjectWorkstream"),
    rel("ProjectTask workstream", "ProjectTask", "projectWorkstreamId", "ProjectWorkstream"),
    rel("ProjectTask parent", "ProjectTask", "parentTaskId", "ProjectTask"),
    rel("TimeEntry project", "TimeEntry", "projectId", "Project"),
    rel("TimeEntry workstream", "TimeEntry", "projectWorkstreamId", "ProjectWorkstream"),
    rel("TimeEntry task family", "TimeEntry", "taskFamilyId", "TaskFamily"),
    rel("TimeEntry task", "TimeEntry", "projectTaskId", "ProjectTask"),
    rel("WorkSession user", "WorkSession", "userId", "User"),
    rel("WorkSession project", "WorkSession", "projectId", "Project"),
    rel("WorkSession workstream", "WorkSession", "projectWorkstreamId", "ProjectWorkstream"),
    rel("WorkSession task family", "WorkSession", "taskFamilyId", "TaskFamily"),
    rel("WorkSession task", "WorkSession", "projectTaskId", "ProjectTask"),
    rel("WorkSession status", "WorkSession", "statusId", "Status"),
    rel("ProjectRisk project", "ProjectRisk", "projectId", "Project"),
    rel("ProjectRisk workstream", "ProjectRisk", "projectWorkstreamId", "ProjectWorkstream"),
    rel("ProjectRisk category", "ProjectRisk", "categoryId", "RiskCategory"),
    rel("ProjectRisk status", "ProjectRisk", "statusId", "Status"),
    rel("ProjectRisk owner", "ProjectRisk", "ownerId", "User"),
    rel("RiskAssessment risk", "RiskAssessment", "riskId", "ProjectRisk"),
    rel("RiskAssessment assessed by", "RiskAssessment", "assessedByUserId", "User"),
    rel("RiskReview risk", "RiskReview", "riskId", "ProjectRisk"),
    rel("RiskReview residual assessment", "RiskReview", "residualAssessmentId", "RiskAssessment"),
    rel("RiskReview type", "RiskReview", "reviewTypeId", "RiskReviewType"),
    rel("RiskReview outcome", "RiskReview", "reviewOutcomeId", "RiskReviewOutcome"),
    rel("RiskReview reviewed by", "RiskReview", "reviewedByUserId", "User"),
    rel("ProjectRiskAction risk", "ProjectRiskAction", "projectRiskId", "ProjectRisk"),
    rel("ProjectRiskAction owner", "ProjectRiskAction", "ownerId", "User"),
    rel("ProjectRiskAction status", "ProjectRiskAction", "statusId", "Status"),
    rel("RiskActionEvidence action", "RiskActionEvidence", "riskActionId", "ProjectRiskAction"),
    rel("RiskActionEvidence type", "RiskActionEvidence", "evidenceTypeId", "EvidenceType"),
    rel("OrganizationContact organization", "OrganizationContact", "organizationId", "Organization"),
    rel("CustomerDna project", "CustomerDna", "projectId", "Project"),
    rel("CustomerDna owner", "CustomerDna", "ownerId", "User"),
    rel("CustomerDna created by", "CustomerDna", "createdByUserId", "User"),
    rel("ExecutiveIntelligence organization", "ExecutiveIntelligence", "organizationId", "Organization"),
    rel("ExecutiveIntelligence contact", "ExecutiveIntelligence", "contactId", "OrganizationContact"),
    rel("ExecutiveIntelligence created by", "ExecutiveIntelligence", "createdByUserId", "User"),
    rel("ProjectReportingPack project", "ProjectReportingPack", "projectId", "Project"),
    rel("ManagedNarrative project", "ManagedNarrative", "projectId", "Project"),
    rel("ManagedNarrativeRevision narrative", "ManagedNarrativeRevision", "narrativeId", "ManagedNarrative"),
    rel("ManagedNarrativeRevision source pack", "ManagedNarrativeRevision", "sourceReportingPackId", "ProjectReportingPack"),
    rel("ProjectDecision project", "ProjectDecision", "projectId", "Project"),
    rel("ProjectDecision workstream", "ProjectDecision", "projectWorkstreamId", "ProjectWorkstream"),
    rel("ProjectDecision status", "ProjectDecision", "statusId", "Status"),
    rel("RiskReviewDecisionLink review", "RiskReviewDecisionLink", "riskReviewId", "RiskReview"),
    rel("RiskReviewDecisionLink decision", "RiskReviewDecisionLink", "projectDecisionId", "ProjectDecision"),
    rel("StatusUsage status", "StatusUsage", "statusId", "Status"),
    rel("StatusUsage scope", "StatusUsage", "scopeId", "StatusScope"),
  ];

  return checks
      .filter(
        (check) =>
          tableExists(db, check.childTable) &&
          tableExists(db, check.parentTable) &&
          columnExists(db, check.childTable, check.childColumn),
      )
    .map((check) => {
      const where = `child."${check.childColumn}" IS NOT NULL AND parent.id IS NULL`;
      return {
        ...check,
        count: scalar<number>(
          db,
          `SELECT COUNT(*) FROM "${check.childTable}" child LEFT JOIN "${check.parentTable}" parent ON parent.id = child."${check.childColumn}" WHERE ${where}`,
        ),
        sample: rows(
          db,
          `SELECT child.id, child."${check.childColumn}" AS missingParentId FROM "${check.childTable}" child LEFT JOIN "${check.parentTable}" parent ON parent.id = child."${check.childColumn}" WHERE ${where} LIMIT 20`,
        ),
      };
    });
}

function rel(
  name: string,
  childTable: string,
  childColumn: string,
  parentTable: string,
): Omit<OrphanCheck, "count" | "sample"> {
  return { name, childTable, childColumn, parentTable };
}

function buildDuplicateCodeInventory(db: Database.Database) {
  const codeChecks = [
    ["Project", "projectCode"],
    ["ProjectRisk", "riskCode"],
    ["ProjectRiskAction", "actionCode"],
    ["ProjectDecision", "decisionCode"],
    ["Organization", "code"],
    ["Status", "code"],
    ["StatusScope", "code"],
    ["ProjectType", "code"],
    ["TaskFamily", "code"],
    ["EventType", "code"],
    ["RiskCategory", "code"],
    ["EvidenceType", "code"],
    ["RiskReviewType", "code"],
    ["RiskReviewOutcome", "code"],
  ];

  return Object.fromEntries(
    codeChecks
      .filter(([tableName]) => tableExists(db, tableName))
      .map(([tableName, columnName]) => [
        `${tableName}.${columnName}`,
        rows(
          db,
          `SELECT "${columnName}" AS code, COUNT(*) AS count FROM "${tableName}" WHERE "${columnName}" IS NOT NULL GROUP BY "${columnName}" HAVING COUNT(*) > 1 ORDER BY count DESC, code`,
        ),
      ]),
  );
}

function buildNullableRelationCoverage(db: Database.Database) {
  const nullableChecks = [
    ["Project", "projectTypeId"],
    ["Project", "issuerOrganizationId"],
    ["Project", "clientOrganizationId"],
    ["Project", "deliveryOrganizationId"],
    ["Project", "projectManagerContactId"],
    ["Project", "sponsorContactId"],
    ["ProjectWorkstream", "governedStatusId"],
    ["ProjectEvent", "eventTypeId"],
    ["ProjectEvent", "linkedProjectWorkstreamId"],
    ["TimeEntry", "projectTaskId"],
    ["AgentInstruction", "userId"],
    ["AgentInstruction", "projectId"],
    ["WorkSession", "taskFamilyId"],
    ["WorkSession", "projectTaskId"],
    ["ProjectRisk", "ownerId"],
    ["RiskAssessment", "assessedByUserId"],
    ["RiskReview", "reviewedByUserId"],
    ["ProjectRiskAction", "ownerId"],
    ["ExecutiveIntelligence", "contactId"],
    ["ExecutiveIntelligence", "createdByUserId"],
  ];

  return Object.fromEntries(
    nullableChecks
      .filter(([tableName, columnName]) => columnExists(db, tableName, columnName))
      .map(([tableName, columnName]) => {
        const total = scalar<number>(db, `SELECT COUNT(*) FROM "${tableName}"`);
        const populated = scalar<number>(
          db,
          `SELECT COUNT(*) FROM "${tableName}" WHERE "${columnName}" IS NOT NULL`,
        );
        return [
          `${tableName}.${columnName}`,
          {
            total,
            populated,
            nullCount: total - populated,
            populatedPercent: total === 0 ? 0 : Number(((populated / total) * 100).toFixed(2)),
          },
        ];
      }),
  );
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
