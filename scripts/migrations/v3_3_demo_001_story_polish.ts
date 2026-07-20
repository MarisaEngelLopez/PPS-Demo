import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

type Mode = "dry-run" | "apply";

const projectCode = "DEMO_001";
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
  fail("DEMO 001 story polish refused: database is not dev-sandbox.db.");
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function requireReferenceData() {
  const [demoWorkspace, owner, project, digitalProduct] = await Promise.all([
    prisma.workspace.findUnique({ where: { code: "DEMO" } }),
    prisma.user.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.project.findUnique({
      where: { projectCode },
      include: {
        clientOrganization: { include: { contacts: true } },
        deliveryOrganization: { include: { contacts: true } },
      },
    }),
    prisma.projectType.findUnique({ where: { code: "DP_INTPMO" } }),
  ]);

  if (!demoWorkspace) fail("Missing DEMO workspace. Run db:security-seed:v3-3 first.");
  if (!owner) fail("Missing operational User.");
  if (!project || project.workspaceId !== demoWorkspace.id) {
    fail(`Missing ${projectCode} in DEMO workspace. Run db:demo-seed:v3-3 first.`);
  }
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
    where: { code: { in: ["PLA", "REP", "RIS", "MEE", "UAT", "DTM", "KPI", "TES"] } },
  });
  const taskFamilyByCode = Object.fromEntries(taskFamilies.map((item) => [item.code, item]));
  for (const code of ["PLA", "REP", "RIS", "MEE", "UAT", "DTM", "KPI", "TES"]) {
    if (!taskFamilyByCode[code]) fail(`Missing task family: ${code}`);
  }

  const riskCategories = await prisma.riskCategory.findMany({
    where: {
      code: {
        in: [
          "STAKEHOLDER",
          "TECHNICAL",
          "COMPLIANCE",
          "OPERATIONAL",
          "QUALITY",
          "RESOURCE",
        ],
      },
    },
  });
  const riskCategoryByCode = Object.fromEntries(
    riskCategories.map((item) => [item.code, item])
  );
  for (const code of [
    "STAKEHOLDER",
    "TECHNICAL",
    "COMPLIANCE",
    "OPERATIONAL",
    "QUALITY",
    "RESOURCE",
  ]) {
    if (!riskCategoryByCode[code]) fail(`Missing risk category: ${code}`);
  }

  const eventTypes = await prisma.eventType.findMany();
  const eventTypeByCode = Object.fromEntries(eventTypes.map((item) => [item.code, item]));

  const requiredWorkstreams = [
    "Project Management",
    "Customer",
    "Architecture",
    "Security",
    "Mob function",
    "Customer DNA",
    "Risk reporting",
    "Board Pack Engine",
    "Stakeholder Alignment",
    "Timeline",
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
    project,
    digitalProduct,
    statuses: statusByCode,
    taskFamilyByCode,
    riskCategoryByCode,
    eventTypeByCode,
    workstream,
  };
}

async function countCurrentStoryData(projectId: string) {
  const riskIds = (
    await prisma.projectRisk.findMany({
      where: { projectId },
      select: { id: true },
    })
  ).map((risk) => risk.id);
  const instructionIds = (
    await prisma.agentInstruction.findMany({
      where: { projectId },
      select: { id: true },
    })
  ).map((instruction) => instruction.id);

  return {
    projectWorkstreams: await prisma.projectWorkstream.count({ where: { projectId } }),
    projectEvents: await prisma.projectEvent.count({ where: { projectId } }),
    projectRisks: riskIds.length,
    projectRiskActions: riskIds.length
      ? await prisma.projectRiskAction.count({
          where: { projectRiskId: { in: riskIds } },
        })
      : 0,
    projectDecisions: await prisma.projectDecision.count({ where: { projectId } }),
    timeEntries: await prisma.timeEntry.count({ where: { projectId } }),
    workSessions: await prisma.workSession.count({ where: { projectId } }),
    customerDna: await prisma.customerDna.count({ where: { projectId } }),
    reportingPacks: await prisma.projectReportingPack.count({ where: { projectId } }),
    managedNarratives: await prisma.managedNarrative.count({ where: { projectId } }),
    agentInstructions: instructionIds.length,
    agentSuggestions: instructionIds.length
      ? await prisma.agentSuggestion.count({
          where: { instructionId: { in: instructionIds } },
        })
      : 0,
  };
}

