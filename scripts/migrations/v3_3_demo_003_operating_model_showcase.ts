import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

type Mode = "dry-run" | "apply";

const projectCode = "DEMO_003";
const ppsStudioCode = "DEMO-PPS-STUDIO";
const narrativeKeys = [
  "executive-summary",
  "progress-since-last-report",
  "accomplishments",
  "issues-concerns",
  "next-steps",
  "management-ask",
  "conclusion",
] as const;

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

function isSandboxPath(databasePath: string) {
  return path.basename(databasePath).toLowerCase() === "dev-sandbox.db";
}

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

const databaseArg = argValue("--database");
if (!databaseArg) fail("Missing required --database file:... argument.");

const dryRun = hasArg("--dry-run");
const apply = hasArg("--apply");
if (dryRun === apply) fail("Choose exactly one mode: --dry-run or --apply.");

const mode: Mode = apply ? "apply" : "dry-run";
const { databasePath, databaseUrl } = resolveDatabaseUrl(databaseArg);

if (!fs.existsSync(databasePath)) fail(`Database file does not exist: ${databasePath}`);
if (!isSandboxPath(databasePath) && !hasArg("--allow-non-sandbox")) {
  fail("DEMO 003 operating model seed refused: database is not dev-sandbox.db.");
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function requireReferenceData() {
  const [demoWorkspace, owner, digitalProduct] = await Promise.all([
    prisma.workspace.findUnique({ where: { code: "DEMO" } }),
    prisma.user.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.projectType.findUnique({ where: { code: "DP_INTPMO" } }),
  ]);

  if (!demoWorkspace) fail("Missing DEMO workspace. Run db:security-seed:v3-3 first.");
  if (!owner) fail("Missing operational User.");
  if (!digitalProduct) fail("Missing project type DP_INTPMO.");

  const statuses = await prisma.status.findMany({
    where: {
      code: {
        in: ["ACTIVE", "OPEN", "IN_PROGRESS", "COMPLETED", "APPROVED"],
      },
    },
  });
  const statusByCode = Object.fromEntries(statuses.map((item) => [item.code, item]));
  for (const code of ["ACTIVE", "OPEN", "IN_PROGRESS", "COMPLETED", "APPROVED"]) {
    if (!statusByCode[code]) fail(`Missing status: ${code}`);
  }

  const taskFamilies = await prisma.taskFamily.findMany({
    where: { code: { in: ["PLA", "REP", "RIS", "MEE", "KPI", "TES", "THI"] } },
  });
  const taskFamilyByCode = Object.fromEntries(taskFamilies.map((item) => [item.code, item]));
  for (const code of ["PLA", "REP", "RIS", "MEE", "KPI", "TES", "THI"]) {
    if (!taskFamilyByCode[code]) fail(`Missing task family: ${code}`);
  }

  const riskCategories = await prisma.riskCategory.findMany({
    where: { code: { in: ["STAKEHOLDER", "TECHNICAL", "OPERATIONAL", "QUALITY"] } },
  });
  const riskCategoryByCode = Object.fromEntries(
    riskCategories.map((item) => [item.code, item])
  );
  for (const code of ["STAKEHOLDER", "TECHNICAL", "OPERATIONAL", "QUALITY"]) {
    if (!riskCategoryByCode[code]) fail(`Missing risk category: ${code}`);
  }

  const eventTypes = await prisma.eventType.findMany();
  const eventTypeByCode = Object.fromEntries(eventTypes.map((item) => [item.code, item]));

  const requiredWorkstreams = [
    "Project Management",
    "Architecture",
    "Security",
    "Customer DNA",
    "Natural Language",
    "Mob function",
    "Board Pack Engine",
    "Back ups",
    "Deployment",
  ];
  const workstreams = await prisma.workstream.findMany({
    where: { name: { in: requiredWorkstreams }, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  function workstream(name: string) {
    const item = workstreams.find((row) => row.name === name);
    if (!item) fail(`Missing active workstream reference: ${name}`);
    return item;
  }

  return {
    demoWorkspace,
    owner,
    digitalProduct,
    statuses: statusByCode,
    taskFamilyByCode,
    riskCategoryByCode,
    eventTypeByCode,
    workstream,
  };
}

async function countProjectData(projectId: string) {
  const riskIds = (
    await prisma.projectRisk.findMany({ where: { projectId }, select: { id: true } })
  ).map((risk) => risk.id);
  return {
    projectWorkstreams: await prisma.projectWorkstream.count({ where: { projectId } }),
    projectEvents: await prisma.projectEvent.count({ where: { projectId } }),
    projectRisks: riskIds.length,
    projectRiskActions: riskIds.length
      ? await prisma.projectRiskAction.count({ where: { projectRiskId: { in: riskIds } } })
      : 0,
    projectDecisions: await prisma.projectDecision.count({ where: { projectId } }),
    timeEntries: await prisma.timeEntry.count({ where: { projectId } }),
    customerDna: await prisma.customerDna.count({ where: { projectId } }),
    reportingPacks: await prisma.projectReportingPack.count({ where: { projectId } }),
    managedNarratives: await prisma.managedNarrative.count({ where: { projectId } }),
  };
}

async function clearProjectData(projectId: string) {
  const riskIds = (
    await prisma.projectRisk.findMany({ where: { projectId }, select: { id: true } })
  ).map((risk) => risk.id);
  const riskReviewIds = riskIds.length
    ? (
        await prisma.riskReview.findMany({
          where: { riskId: { in: riskIds } },
          select: { id: true },
        })
      ).map((review) => review.id)
    : [];
  const riskActionIds = riskIds.length
    ? (
        await prisma.projectRiskAction.findMany({
          where: { projectRiskId: { in: riskIds } },
          select: { id: true },
        })
      ).map((action) => action.id)
    : [];
  const narrativeIds = (
    await prisma.managedNarrative.findMany({ where: { projectId }, select: { id: true } })
  ).map((narrative) => narrative.id);
  const workSessionIds = (
    await prisma.workSession.findMany({ where: { projectId }, select: { id: true } })
  ).map((session) => session.id);
  const instructionIds = (
    await prisma.agentInstruction.findMany({ where: { projectId }, select: { id: true } })
  ).map((instruction) => instruction.id);
  const suggestionIds = instructionIds.length
    ? (
        await prisma.agentSuggestion.findMany({
          where: { instructionId: { in: instructionIds } },
          select: { id: true },
        })
      ).map((suggestion) => suggestion.id)
    : [];

  if (workSessionIds.length) {
    await prisma.workSessionPause.deleteMany({ where: { workSessionId: { in: workSessionIds } } });
    await prisma.workSessionInterval.deleteMany({ where: { workSessionId: { in: workSessionIds } } });
  }
  await prisma.workSession.deleteMany({ where: { projectId } });
  if (suggestionIds.length) {
    await prisma.agentActionLog.deleteMany({ where: { suggestionId: { in: suggestionIds } } });
    await prisma.agentApproval.deleteMany({ where: { suggestionId: { in: suggestionIds } } });
  }
  if (instructionIds.length) {
    await prisma.agentActionLog.deleteMany({ where: { instructionId: { in: instructionIds } } });
    await prisma.agentSuggestion.deleteMany({ where: { instructionId: { in: instructionIds } } });
    await prisma.agentInstruction.deleteMany({ where: { id: { in: instructionIds } } });
  }

  if (riskActionIds.length) {
    await prisma.riskActionEvidence.deleteMany({ where: { riskActionId: { in: riskActionIds } } });
  }
  await prisma.projectRiskAction.deleteMany({ where: { projectRiskId: { in: riskIds } } });
  if (riskReviewIds.length) {
    await prisma.riskReviewDecisionLink.deleteMany({ where: { riskReviewId: { in: riskReviewIds } } });
  }
  await prisma.riskReview.deleteMany({ where: { riskId: { in: riskIds } } });
  await prisma.riskAssessment.deleteMany({ where: { riskId: { in: riskIds } } });
  await prisma.projectRisk.deleteMany({ where: { id: { in: riskIds } } });
  await prisma.riskReviewDecisionLink.deleteMany({ where: { projectDecision: { projectId } } });
  await prisma.projectDecision.deleteMany({ where: { projectId } });
  await prisma.timeEntry.deleteMany({ where: { projectId } });
  await prisma.projectEvent.deleteMany({ where: { projectId } });
  await prisma.customerDna.deleteMany({ where: { projectId } });
  if (narrativeIds.length) {
    await prisma.managedNarrativeRevision.deleteMany({ where: { narrativeId: { in: narrativeIds } } });
  }
  await prisma.managedNarrative.deleteMany({ where: { id: { in: narrativeIds } } });
  await prisma.projectReportingPack.deleteMany({ where: { projectId } });
  await prisma.projectTask.deleteMany({ where: { projectWorkstream: { projectId } } });
  await prisma.projectWorkstream.deleteMany({ where: { projectId } });
}

async function createApprovedNarrative({
  projectId,
  reportingPackId,
  objectKey,
  variant,
  content,
  presentationMode,
  evidenceSnapshot,
}: {
  projectId: string;
  reportingPackId: string;
  objectKey: (typeof narrativeKeys)[number];
  variant: "SHORT" | "DETAILED";
  content: string;
  presentationMode: "AUTO" | "BULLETS" | "PARAGRAPH" | "CHECKPOINTS";
  evidenceSnapshot?: {
    comparisonDate: string;
    reportingDate: string;
    timeEntryIds: string[];
    workstreamIds: string[];
    eventIds: string[];
    riskIds: string[];
    decisionIds: string[];
  };
}) {
  const narrative = await prisma.managedNarrative.create({
    data: { projectId, objectKey, variant, language: "EN" },
  });

  await prisma.managedNarrativeRevision.create({
    data: {
      narrativeId: narrative.id,
      sourceReportingPackId: reportingPackId,
      revisionNumber: 1,
      status: "APPROVED",
      content,
      evidenceJson: evidenceSnapshot ? JSON.stringify(evidenceSnapshot) : null,
      presentationMode,
      sourceType: "MANUAL",
      approvedAt: date("2026-07-19"),
      publishedAt: date("2026-07-19"),
    },
  });
}

async function collectProjectEvidenceSnapshot(projectId: string) {
  const [
    timeEntries,
    workstreams,
    events,
    risks,
    decisions,
  ] = await Promise.all([
    prisma.timeEntry.findMany({ where: { projectId }, select: { id: true } }),
    prisma.projectWorkstream.findMany({ where: { projectId }, select: { id: true } }),
    prisma.projectEvent.findMany({ where: { projectId }, select: { id: true } }),
    prisma.projectRisk.findMany({ where: { projectId }, select: { id: true } }),
    prisma.projectDecision.findMany({ where: { projectId }, select: { id: true } }),
  ]);

  return {
    comparisonDate: "2026-06-19",
    reportingDate: "2026-07-19",
    timeEntryIds: timeEntries.map((item) => item.id),
    workstreamIds: workstreams.map((item) => item.id),
    eventIds: events.map((item) => item.id),
    riskIds: risks.map((item) => item.id),
    decisionIds: decisions.map((item) => item.id),
  };
}

async function rebuildDemo003() {
  const refs = await requireReferenceData();
  const { demoWorkspace, owner, statuses, taskFamilyByCode, riskCategoryByCode } = refs;
  await prisma.eventType.updateMany({
    where: { code: "APP_MOB" },
    data: { name: "Laptop and mobile views" },
  });
  const existingProject = await prisma.project.findUnique({ where: { projectCode } });
  if (existingProject) await clearProjectData(existingProject.id);

  const studio = await prisma.organization.upsert({
    where: { code: ppsStudioCode },
    create: {
      workspaceId: demoWorkspace.id,
      code: ppsStudioCode,
      name: "PPS Product Studio",
      displayName: "PPS Studio",
      industry: "Software and operations",
      country: "Spain",
      organizationType: "INTERNAL",
      notes: "Synthetic internal organization for the PPS operating model showcase.",
      contacts: {
        create: {
          name: "Marisa Engel",
          roleTitle: "Product Owner",
          email: "marisa.engel@protervitas.com",
          isSponsor: true,
        },
      },
    },
    update: {
      workspaceId: demoWorkspace.id,
      name: "PPS Product Studio",
      displayName: "PPS Studio",
      organizationType: "INTERNAL",
      isActive: true,
    },
    include: { contacts: true },
  });

  const sponsor =
    studio.contacts.find((contact) => contact.isSponsor) ??
    (await prisma.organizationContact.create({
      data: {
        organizationId: studio.id,
        name: "Marisa Engel",
        roleTitle: "Product Owner",
        email: "marisa.engel@protervitas.com",
        isSponsor: true,
      },
    }));

  const project = await prisma.project.upsert({
    where: { projectCode },
    create: {
      workspaceId: demoWorkspace.id,
      projectCode,
      name: "DEMO 003 - PPS Operating Model Showcase",
      description:
        "Internal showcase project explaining the PPS philosophy: one operational source of truth powering execution, agents, mobile capture, briefing, and executive reporting.",
      projectTypeId: refs.digitalProduct.id,
      governedStatusId: statuses.IN_PROGRESS.id,
      startDate: date("2026-07-01"),
      plannedStartDate: date("2026-07-01"),
      plannedEndDate: date("2026-09-30"),
      actualStartDate: date("2026-07-01"),
      reportingCadence: "MONTHLY",
      defaultLanguage: "EN",
      secondaryLanguage: "ES",
      reportLanguageMode: "BILINGUAL",
      healthStatus: "GREEN",
      issuerOrganizationId: studio.id,
      clientOrganizationId: studio.id,
      deliveryOrganizationId: studio.id,
      projectManagerContactId: sponsor.id,
      sponsorContactId: sponsor.id,
    },
    update: {
      workspaceId: demoWorkspace.id,
      name: "DEMO 003 - PPS Operating Model Showcase",
      description:
        "Internal showcase project explaining the PPS philosophy: one operational source of truth powering execution, agents, mobile capture, briefing, and executive reporting.",
      projectTypeId: refs.digitalProduct.id,
      governedStatusId: statuses.IN_PROGRESS.id,
      plannedStartDate: date("2026-07-01"),
      plannedEndDate: date("2026-09-30"),
      actualStartDate: date("2026-07-01"),
      healthStatus: "GREEN",
      issuerOrganizationId: studio.id,
      clientOrganizationId: studio.id,
      deliveryOrganizationId: studio.id,
      projectManagerContactId: sponsor.id,
      sponsorContactId: sponsor.id,
      isActive: true,
    },
  });

  async function addWorkstream({
    refName,
    customName,
    objective,
    deliverable,
    start,
    end,
    completed,
  }: {
    refName: string;
    customName: string;
    objective: string;
    deliverable: string;
    start: string;
    end: string;
    completed?: string;
  }) {
    return prisma.projectWorkstream.create({
      data: {
        projectId: project.id,
        workstreamId: refs.workstream(refName).id,
        governedStatusId: completed ? statuses.COMPLETED.id : statuses.IN_PROGRESS.id,
        customName,
        reportingName: customName,
        objective,
        deliverable,
        visibility: "BOTH",
        plannedStartDate: date(start),
        plannedEndDate: date(end),
        actualStartDate: date(start),
        actualEndDate: completed ? date(completed) : null,
        notes: "DEMO 003 operating model showcase workstream.",
      },
    });
  }

  const governance = await addWorkstream({
    refName: "Project Management",
    customName: "Demo Strategy and Governance",
    objective: "Define the story, guardrails, and evidence needed to explain PPS as an operating system.",
    deliverable: "Management narrative and demo storyboard.",
    start: "2026-07-01",
    end: "2026-09-30",
  });
  const sourceTruth = await addWorkstream({
    refName: "Architecture",
    customName: "Single Source of Truth Architecture",
    objective: "Show how projects, workstreams, risks, decisions, customer DNA, and time entries become report evidence.",
    deliverable: "Operational-data-to-reporting architecture view.",
    start: "2026-07-02",
    end: "2026-08-31",
  });
  const access = await addWorkstream({
    refName: "Security",
    customName: "Workspace and Access Separation",
    objective: "Keep live, development, and demo contexts understandable and protected for different audiences.",
    deliverable: "Demo access model with hidden live workspace for non-admin users.",
    start: "2026-07-03",
    end: "2026-08-15",
    completed: "2026-07-19",
  });
  const agents = await addWorkstream({
    refName: "Natural Language",
    customName: "Agent-Assisted Operational Capture",
    objective: "Demonstrate how natural-language agents help users create workstreams, sessions, and suggestions in context.",
    deliverable: "Context-aware TT and PP agent behavior.",
    start: "2026-07-05",
    end: "2026-09-15",
  });
  const mobile = await addWorkstream({
    refName: "Mob function",
    customName: "Mobile and Field Evidence Capture",
    objective: "Show that operational updates can come from mobile workflows and still feed the same governance record.",
    deliverable: "Mobile update story linked to time and project evidence.",
    start: "2026-07-07",
    end: "2026-09-20",
  });
  const storyData = await addWorkstream({
    refName: "Customer DNA",
    customName: "Story Data and Customer Signal Design",
    objective: "Curate demo data that feels like a real management case while remaining synthetic and reusable.",
    deliverable: "DEMO 001 and DEMO 003 story baselines.",
    start: "2026-07-10",
    end: "2026-08-20",
  });
  const reporting = await addWorkstream({
    refName: "Board Pack Engine",
    customName: "Briefing and Executive Report Philosophy",
    objective: "Explain why one short briefing and one extended report should come from the same operational truth.",
    deliverable: "Approved management report narrative assets.",
    start: "2026-07-12",
    end: "2026-09-05",
  });
  const recovery = await addWorkstream({
    refName: "Back ups",
    customName: "Recovery and Demo Packaging Readiness",
    objective: "Prove the environment can recover from backup and prepare a clean bundle strategy for external review.",
    deliverable: "Recovery runbook and packaging decision log.",
    start: "2026-07-14",
    end: "2026-09-30",
  });

  await prisma.projectEvent.createMany({
    data: [
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.BAC_REC?.id,
        name: "Production recovery from backup validated",
        reportingName: "Recovery validated",
        description: "Frozen production code was restored separately from development while preserving live database continuity.",
        eventDate: date("2026-07-18"),
        isCompleted: true,
        completionDate: date("2026-07-18"),
        visibility: "DETAILED",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.APP_MOB?.id,
        name: "Demo access front door confirmed",
        reportingName: "Demo access confirmed",
        description: "Unauthenticated visitors land on the demo entry point and see only DEMO workspace data.",
        eventDate: date("2026-07-19"),
        isCompleted: true,
        completionDate: date("2026-07-19"),
        visibility: "EXECUTIVE",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.AG_TT?.id,
        name: "Agent context hardening completed",
        reportingName: "Agents stay in project context",
        description: "TT and PP agents now resolve project context before creating suggestions or sessions.",
        eventDate: date("2026-07-19"),
        isCompleted: true,
        completionDate: date("2026-07-19"),
        visibility: "DETAILED",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.V3_ER?.id,
        name: "DEMO 001 story baseline approved",
        reportingName: "DEMO 001 baseline",
        description: "Client-facing story now has workstreams, milestones, risks, decisions, customer DNA, and differentiated narratives.",
        eventDate: date("2026-07-19"),
        isCompleted: true,
        completionDate: date("2026-07-19"),
        visibility: "BOTH",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.V3_ER?.id,
        name: "Management philosophy report review",
        reportingName: "Philosophy report review",
        description: "Review whether DEMO 003 explains why PPS is an operating system, not a static reporting tool.",
        eventDate: date("2026-07-26"),
        visibility: "DETAILED",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.PRO_DEP?.id,
        name: "External demo bundle decision",
        reportingName: "Bundle decision",
        description: "Decide how to package app, database, and mobile demonstration for external review.",
        eventDate: date("2026-08-10"),
        visibility: "EXECUTIVE",
      },
    ],
  });

  async function addRisk({
    code,
    title,
    description,
    workstreamId,
    categoryCode,
    probability,
    impact,
    mitigationPlan,
    trigger,
    actionCode,
    actionDescription,
    dueDate,
    escalated = false,
  }: {
    code: string;
    title: string;
    description: string;
    workstreamId: string;
    categoryCode: string;
    probability: number;
    impact: number;
    mitigationPlan: string;
    trigger: string;
    actionCode: string;
    actionDescription: string;
    dueDate: string;
    escalated?: boolean;
  }) {
    const risk = await prisma.projectRisk.create({
      data: {
        projectId: project.id,
        projectWorkstreamId: workstreamId,
        categoryId: riskCategoryByCode[categoryCode].id,
        statusId: statuses.OPEN.id,
        ownerId: owner.id,
        riskCode: code,
        title,
        description,
        probability,
        impact,
        exposure: probability * impact,
        identifiedDate: date("2026-07-19"),
        targetResolutionDate: date(dueDate),
        mitigationPlan,
        trigger,
        escalated,
      },
    });
    await prisma.projectRiskAction.create({
      data: {
        projectRiskId: risk.id,
        actionCode,
        description: actionDescription,
        ownerId: owner.id,
        dueDate: date(dueDate),
        statusId: statuses.IN_PROGRESS.id,
        completionCriteria: "Action complete when the showcase can be explained without exposing live data or confusing the audience.",
        evidence: "Demo evidence placeholder for operating model showcase.",
      },
    });
  }

  await addRisk({
    code: "DEMO-003-RISK-001",
    title: "Meta-story may become too abstract for external reviewers",
    description: "The philosophy is powerful, but it must remain concrete enough to explain through management-report evidence.",
    workstreamId: governance.id,
    categoryCode: "STAKEHOLDER",
    probability: 3,
    impact: 4,
    mitigationPlan: "Anchor the management report in milestones, decisions, risks, and real app behaviors already built.",
    trigger: "Reviewers cannot explain the value proposition after the first report page.",
    actionCode: "DEMO-003-ACT-001",
    actionDescription: "Add plain-language operating model storyline to the report and demo script.",
    dueDate: "2026-07-26",
  });
  await addRisk({
    code: "DEMO-003-RISK-002",
    title: "Demo packaging approach is not yet decided",
    description: "The app, database, and mobile story need a reproducible packaging model before external submission.",
    workstreamId: recovery.id,
    categoryCode: "OPERATIONAL",
    probability: 3,
    impact: 4,
    mitigationPlan: "Define bundle options, include mobile scope, and document database reset/recovery steps.",
    trigger: "External review requires a portable artifact before packaging is agreed.",
    actionCode: "DEMO-003-ACT-002",
    actionDescription: "Prepare packaging decision options for app, database, and mobile demo.",
    dueDate: "2026-08-10",
    escalated: true,
  });
  await addRisk({
    code: "DEMO-003-RISK-003",
    title: "Narrative and transactional data could drift",
    description: "A management report is only credible if its claims remain aligned with the operational records behind it.",
    workstreamId: reporting.id,
    categoryCode: "QUALITY",
    probability: 2,
    impact: 4,
    mitigationPlan: "Refresh seeded narratives from the same story script and validate counts after each baseline change.",
    trigger: "A report statement cannot be traced to a project record, decision, risk, milestone, or customer signal.",
    actionCode: "DEMO-003-ACT-003",
    actionDescription: "Create a narrative-to-transaction consistency checklist.",
    dueDate: "2026-08-02",
  });
  await addRisk({
    code: "DEMO-003-RISK-004",
    title: "Demo access could reveal implementation complexity too early",
    description: "External visitors should experience the system value before seeing admin, workspace, or configuration mechanics.",
    workstreamId: access.id,
    categoryCode: "TECHNICAL",
    probability: 2,
    impact: 5,
    mitigationPlan: "Keep demo users in DEMO workspace, hide admin navigation, and keep owner access separate.",
    trigger: "A non-admin reviewer sees live workspace or configuration surfaces.",
    actionCode: "DEMO-003-ACT-004",
    actionDescription: "Validate demo navigation, login, and workspace visibility before external sharing.",
    dueDate: "2026-07-31",
  });

  await prisma.projectDecision.createMany({
    data: [
      {
        projectId: project.id,
        projectWorkstreamId: governance.id,
        decisionCode: "DEMO-003-DEC-001",
        title: "Keep DEMO 003 separate from client-facing DEMO 001",
        description: "DEMO 001 must remain a credible healthcare delivery project; DEMO 003 can explain the product philosophy.",
        recommendation: "Create DEMO 003 as an internal operating model showcase.",
        decision: "Approved.",
        requestedBy: "Marisa Engel",
        owner: "PPS Product Studio",
        decisionDate: date("2026-07-19"),
        statusId: statuses.COMPLETED.id,
        impact: "HIGH",
        visibility: "EXECUTIVE",
      },
      {
        projectId: project.id,
        projectWorkstreamId: sourceTruth.id,
        decisionCode: "DEMO-003-DEC-002",
        title: "Position PPS as an operating system, not a report generator",
        description: "The management report should explain that reporting is the visible output of daily operational truth.",
        recommendation: "Use one-source-of-truth language and show the operational evidence chain.",
        decision: "Approved for management report narrative.",
        requestedBy: "PPS Product Studio",
        owner: "Marisa Engel",
        decisionDate: date("2026-07-19"),
        statusId: statuses.COMPLETED.id,
        impact: "HIGH",
        visibility: "BOTH",
      },
      {
        projectId: project.id,
        projectWorkstreamId: recovery.id,
        decisionCode: "DEMO-003-DEC-003",
        title: "Choose external demo packaging approach",
        description: "We still need to decide how the app, database, and mobile demonstration are bundled for external review.",
        recommendation: "Compare local bundle, hosted demo, and guided video options before submission.",
        requestedBy: "PPS Product Studio",
        owner: "Marisa Engel",
        dueDate: date("2026-08-10"),
        statusId: statuses.OPEN.id,
        impact: "CRITICAL",
        escalated: true,
        visibility: "EXECUTIVE",
      },
      {
        projectId: project.id,
        projectWorkstreamId: mobile.id,
        decisionCode: "DEMO-003-DEC-004",
        title: "Include mobile app in the showcase",
        description: "Mobile capture reinforces the single source of truth because operational evidence can enter from the field.",
        recommendation: "Include mobile workflow in the showcase if packaging risk remains manageable.",
        requestedBy: "Marisa Engel",
        owner: "PPS Product Studio",
        dueDate: date("2026-08-05"),
        statusId: statuses.OPEN.id,
        impact: "HIGH",
        visibility: "BOTH",
      },
    ],
  });

  await prisma.timeEntry.createMany({
    data: [
      {
        projectId: project.id,
        projectWorkstreamId: governance.id,
        taskFamilyId: taskFamilyByCode.PLA.id,
        date: date("2026-07-19"),
        hours: 1.5,
        notes: "Defined DEMO 003 as the management-report vehicle for PPS philosophy.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: sourceTruth.id,
        taskFamilyId: taskFamilyByCode.PLA.id,
        date: date("2026-07-19"),
        hours: 2,
        notes: "Mapped operational data objects to briefing and executive-report evidence.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: access.id,
        taskFamilyId: taskFamilyByCode.TES.id,
        date: date("2026-07-19"),
        hours: 1.25,
        notes: "Validated demo access behavior and hidden live workspace for non-admin users.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: agents.id,
        taskFamilyId: taskFamilyByCode.THI.id,
        date: date("2026-07-19"),
        hours: 1.75,
        notes: "Captured agent-context hardening as part of the operating model story.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: reporting.id,
        taskFamilyId: taskFamilyByCode.REP.id,
        date: date("2026-07-19"),
        hours: 2.25,
        notes: "Prepared management narrative explaining briefing versus executive report from the same data.",
      },
    ],
  });

  await prisma.customerDna.createMany({
    data: [
      {
        projectId: project.id,
        category: "Product Philosophy",
        priority: "HIGH",
        statement: "The system should feel like an operational cockpit, not like a document generator.",
        status: "ADDRESSED",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-19"),
      },
      {
        projectId: project.id,
        category: "Demo Story",
        priority: "HIGH",
        statement: "A reviewer should understand that reports are trustworthy because they come from daily project operations.",
        status: "IN_PROGRESS",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-19"),
      },
      {
        projectId: project.id,
        category: "Training Reuse",
        priority: "MEDIUM",
        statement: "The same demo data should support external showcase, internal training, and recovery practice.",
        status: "IN_PROGRESS",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-19"),
      },
      {
        projectId: project.id,
        category: "Mobile Value",
        priority: "MEDIUM",
        statement: "Mobile updates make the single source of truth more credible because evidence can enter where work happens.",
        status: "IN_PROGRESS",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-19"),
      },
    ],
  });

  const report = await prisma.projectReportingPack.create({
    data: {
      projectId: project.id,
      title: "PPS Operating Model - Management Philosophy Report",
      reportingDate: date("2026-07-19"),
      reportingPeriod: "July 2026",
      version: 1,
      status: "APPROVED",
      executiveSummary:
        "PPS is positioned as an operating system for project execution: daily records become governance evidence, and governance evidence becomes briefing and executive reporting.",
      achievements:
        "Production recovery was validated; demo workspace access was isolated; agents were hardened to stay in project context; DEMO 001 was rebuilt as a coherent client-facing story.",
      issues:
        "The main open item is external packaging: app, database, and mobile experience must be bundled without confusing reviewers or exposing live data.",
      nextSteps:
        "Review the management philosophy report, decide the external packaging approach, and include the mobile flow if the bundle remains simple enough.",
      managementAsk:
        "Approve the positioning of PPS as a single operational truth and decide how the demo package should be shared for external review.",
      reportIndex:
        "1. Operating model summary\n2. Evidence chain\n3. Demo workspace and access\n4. Agent and mobile capture\n5. Reporting philosophy\n6. Packaging decisions",
      conclusion:
        "PPS is strongest when presented as a living management system: people update real operational objects, and leadership receives trustworthy narratives because the report is connected to the work.",
      isActive: true,
    },
  });

  const shortNarratives = [
    {
      objectKey: "executive-summary",
      content: "PPS turns daily project operations into briefing and executive reporting from one source of truth.",
      presentationMode: "PARAGRAPH" as const,
    },
    {
      objectKey: "progress-since-last-report",
      content: "Recovery validated; demo access isolated; agents hardened; DEMO 001 story approved.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "issues-concerns",
      content: "Open item: choose a simple external package for app, database, and mobile story.",
      presentationMode: "PARAGRAPH" as const,
    },
    {
      objectKey: "next-steps",
      content: "Review philosophy report; decide packaging; confirm whether mobile is included.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "management-ask",
      content: "Approve PPS positioning and decide the external demo packaging approach.",
      presentationMode: "PARAGRAPH" as const,
    },
    {
      objectKey: "conclusion",
      content: "The value is the evidence chain: operational updates become trustworthy management narratives.",
      presentationMode: "PARAGRAPH" as const,
    },
  ];

  const detailedNarratives = [
    {
      objectKey: "executive-summary",
      content:
        "Operating model: PPS is a project operating system; workstreams, time, risks, decisions, milestones, and customer DNA are the daily management objects; reports are outputs of those objects, not disconnected documents.\nManagement value: leadership sees a concise briefing for attention; the executive report keeps the evidence trail; both views remain anchored in the same operational database.\nShowcase purpose: DEMO 003 explains the philosophy behind DEMO 001; it makes the product story explicit without breaking the realism of the client-facing healthcare project.",
      presentationMode: "CHECKPOINTS" as const,
    },
    {
      objectKey: "accomplishments",
      content:
        "Recovery foundation: frozen production code was restored separately from development; live database continuity was preserved; the recovery pattern can now be documented.\nDemo foundation: DEMO workspace access was isolated; non-admin users do not see live workspace controls; DEMO 001 has a coherent story with risks, decisions, milestones, customer DNA, and differentiated narratives.\nExecution foundation: TT and PP agents were hardened to respect project context; duplicate suggestions were blocked; review and open-session pages are workspace-aware.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "issues-concerns",
      content:
        "Packaging risk: app, database, and mobile experience still need a simple sharing approach; too much setup would weaken the external review experience.\nNarrative risk: the story must remain data-backed; each management claim should trace to a workstream, milestone, risk, decision, customer signal, or time entry.\nAudience risk: the philosophy can sound abstract; the report must keep explaining it through concrete system behavior and operational evidence.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "next-steps",
      content:
        "By 26 July: review whether the management report explains PPS as an operating system clearly; refine the story if the value proposition is not immediate.\nBy 5 August: decide whether mobile is included in the external showcase; confirm that the mobile path updates the same project truth.\nBy 10 August: choose packaging approach; document database reset and recovery steps; prepare a reviewer-friendly path through DEMO 001 and DEMO 003.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "management-ask",
      content:
        "Positioning decision: approve the phrase single operational truth as the core PPS message; explain reporting as a consequence of daily project execution.\nPackaging decision: choose local bundle, hosted demo, or guided recording; include mobile only if the experience remains simple and reliable.\nDemo decision: keep DEMO 001 as the realistic client story; use DEMO 003 to explain why the application architecture is powerful.",
      presentationMode: "CHECKPOINTS" as const,
    },
    {
      objectKey: "conclusion",
      content:
        "Core conclusion: PPS is strongest when it is presented as a living management system; every operational update improves the quality of governance evidence.\nWhy it matters: leaders receive concise attention management and a detailed evidence trail from the same source; teams avoid rewriting reality into reports after the fact.\nShowcase conclusion: DEMO 003 should be used as the explanatory management case; DEMO 001 should remain the realistic proof that the model works in a client delivery scenario.",
      presentationMode: "CHECKPOINTS" as const,
    },
  ];

  const evidenceSnapshot = await collectProjectEvidenceSnapshot(project.id);

  for (const item of shortNarratives) {
    await createApprovedNarrative({
      projectId: project.id,
      reportingPackId: report.id,
      objectKey: item.objectKey as (typeof narrativeKeys)[number],
      variant: "SHORT",
      content: item.content,
      presentationMode: item.presentationMode,
      evidenceSnapshot,
    });
  }
  for (const item of detailedNarratives) {
    await createApprovedNarrative({
      projectId: project.id,
      reportingPackId: report.id,
      objectKey: item.objectKey as (typeof narrativeKeys)[number],
      variant: "DETAILED",
      content: item.content,
      presentationMode: item.presentationMode,
      evidenceSnapshot,
    });
  }

  const [progressVisibilityCapability, timeEntrySuggestionCapability] =
    await Promise.all([
      prisma.agentCapability.findFirst({
        where: {
          capabilityKey: "CHANGE_EVENT_VISIBILITY",
          agent: { agentKey: "PROJECT_PROGRESS" },
        },
      }),
      prisma.agentCapability.findFirst({
        where: {
          capabilityKey: "CREATE_TIME_ENTRY_SUGGESTION",
          agent: { agentKey: "TIME_TRACKING" },
        },
      }),
    ]);
  const [bundleDecisionEvent, reportWorkstream] = await Promise.all([
    prisma.projectEvent.findFirst({
      where: { projectId: project.id, reportingName: "Bundle decision" },
      select: { id: true, visibility: true },
    }),
    prisma.projectWorkstream.findFirst({
      where: {
        projectId: project.id,
        customName: "Briefing and Executive Report Philosophy",
      },
      select: { id: true },
    }),
  ]);

  if (bundleDecisionEvent) {
    const instruction = await prisma.agentInstruction.create({
      data: {
        agentKey: "PROJECT_PROGRESS",
        sourceType: "TEXT",
        userId: owner.id,
        statusId: statuses.OPEN.id,
        projectId: project.id,
        rawInstruction:
          "For DEMO 003, move Bundle decision to detailed after the freeze review if we want the briefing Gantt tighter.",
        normalizedInstruction:
          "Change the Bundle decision milestone visibility from executive to detailed.",
        parsedIntentJson: JSON.stringify({
          command: "CHANGE_EVENT_VISIBILITY",
          projectId: project.id,
          targetEntity: "PROJECT_EVENT",
          targetRecordId: bundleDecisionEvent.id,
          visibility: "DETAILED",
          reason: "Agent-ready demo example for visibility review.",
        }),
        processedAt: date("2026-07-19"),
      },
    });
    await prisma.agentSuggestion.create({
      data: {
        instructionId: instruction.id,
        agentKey: "PROJECT_PROGRESS",
        capabilityId: progressVisibilityCapability?.id ?? null,
        suggestionType: "UPDATE_VISIBILITY",
        targetEntity: "PROJECT_EVENT",
        targetRecordId: bundleDecisionEvent.id,
        statusId: statuses.OPEN.id,
        title: "Move Bundle decision milestone to detailed",
        summary:
          "Optional polish: keep the briefing Gantt tighter by moving the packaging decision marker to the detailed timeline.",
        payloadJson: JSON.stringify({
          command: "CHANGE_EVENT_VISIBILITY",
          projectId: project.id,
          targetEntity: "PROJECT_EVENT",
          targetRecordId: bundleDecisionEvent.id,
          visibility: "DETAILED",
          fromVisibility: bundleDecisionEvent.visibility,
        }),
        configSnapshotJson: JSON.stringify({
          seededDemoExample: true,
          agentKey: "PROJECT_PROGRESS",
          capabilityKey: "CHANGE_EVENT_VISIBILITY",
        }),
      },
    });
  }

  if (reportWorkstream) {
    const instruction = await prisma.agentInstruction.create({
      data: {
        agentKey: "TIME_TRACKING",
        sourceType: "TEXT",
        userId: owner.id,
        statusId: statuses.OPEN.id,
        projectId: project.id,
        projectWorkstreamId: reportWorkstream.id,
        rawInstruction:
          "Create a time entry suggestion for 1.25 hours polishing the DEMO 003 philosophy report.",
        normalizedInstruction:
          "Create time entry suggestion: DEMO 003 report polish, 1.25 hours.",
        parsedIntentJson: JSON.stringify({
          capabilityKey: "CREATE_TIME_ENTRY_SUGGESTION",
          projectId: project.id,
          projectWorkstreamId: reportWorkstream.id,
          taskFamilyId: taskFamilyByCode.REP.id,
          date: "2026-07-19",
          hours: 1.25,
        }),
        processedAt: date("2026-07-19"),
      },
    });
    await prisma.agentSuggestion.create({
      data: {
        instructionId: instruction.id,
        agentKey: "TIME_TRACKING",
        capabilityId: timeEntrySuggestionCapability?.id ?? null,
        suggestionType: "CREATE_TIME_ENTRY",
        targetEntity: "TIME_ENTRY",
        statusId: statuses.OPEN.id,
        title: "Create DEMO 003 report polish time entry",
        summary: "DEMO_003 - PPS Operating Model Showcase: 1.25h",
        payloadJson: JSON.stringify({
          workSessionId: null,
          projectId: project.id,
          projectWorkstreamId: reportWorkstream.id,
          taskFamilyId: taskFamilyByCode.REP.id,
          projectTaskId: null,
          date: "2026-07-19",
          hours: 1.25,
          notes:
            "Polished the operating model management narrative and evidence traceability for the demo freeze.",
        }),
        configSnapshotJson: JSON.stringify({
          seededDemoExample: true,
          agentKey: "TIME_TRACKING",
          capabilityKey: "CREATE_TIME_ENTRY_SUGGESTION",
        }),
      },
    });
  }

  return {
    projectCode,
    workstreamsCreated: 8,
    projectEventsCreated: 6,
    risksCreated: 4,
    riskActionsCreated: 4,
    decisionsCreated: 4,
    timeEntriesCreated: 5,
    customerDnaItemsCreated: 4,
    reportingPacksCreated: 1,
    managedNarrativesCreated: 12,
    agentReadySuggestionsCreated: 2,
    labelsPolished: 1,
  };
}

async function main() {
  const refs = await requireReferenceData();
  const existingProject = await prisma.project.findUnique({ where: { projectCode } });
  const before = existingProject ? await countProjectData(existingProject.id) : null;
  const plan = {
    mode,
    databasePath,
    projectCode,
    workspace: refs.demoWorkspace.code,
    willCreateOrReplaceProject: true,
    before,
  };

  if (mode === "dry-run") {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const result = await rebuildDemo003();
  const project = await prisma.project.findUnique({ where: { projectCode } });
  const after = project ? await countProjectData(project.id) : null;
  console.log(JSON.stringify({ ...plan, result, after }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