async function clearDemo001Story(projectId: string) {
  const riskIds = (
    await prisma.projectRisk.findMany({
      where: { projectId },
      select: { id: true },
    })
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
    await prisma.managedNarrative.findMany({
      where: { projectId },
      select: { id: true },
    })
  ).map((narrative) => narrative.id);
  const workSessionIds = (
    await prisma.workSession.findMany({
      where: { projectId },
      select: { id: true },
    })
  ).map((session) => session.id);
  const instructionIds = (
    await prisma.agentInstruction.findMany({
      where: { projectId },
      select: { id: true },
    })
  ).map((instruction) => instruction.id);
  const suggestionIds = instructionIds.length
    ? (
        await prisma.agentSuggestion.findMany({
          where: { instructionId: { in: instructionIds } },
          select: { id: true },
        })
      ).map((suggestion) => suggestion.id)
    : [];
  const approvalIds = suggestionIds.length
    ? (
        await prisma.agentApproval.findMany({
          where: { suggestionId: { in: suggestionIds } },
          select: { id: true },
        })
      ).map((approval) => approval.id)
    : [];

  if (workSessionIds.length) {
    await prisma.workSessionPause.deleteMany({
      where: { workSessionId: { in: workSessionIds } },
    });
    await prisma.workSessionInterval.deleteMany({
      where: { workSessionId: { in: workSessionIds } },
    });
  }
  await prisma.workSession.deleteMany({ where: { projectId } });

  if (approvalIds.length) {
    await prisma.agentActionLog.deleteMany({
      where: { approvalId: { in: approvalIds } },
    });
  }
  if (suggestionIds.length) {
    await prisma.agentActionLog.deleteMany({
      where: { suggestionId: { in: suggestionIds } },
    });
    await prisma.agentApproval.deleteMany({
      where: { suggestionId: { in: suggestionIds } },
    });
  }
  if (instructionIds.length) {
    await prisma.agentActionLog.deleteMany({
      where: { instructionId: { in: instructionIds } },
    });
    await prisma.agentSuggestion.deleteMany({
      where: { instructionId: { in: instructionIds } },
    });
    await prisma.agentInstruction.deleteMany({ where: { id: { in: instructionIds } } });
  }

  if (riskActionIds.length) {
    await prisma.riskActionEvidence.deleteMany({
      where: { riskActionId: { in: riskActionIds } },
    });
  }
  await prisma.projectRiskAction.deleteMany({
    where: { projectRiskId: { in: riskIds } },
  });
  if (riskReviewIds.length) {
    await prisma.riskReviewDecisionLink.deleteMany({
      where: { riskReviewId: { in: riskReviewIds } },
    });
  }
  await prisma.riskReview.deleteMany({ where: { riskId: { in: riskIds } } });
  await prisma.riskAssessment.deleteMany({ where: { riskId: { in: riskIds } } });
  await prisma.projectRisk.deleteMany({ where: { id: { in: riskIds } } });

  await prisma.riskReviewDecisionLink.deleteMany({
    where: { projectDecision: { projectId } },
  });
  await prisma.projectDecision.deleteMany({ where: { projectId } });
  await prisma.timeEntry.deleteMany({ where: { projectId } });
  await prisma.projectEvent.deleteMany({ where: { projectId } });
  await prisma.customerDna.deleteMany({ where: { projectId } });
  if (narrativeIds.length) {
    await prisma.managedNarrativeRevision.deleteMany({
      where: { narrativeId: { in: narrativeIds } },
    });
  }
  await prisma.managedNarrative.deleteMany({ where: { id: { in: narrativeIds } } });
  await prisma.projectReportingPack.deleteMany({ where: { projectId } });
  await prisma.projectTask.deleteMany({
    where: { projectWorkstream: { projectId } },
  });
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

async function rebuildDemo001Story() {
  const refs = await requireReferenceData();
  const { project, owner, statuses, taskFamilyByCode, riskCategoryByCode } = refs;

  await clearDemo001Story(project.id);

  await prisma.project.update({
    where: { id: project.id },
    data: {
      name: "DEMO 001 - Atlas Care Portal Launch",
      description:
        "Prize-demo baseline for a healthcare portal launch. The story connects workstreams, milestones, risks, decisions, customer DNA, time tracking, and narrative reporting from one operational database.",
      projectTypeId: refs.digitalProduct.id,
      governedStatusId: statuses.IN_PROGRESS.id,
      startDate: date("2026-04-01"),
      plannedStartDate: date("2026-04-01"),
      plannedEndDate: date("2026-10-31"),
      actualStartDate: date("2026-04-03"),
      healthStatus: "AMBER",
      reportingCadence: "MONTHLY",
      defaultLanguage: "EN",
      secondaryLanguage: "ES",
      reportLanguageMode: "BILINGUAL",
    },
  });

  async function addWorkstream({
    refName,
    customName,
    objective,
    deliverable,
    plannedStartDate,
    plannedEndDate,
    actualStartDate,
    actualEndDate,
    visibility = "BOTH",
    notes,
  }: {
    refName: string;
    customName: string;
    objective: string;
    deliverable: string;
    plannedStartDate: string;
    plannedEndDate: string;
    actualStartDate?: string;
    actualEndDate?: string;
    visibility?: "BOTH" | "EXECUTIVE" | "DETAILED";
    notes: string;
  }) {
    return prisma.projectWorkstream.create({
      data: {
        projectId: project.id,
        workstreamId: refs.workstream(refName).id,
        governedStatusId: actualEndDate ? statuses.COMPLETED.id : statuses.IN_PROGRESS.id,
        customName,
        reportingName: customName,
        objective,
        deliverable,
        visibility,
        plannedStartDate: date(plannedStartDate),
        plannedEndDate: date(plannedEndDate),
        actualStartDate: actualStartDate ? date(actualStartDate) : null,
        actualEndDate: actualEndDate ? date(actualEndDate) : null,
        notes,
      },
    });
  }

  const governance = await addWorkstream({
    refName: "Project Management",
    customName: "Governance and Launch Control",
    objective: "Keep the phased launch governed through clear gates, sponsor decisions, and weekly readiness rhythm.",
    deliverable: "Launch control room, decision log, and steering committee pack.",
    plannedStartDate: "2026-04-01",
    plannedEndDate: "2026-10-31",
    actualStartDate: "2026-04-03",
    notes: "Executive anchor workstream for the briefing.",
  });
  const experience = await addWorkstream({
    refName: "Customer",
    customName: "Patient Experience Design",
    objective: "Validate the patient journey with clinics and patients before go-live.",
    deliverable: "Approved onboarding journey, accessibility checklist, and patient messaging.",
    plannedStartDate: "2026-04-08",
    plannedEndDate: "2026-08-09",
    actualStartDate: "2026-04-10",
    notes: "Core narrative source for what changed since the last report.",
  });
  const integration = await addWorkstream({
    refName: "Architecture",
    customName: "Integration and Data Readiness",
    objective: "Prepare appointment, consent, and clinic master data interfaces for the pilot regions.",
    deliverable: "Validated interface runbook and reconciliation dashboard.",
    plannedStartDate: "2026-04-15",
    plannedEndDate: "2026-09-05",
    actualStartDate: "2026-04-17",
    notes: "Detailed-report workstream with technical and data risks.",
  });
  const security = await addWorkstream({
    refName: "Security",
    customName: "Security and Privacy Readiness",
    objective: "Complete privacy, consent, and access controls before launch approval.",
    deliverable: "Privacy sign-off evidence and role-based access checklist.",
    plannedStartDate: "2026-05-06",
    plannedEndDate: "2026-08-23",
    actualStartDate: "2026-05-08",
    notes: "Material because legal wording remains an executive decision.",
  });
  const mobile = await addWorkstream({
    refName: "Mob function",
    customName: "Clinic Mobile Workflow",
    objective: "Give nurses and front-desk teams a simple mobile flow for appointment check-in and patient notes.",
    deliverable: "Pilot mobile workflow and clinic support scripts.",
    plannedStartDate: "2026-05-20",
    plannedEndDate: "2026-09-12",
    actualStartDate: "2026-05-22",
    notes: "Shows why the demo is stronger with mobile plus operational UI.",
  });
  const customerDna = await addWorkstream({
    refName: "Customer DNA",
    customName: "Customer DNA and Adoption Signals",
    objective: "Capture sponsor preferences and clinic concerns as reusable reporting evidence.",
    deliverable: "Prioritized customer DNA register connected to risks and narrative.",
    plannedStartDate: "2026-06-03",
    plannedEndDate: "2026-09-20",
    actualStartDate: "2026-06-05",
    notes: "Turns qualitative stakeholder feedback into structured report inputs.",
  });
  const riskReporting = await addWorkstream({
    refName: "Risk reporting",
    customName: "Risk and Decision Intelligence",
    objective: "Maintain an executive-quality view of risks, actions, and pending decisions.",
    deliverable: "Risk heat narrative, mitigation actions, and management asks.",
    plannedStartDate: "2026-06-10",
    plannedEndDate: "2026-10-05",
    actualStartDate: "2026-06-12",
    notes: "Feeds both the briefing attention box and the extended executive report.",
  });
  const boardPack = await addWorkstream({
    refName: "Board Pack Engine",
    customName: "Executive Reporting and Benefits Tracking",
    objective: "Translate operational evidence into a one-page briefing and a full executive report.",
    deliverable: "Approved short narrative, extended executive report, and benefits KPI baseline.",
    plannedStartDate: "2026-06-17",
    plannedEndDate: "2026-10-15",
    actualStartDate: "2026-06-18",
    notes: "Demonstrates the difference between briefing and full report outputs.",
  });

  await prisma.projectEvent.createMany({
    data: [
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.STE_COM?.id,
        name: "Project kickoff and governance charter approved",
        reportingName: "Kickoff complete",
        description: "Sponsor, delivery lead, and clinic representatives agreed the phased-launch governance model.",
        eventDate: date("2026-04-03"),
        isCompleted: true,
        completionDate: date("2026-04-03"),
        visibility: "EXECUTIVE",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.MVP?.id,
        name: "Patient journey MVP approved",
        reportingName: "MVP approved",
        description: "Core appointment, consent, and check-in journey accepted for pilot readiness.",
        linkedProjectWorkstreamId: experience.id,
        eventDate: date("2026-06-28"),
        isCompleted: true,
        completionDate: date("2026-06-28"),
        visibility: "BOTH",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.V2_ARCH?.id,
        name: "Interface mapping and reconciliation design completed",
        reportingName: "Data readiness design",
        description: "Legacy clinic appointment and consent data mapping completed; reconciliation samples now in validation.",
        linkedProjectWorkstreamId: integration.id,
        eventDate: date("2026-07-11"),
        isCompleted: true,
        completionDate: date("2026-07-11"),
        visibility: "DETAILED",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.V3_ER?.id,
        name: "Narrative baseline prepared for briefing and executive report",
        reportingName: "Narrative baseline",
        description: "Short briefing assets and detailed executive report assets created from the same operational baseline.",
        linkedProjectWorkstreamId: boardPack.id,
        eventDate: date("2026-07-19"),
        isCompleted: true,
        completionDate: date("2026-07-19"),
        visibility: "BOTH",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.STE_COM?.id,
        name: "Security and privacy readiness review",
        reportingName: "Privacy readiness review",
        description: "Legal and security checkpoint to confirm consent wording, role access, and support evidence.",
        linkedProjectWorkstreamId: security.id,
        eventDate: date("2026-07-31"),
        visibility: "EXECUTIVE",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.APP_MOB?.id,
        name: "Pilot clinic mobile workflow validation",
        reportingName: "Mobile workflow pilot",
        description: "Pilot nurses and front desk users validate mobile check-in and patient-note capture.",
        linkedProjectWorkstreamId: mobile.id,
        eventDate: date("2026-08-07"),
        visibility: "BOTH",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.STE_COM?.id,
        name: "Launch readiness steering committee",
        reportingName: "Launch readiness committee",
        description: "Decision point for phased go-live, hypercare staffing, and sponsor communication.",
        eventDate: date("2026-08-20"),
        visibility: "EXECUTIVE",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.GO_LIVE?.id,
        name: "Pilot region go-live",
        reportingName: "Pilot go-live",
        description: "First two clinic regions transition to the portal and mobile workflow with hypercare support.",
        eventDate: date("2026-09-15"),
        visibility: "EXECUTIVE",
      },
      {
        projectId: project.id,
        eventTypeId: refs.eventTypeByCode.V3_ER?.id,
        name: "Benefits tracking review",
        reportingName: "Benefits review",
        description: "Review adoption, appointment-cycle time, consent quality, and first support trends after launch.",
        eventDate: date("2026-10-15"),
        visibility: "BOTH",
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
    targetResolutionDate,
    mitigationPlan,
    contingencyPlan,
    trigger,
    escalated = false,
    actionCode,
    actionDescription,
    dueDate,
    completionCriteria,
    evidence,
  }: {
    code: string;
    title: string;
    description: string;
    workstreamId: string;
    categoryCode: string;
    probability: number;
    impact: number;
    targetResolutionDate: string;
    mitigationPlan: string;
    contingencyPlan: string;
    trigger: string;
    escalated?: boolean;
    actionCode: string;
    actionDescription: string;
    dueDate: string;
    completionCriteria: string;
    evidence: string;
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
        identifiedDate: date("2026-07-05"),
        targetResolutionDate: date(targetResolutionDate),
        mitigationPlan,
        contingencyPlan,
        trigger,
        escalated,
        isActive: true,
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
        completionCriteria,
        evidence,
      },
    });

    return risk;
  }

  await addRisk({
    code: "DEMO-001-RISK-001",
    title: "Clinic adoption varies by region",
    description:
      "Pilot clinics have different readiness levels; without targeted onboarding, front-desk and nursing teams may use the portal inconsistently.",
    workstreamId: customerDna.id,
    categoryCode: "STAKEHOLDER",
    probability: 4,
    impact: 4,
    targetResolutionDate: "2026-08-15",
    mitigationPlan:
      "Run role-based onboarding, publish clinic readiness dashboard, and review adoption blockers weekly with regional leads.",
    contingencyPlan:
      "Keep two clinics in assisted-launch mode and defer full regional rollout until readiness criteria are met.",
    trigger: "Two or more pilot clinics miss readiness criteria or require repeated process rework.",
    escalated: true,
    actionCode: "DEMO-001-ACT-001",
    actionDescription: "Prepare clinic onboarding pack, regional Q&A script, and readiness dashboard.",
    dueDate: "2026-07-31",
    completionCriteria: "Pack approved and readiness calls scheduled for all pilot clinics.",
    evidence: "Demo evidence: clinic readiness checklist and sponsor Q&A draft.",
  });
  await addRisk({
    code: "DEMO-001-RISK-002",
    title: "Legacy clinic data quality slows pilot validation",
    description:
      "Appointment and consent records from two legacy clinic systems contain inconsistent identifiers and may require manual reconciliation.",
    workstreamId: integration.id,
    categoryCode: "TECHNICAL",
    probability: 3,
    impact: 4,
    targetResolutionDate: "2026-08-09",
    mitigationPlan:
      "Validate samples by clinic, compare exception rates, and agree a manual correction threshold before go-live.",
    contingencyPlan:
      "Launch pilot with limited history import and reconcile older records after go-live.",
    trigger: "Sample exception rate remains above five percent after the second validation cycle.",
    actionCode: "DEMO-001-ACT-002",
    actionDescription: "Complete data reconciliation sample and exception dashboard for pilot clinics.",
    dueDate: "2026-08-02",
    completionCriteria: "Exception dashboard reviewed with client data owner and pilot regions.",
    evidence: "Demo evidence: reconciliation dashboard snapshot.",
  });
  await addRisk({
    code: "DEMO-001-RISK-003",
    title: "Consent wording sign-off delays launch gate",
    description:
      "Privacy and legal teams have not yet approved final consent wording for the patient-facing flow.",
    workstreamId: security.id,
    categoryCode: "COMPLIANCE",
    probability: 3,
    impact: 5,
    targetResolutionDate: "2026-07-31",
    mitigationPlan:
      "Schedule legal workshop, separate mandatory consent text from optional patient messaging, and capture approval evidence.",
    contingencyPlan:
      "Use previously approved consent wording for pilot clinics while updated wording proceeds through final approval.",
    trigger: "No legal approval by the privacy readiness review.",
    escalated: true,
    actionCode: "DEMO-001-ACT-003",
    actionDescription: "Facilitate consent wording review and document privacy sign-off evidence.",
    dueDate: "2026-07-29",
    completionCriteria: "Approved wording or approved pilot fallback captured in the project evidence pack.",
    evidence: "Demo evidence: privacy review agenda and consent wording comparison.",
  });
  await addRisk({
    code: "DEMO-001-RISK-004",
    title: "Hypercare capacity may be thin during first two launch weeks",
    description:
      "The support rota is not yet confirmed for the first two weeks after pilot go-live.",
    workstreamId: mobile.id,
    categoryCode: "RESOURCE",
    probability: 3,
    impact: 3,
    targetResolutionDate: "2026-08-20",
    mitigationPlan:
      "Confirm support rota, escalation contacts, and mobile workflow triage categories before launch readiness committee.",
    contingencyPlan:
      "Reduce pilot scope to one region if support coverage cannot be confirmed.",
    trigger: "Named hypercare owners remain unconfirmed one week before launch committee.",
    actionCode: "DEMO-001-ACT-004",
    actionDescription: "Build hypercare staffing rota and first-week triage playbook.",
    dueDate: "2026-08-14",
    completionCriteria: "Named rota approved by sponsor and delivery lead.",
    evidence: "Demo evidence: draft hypercare rota.",
  });
  await addRisk({
    code: "DEMO-001-RISK-005",
    title: "Patient research sample may under-represent accessibility needs",
    description:
      "The first usability study over-sampled digitally confident patients, which could bias the portal design before launch.",
    workstreamId: experience.id,
    categoryCode: "QUALITY",
    probability: 2,
    impact: 4,
    targetResolutionDate: "2026-08-07",
    mitigationPlan:
      "Add accessibility review, invite additional patient profiles, and validate mobile screens with clinic staff.",
    contingencyPlan:
      "Keep assisted check-in path active until accessibility findings are closed.",
    trigger: "Accessibility review identifies unresolved blockers for the pilot user group.",
    actionCode: "DEMO-001-ACT-005",
    actionDescription: "Extend usability sample and run accessibility review before pilot validation.",
    dueDate: "2026-08-05",
    completionCriteria: "Accessibility findings logged with owner and launch impact.",
    evidence: "Demo evidence: expanded study plan.",
  });

  await prisma.projectDecision.createMany({
    data: [
      {
        projectId: project.id,
        projectWorkstreamId: governance.id,
        decisionCode: "DEMO-001-DEC-001",
        title: "Use phased launch instead of big-bang rollout",
        description: "Pilot regions give the team controlled learning loops and reduce patient-facing launch risk.",
        recommendation: "Approve two-region pilot with readiness gates before broader rollout.",
        decision: "Approved: phased launch with two pilot regions.",
        requestedBy: "Elena Martin",
        owner: "Marc Vidal",
        decisionDate: date("2026-06-30"),
        statusId: statuses.COMPLETED.id,
        impact: "HIGH",
        visibility: "EXECUTIVE",
      },
      {
        projectId: project.id,
        projectWorkstreamId: security.id,
        decisionCode: "DEMO-001-DEC-002",
        title: "Approve consent wording for pilot clinics",
        description: "Legal approval is required before the privacy readiness review can close.",
        recommendation: "Approve mandatory consent wording and keep optional patient education text outside the legal gate.",
        requestedBy: "Sofia Alvarez",
        owner: "Elena Martin",
        dueDate: date("2026-07-31"),
        statusId: statuses.OPEN.id,
        impact: "CRITICAL",
        escalated: true,
        visibility: "EXECUTIVE",
        notes: "Main management ask for the short briefing.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: mobile.id,
        decisionCode: "DEMO-001-DEC-003",
        title: "Confirm hypercare support model",
        description: "Named support owners are needed before the launch readiness committee.",
        recommendation: "Approve two-week hypercare rota with regional first responders and delivery escalation.",
        requestedBy: "Marc Vidal",
        owner: "Elena Martin",
        dueDate: date("2026-08-20"),
        statusId: statuses.OPEN.id,
        impact: "HIGH",
        visibility: "BOTH",
      },
      {
        projectId: project.id,
        projectWorkstreamId: boardPack.id,
        decisionCode: "DEMO-001-DEC-004",
        title: "Adopt KPI set for executive benefits tracking",
        description: "The report will track adoption, appointment-cycle time, consent quality, and support tickets.",
        recommendation: "Approve four launch KPIs with clinic-level drill-down in the detailed report.",
        decision: "Approved: four-KPI benefits baseline.",
        requestedBy: "Elena Martin",
        owner: "Marc Vidal",
        decisionDate: date("2026-07-12"),
        statusId: statuses.COMPLETED.id,
        impact: "MEDIUM",
        visibility: "DETAILED",
      },
      {
        projectId: project.id,
        projectWorkstreamId: experience.id,
        decisionCode: "DEMO-001-DEC-005",
        title: "Add accessibility review before pilot go-live",
        description: "The usability sample should be strengthened before final launch readiness.",
        recommendation: "Include accessibility review and keep assisted check-in available for pilot clinics.",
        decision: "Approved: accessibility review added to pilot validation.",
        requestedBy: "Sofia Alvarez",
        owner: "Marc Vidal",
        decisionDate: date("2026-07-18"),
        statusId: statuses.COMPLETED.id,
        impact: "MEDIUM",
        visibility: "BOTH",
      },
    ],
  });

  await prisma.timeEntry.createMany({
    data: [
      {
        projectId: project.id,
        projectWorkstreamId: governance.id,
        taskFamilyId: taskFamilyByCode.STE?.id ?? taskFamilyByCode.MEE.id,
        date: date("2026-07-10"),
        hours: 1.5,
        notes: "Prepared launch-readiness steering narrative and decision log.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: experience.id,
        taskFamilyId: taskFamilyByCode.UAT.id,
        date: date("2026-07-11"),
        hours: 2,
        notes: "Reviewed patient journey feedback and accessibility gaps with clinic users.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: integration.id,
        taskFamilyId: taskFamilyByCode.DTM.id,
        date: date("2026-07-12"),
        hours: 2.25,
        notes: "Validated appointment and consent reconciliation sample for pilot clinics.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: security.id,
        taskFamilyId: taskFamilyByCode.RIS.id,
        date: date("2026-07-13"),
        hours: 1.75,
        notes: "Prepared privacy-readiness risk assessment and consent wording comparison.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: mobile.id,
        taskFamilyId: taskFamilyByCode.TES.id,
        date: date("2026-07-14"),
        hours: 2,
        notes: "Tested mobile check-in workflow with clinic support scenarios.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: riskReporting.id,
        taskFamilyId: taskFamilyByCode.RIS.id,
        date: date("2026-07-16"),
        hours: 1.5,
        notes: "Updated risk exposure, mitigation actions, and management asks for executive review.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: boardPack.id,
        taskFamilyId: taskFamilyByCode.REP.id,
        date: date("2026-07-19"),
        hours: 2.75,
        notes: "Created differentiated short briefing and extended executive report narrative.",
      },
      {
        projectId: project.id,
        projectWorkstreamId: customerDna.id,
        taskFamilyId: taskFamilyByCode.KPI.id,
        date: date("2026-07-19"),
        hours: 1.25,
        notes: "Converted sponsor preferences and clinic concerns into customer DNA evidence.",
      },
    ],
  });

  await prisma.customerDna.createMany({
    data: [
      {
        projectId: project.id,
        category: "Executive Ask",
        priority: "HIGH",
        statement: "Show me where launch readiness is weak before it becomes a go-live issue.",
        status: "IN_PROGRESS",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-19"),
      },
      {
        projectId: project.id,
        category: "Reporting Preference",
        priority: "HIGH",
        statement: "Keep the briefing short, but let the executive report explain the operational evidence behind the traffic lights.",
        status: "ADDRESSED",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-19"),
      },
      {
        projectId: project.id,
        category: "Clinic Adoption",
        priority: "HIGH",
        statement: "Clinics need role-based onboarding; generic training will not change daily behavior.",
        status: "IN_PROGRESS",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-17"),
      },
      {
        projectId: project.id,
        category: "Privacy Concern",
        priority: "HIGH",
        statement: "Consent wording must be legally clear without making the patient journey feel frightening.",
        status: "IN_PROGRESS",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-18"),
      },
      {
        projectId: project.id,
        category: "Benefits",
        priority: "MEDIUM",
        statement: "Benefits must be measured by adoption, appointment-cycle time, consent quality, and support demand.",
        status: "ADDRESSED",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-19"),
      },
    ],
  });

  const report = await prisma.projectReportingPack.create({
    data: {
      projectId: project.id,
      title: "Atlas Care Portal - Demo Readiness Executive Pack",
      reportingDate: date("2026-07-19"),
      reportingPeriod: "July 2026",
      version: 1,
      status: "APPROVED",
      executiveSummary:
        "Atlas Care Portal remains AMBER: launch is viable; privacy sign-off and clinic readiness need sponsor attention before the August gate.",
      achievements:
        "MVP patient journey approved; interface reconciliation design completed; first narrative baseline created from operational data; benefits KPI set approved.",
      issues:
        "Executive watch items: consent wording approval; uneven clinic adoption. Managed items: legacy data quality; hypercare capacity.",
      nextSteps:
        "Close privacy wording, finish onboarding materials, validate pilot mobile workflow, confirm hypercare rota, and prepare the launch-readiness committee.",
      managementAsk:
        "Confirm consent-wording owner and approve the two-week hypercare model before the 20 August launch-readiness committee.",
      reportIndex:
        "1. Briefing summary\n2. Workstream progress\n3. Milestone timeline\n4. Risk and decision intelligence\n5. Customer DNA\n6. Benefits tracking\n7. Management asks",
      conclusion:
        "The project remains suitable for phased launch: delivery progress is solid; the August readiness gate must close consent wording, clinic readiness, and hypercare coverage.",
      isActive: true,
    },
  });

  const shortNarratives = [
    {
      objectKey: "executive-summary",
      content: "AMBER but controlled: launch is viable if privacy sign-off and clinic readiness close before the August gate.",
      presentationMode: "PARAGRAPH" as const,
    },
    {
      objectKey: "progress-since-last-report",
      content: "MVP approved; data design completed; first board narrative baseline published.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "issues-concerns",
      content: "Two watch items: consent wording and uneven clinic adoption.",
      presentationMode: "PARAGRAPH" as const,
    },
    {
      objectKey: "next-steps",
      content: "Close privacy wording, finish onboarding, validate mobile pilot, confirm hypercare.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "management-ask",
      content: "Sponsor to confirm consent owner and approve hypercare model before 20 August.",
      presentationMode: "PARAGRAPH" as const,
    },
    {
      objectKey: "conclusion",
      content: "Phased launch remains credible if consent, clinic readiness, and hypercare close before the August gate.",
      presentationMode: "PARAGRAPH" as const,
    },
  ];

  const detailedNarratives = [
    {
      objectKey: "executive-summary",
      content:
        "Delivery position: Atlas Care Portal is progressing toward a controlled two-region pilot; the patient journey MVP is approved; interface mapping is complete; the first board narrative baseline is published; benefits KPIs are agreed.\nAMBER rationale: final consent wording still needs approval; clinic readiness is uneven across pilot regions; both items have owners, mitigation actions, and steering visibility.\nExecutive implication: launch remains viable; the August readiness gate should focus on consent approval, onboarding evidence, and hypercare coverage.",
      presentationMode: "CHECKPOINTS" as const,
    },
    {
      objectKey: "accomplishments",
      content:
        "Product progress: patient journey MVP approved; mobile workflow moved into pilot validation; accessibility review added before go-live.\nData and integration: interface mapping design closed; reconciliation sample prepared; exception dashboard ready for client data-owner review.\nReporting progress: first differentiated briefing and executive report narrative set created; benefits KPI baseline approved; customer DNA converted into structured report evidence.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "issues-concerns",
      content:
        "Clinic adoption: regional readiness differs; generic training would not change daily behavior; role-based onboarding is therefore mandatory.\nPrivacy gate: legal sign-off is still open; consent wording must be clear without making the patient journey feel intimidating; fallback wording exists but would be weaker for launch confidence.\nOperational watch items: legacy data quality may require manual reconciliation; hypercare coverage is not yet fully named; both items have active mitigation actions and fallback options.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "next-steps",
      content:
        "By 31 July: close the privacy readiness review; confirm final consent wording or approved pilot fallback; capture sign-off evidence.\nBy 7 August: finish mobile workflow validation; complete expanded accessibility review; log findings with launch impact.\nBy 14 August: confirm named hypercare rota; agree triage categories; prepare first-week support playbook.\nBy 20 August: bring the launch committee a decision-ready pack; include readiness status, residual risks, pending decisions, and benefits baseline.",
      presentationMode: "BULLETS" as const,
    },
    {
      objectKey: "management-ask",
      content:
        "Decision needed: name the final consent-wording owner; confirm sponsor availability for the privacy review; approve the two-week hypercare support model.\nConsequence if delayed: pilot can still proceed with narrower scope; assisted-launch controls would remain active; the September go-live story would be less convincing.\nPreferred outcome: approve consent and hypercare before the readiness committee so the pilot launches with clear accountability and credible support.",
      presentationMode: "CHECKPOINTS" as const,
    },
    {
      objectKey: "conclusion",
      content:
        "Launch position: Atlas Care Portal remains suitable for a controlled two-region pilot; completed MVP, data-readiness design, and benefits baseline provide a solid delivery foundation.\nConditions to close: consent wording must be approved; clinic onboarding evidence must confirm regional readiness; hypercare coverage must be named before the launch committee.\nGovernance conclusion: proceed toward the August readiness gate; keep AMBER status until the open privacy and adoption risks are reduced to acceptable residual exposure.",
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

  return {
    projectCode,
    workstreamsCreated: 8,
    projectEventsCreated: 9,
    risksCreated: 5,
    riskActionsCreated: 5,
    decisionsCreated: 5,
    timeEntriesCreated: 8,
    customerDnaItemsCreated: 5,
    reportingPacksCreated: 1,
    managedNarrativesCreated: 12,
  };
}

async function main() {
  const refs = await requireReferenceData();
  const before = await countCurrentStoryData(refs.project.id);
  const plan = {
    mode,
    databasePath,
    projectCode,
    workspace: refs.demoWorkspace.code,
    willReplaceStoryDataOnly: true,
    before,
  };

  if (mode === "dry-run") {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const result = await rebuildDemo001Story();
  const after = await countCurrentStoryData(refs.project.id);
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
