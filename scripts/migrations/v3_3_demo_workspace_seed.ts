import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

type Mode = "dry-run" | "apply";

const demoProjectCodes = ["DEMO_001", "DEMO_002"];
const demoOrganizationCodes = [
  "DEMO-NOVA-HEALTH",
  "DEMO-BRIGHTBRIDGE",
  "DEMO-ATLAS-INSURANCE",
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

function isSandboxPath(databasePath: string) {
  return path.basename(databasePath).toLowerCase() === "dev-sandbox.db";
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
  fail("Demo seed refused: database is not dev-sandbox.db. Use --allow-non-sandbox only for disposable test copies.");
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function requireReferenceData() {
  const [demoWorkspace, liveWorkspace, owner, activeStatus, openStatus, completedStatus] =
    await Promise.all([
      prisma.workspace.findUnique({ where: { code: "DEMO" } }),
      prisma.workspace.findUnique({ where: { code: "LIVE" } }),
      prisma.user.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.status.findUnique({ where: { code: "ACTIVE" } }),
      prisma.status.findUnique({ where: { code: "OPEN" } }),
      prisma.status.findUnique({ where: { code: "COMPLETED" } }),
    ]);

  if (!demoWorkspace) fail("Missing DEMO workspace. Run db:security-seed:v3-3 first.");
  if (!liveWorkspace) fail("Missing LIVE workspace. Run db:security-seed:v3-3 first.");
  if (!owner) fail("Missing operational User.");
  if (!activeStatus || !openStatus || !completedStatus) {
    fail("Missing required status rows: ACTIVE, OPEN, COMPLETED.");
  }

  const [digitalProduct, transformation, scopeRisk, scheduleRisk, stakeholderRisk] =
    await Promise.all([
      prisma.projectType.findUnique({ where: { code: "DP_INTPMO" } }),
      prisma.projectType.findUnique({ where: { code: "OP_TRANSF" } }),
      prisma.riskCategory.findUnique({ where: { code: "SCOPE" } }),
      prisma.riskCategory.findUnique({ where: { code: "SCHEDULE" } }),
      prisma.riskCategory.findUnique({ where: { code: "STAKEHOLDER" } }),
    ]);

  if (!digitalProduct || !transformation) {
    fail("Missing required project types: DP_INTPMO and OP_TRANSF.");
  }
  if (!scopeRisk || !scheduleRisk || !stakeholderRisk) {
    fail("Missing required risk categories: SCOPE, SCHEDULE, STAKEHOLDER.");
  }

  const taskFamilies = await prisma.taskFamily.findMany({
    where: { code: { in: ["PLA", "REP", "RIS", "UAT", "MEE"] } },
  });
  const taskFamilyByCode = Object.fromEntries(taskFamilies.map((item) => [item.code, item]));
  for (const code of ["PLA", "REP", "RIS", "UAT", "MEE"]) {
    if (!taskFamilyByCode[code]) fail(`Missing task family: ${code}`);
  }

  const workstreams = await prisma.workstream.findMany({
    where: {
      name: {
        in: [
          "Project Management",
          "Requirements",
          "Architecture",
          "Steering Committee",
          "Customer",
          "Board Pack Engine",
          "Audience Views",
          "Risk Data Model",
        ],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  function workstream(name: string) {
    const item = workstreams.find((row) => row.name === name);
    if (!item) fail(`Missing workstream reference: ${name}`);
    return item;
  }

  return {
    demoWorkspace,
    owner,
    statuses: { activeStatus, openStatus, completedStatus },
    projectTypes: { digitalProduct, transformation },
    riskCategories: { scopeRisk, scheduleRisk, stakeholderRisk },
    taskFamilyByCode,
    workstream,
  };
}

async function cleanupExistingDemoData() {
  const projects = await prisma.project.findMany({
    where: { projectCode: { in: demoProjectCodes } },
    select: { id: true },
  });
  const projectIds = projects.map((project) => project.id);

  if (projectIds.length > 0) {
    const riskIds = (
      await prisma.projectRisk.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true },
      })
    ).map((risk) => risk.id);
    const actionIds = riskIds.length
      ? (
          await prisma.projectRiskAction.findMany({
            where: { projectRiskId: { in: riskIds } },
            select: { id: true },
          })
        ).map((action) => action.id)
      : [];
    const narrativeIds = (
      await prisma.managedNarrative.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true },
      })
    ).map((narrative) => narrative.id);

    if (actionIds.length) {
      await prisma.riskActionEvidence.deleteMany({
        where: { riskActionId: { in: actionIds } },
      });
    }
    await prisma.projectRiskAction.deleteMany({
      where: { projectRiskId: { in: riskIds } },
    });
    await prisma.riskAssessment.deleteMany({ where: { riskId: { in: riskIds } } });
    await prisma.riskReview.deleteMany({ where: { riskId: { in: riskIds } } });
    await prisma.projectRisk.deleteMany({ where: { id: { in: riskIds } } });
    await prisma.projectDecision.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.timeEntry.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectEvent.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.customerDna.deleteMany({ where: { projectId: { in: projectIds } } });
    if (narrativeIds.length) {
      await prisma.managedNarrativeRevision.deleteMany({
        where: { narrativeId: { in: narrativeIds } },
      });
    }
    await prisma.managedNarrative.deleteMany({ where: { id: { in: narrativeIds } } });
    await prisma.projectReportingPack.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectWorkstream.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }

  const organizations = await prisma.organization.findMany({
    where: { code: { in: demoOrganizationCodes } },
    select: { id: true },
  });
  const organizationIds = organizations.map((organization) => organization.id);
  if (organizationIds.length > 0) {
    await prisma.executiveIntelligence.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.organizationContact.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
  }
}

async function createDemoData() {
  const refs = await requireReferenceData();
  const { demoWorkspace, owner, statuses, projectTypes, riskCategories, taskFamilyByCode } =
    refs;

  await cleanupExistingDemoData();

  const nova = await prisma.organization.create({
    data: {
      workspaceId: demoWorkspace.id,
      code: "DEMO-NOVA-HEALTH",
      name: "Nova Health Group",
      displayName: "Nova Health",
      industry: "Healthcare",
      country: "Spain",
      organizationType: "CLIENT",
      notes: "Synthetic demo client for prize and product demonstrations.",
      contacts: {
        create: [
          {
            name: "Elena Martin",
            roleTitle: "Chief Operating Officer",
            email: "elena.martin@demo-nova.example",
            isSponsor: true,
          },
          {
            name: "Sofia Alvarez",
            roleTitle: "Patient Experience Lead",
            email: "sofia.alvarez@demo-nova.example",
          },
        ],
      },
    },
    include: { contacts: true },
  });

  const brightBridge = await prisma.organization.create({
    data: {
      workspaceId: demoWorkspace.id,
      code: "DEMO-BRIGHTBRIDGE",
      name: "BrightBridge Delivery",
      displayName: "BrightBridge",
      industry: "Consulting",
      country: "Spain",
      organizationType: "DELIVERY",
      notes: "Synthetic demo delivery partner.",
      contacts: {
        create: [
          {
            name: "Marc Vidal",
            roleTitle: "Delivery Director",
            email: "marc.vidal@demo-brightbridge.example",
          },
        ],
      },
    },
    include: { contacts: true },
  });

  const atlas = await prisma.organization.create({
    data: {
      workspaceId: demoWorkspace.id,
      code: "DEMO-ATLAS-INSURANCE",
      name: "Atlas Insurance Services",
      displayName: "Atlas Insurance",
      industry: "Insurance",
      country: "Netherlands",
      organizationType: "CLIENT",
      notes: "Synthetic demo client for portfolio-level views.",
      contacts: {
        create: [
          {
            name: "Nina Janssen",
            roleTitle: "Transformation Sponsor",
            email: "nina.janssen@demo-atlas.example",
            isSponsor: true,
          },
        ],
      },
    },
    include: { contacts: true },
  });

  const projectOne = await prisma.project.create({
    data: {
      workspaceId: demoWorkspace.id,
      projectCode: "DEMO_001",
      name: "Atlas Care Portal Launch",
      description:
        "Synthetic demo project showing executive reporting, risks, decisions, customer DNA, and time tracking in one coherent delivery story.",
      projectTypeId: projectTypes.digitalProduct.id,
      governedStatusId: statuses.activeStatus.id,
      startDate: date("2026-04-01"),
      plannedStartDate: date("2026-04-01"),
      plannedEndDate: date("2026-10-31"),
      reportingCadence: "MONTHLY",
      defaultLanguage: "EN",
      secondaryLanguage: "ES",
      reportLanguageMode: "BILINGUAL",
      healthStatus: "AMBER",
      issuerOrganizationId: brightBridge.id,
      clientOrganizationId: nova.id,
      deliveryOrganizationId: brightBridge.id,
      projectManagerContactId: brightBridge.contacts[0]?.id,
      sponsorContactId: nova.contacts.find((contact) => contact.isSponsor)?.id,
    },
  });

  const projectTwo = await prisma.project.create({
    data: {
      workspaceId: demoWorkspace.id,
      projectCode: "DEMO_002",
      name: "Finance Control Tower",
      description:
        "Synthetic demo project for transformation governance, board pack preparation, and stakeholder decision tracking.",
      projectTypeId: projectTypes.transformation.id,
      governedStatusId: statuses.activeStatus.id,
      startDate: date("2026-03-15"),
      plannedStartDate: date("2026-03-15"),
      plannedEndDate: date("2026-12-15"),
      reportingCadence: "MONTHLY",
      defaultLanguage: "EN",
      reportLanguageMode: "EN",
      healthStatus: "GREEN",
      issuerOrganizationId: brightBridge.id,
      clientOrganizationId: atlas.id,
      deliveryOrganizationId: brightBridge.id,
      projectManagerContactId: brightBridge.contacts[0]?.id,
      sponsorContactId: atlas.contacts[0]?.id,
    },
  });

  async function addWorkstream(projectId: string, name: string, customName: string) {
    return prisma.projectWorkstream.create({
      data: {
        projectId,
        workstreamId: refs.workstream(name).id,
        governedStatusId: statuses.activeStatus.id,
        customName,
        reportingName: customName,
        objective: `Deliver ${customName.toLowerCase()} outcomes for the demo scenario.`,
        deliverable: `${customName} checkpoint pack`,
        visibility: "BOTH",
        plannedStartDate: date("2026-04-01"),
        plannedEndDate: date("2026-10-31"),
        actualStartDate: date("2026-04-03"),
        notes: "Synthetic demo workstream.",
      },
    });
  }

  const p1Governance = await addWorkstream(projectOne.id, "Project Management", "Governance");
  const p1Experience = await addWorkstream(projectOne.id, "Customer", "Patient Experience");
  const p1Reporting = await addWorkstream(projectOne.id, "Board Pack Engine", "Executive Reporting");
  await addWorkstream(projectTwo.id, "Project Management", "Governance");
  const p2Reporting = await addWorkstream(projectTwo.id, "Audience Views", "Finance Audience Views");

  await prisma.projectEvent.createMany({
    data: [
      {
        projectId: projectOne.id,
        eventTypeId: (await prisma.eventType.findUnique({ where: { code: "MVP" } }))?.id,
        name: "MVP patient journey approved",
        reportingName: "MVP approved",
        description: "Core patient onboarding flow accepted for demo release.",
        linkedProjectWorkstreamId: p1Experience.id,
        eventDate: date("2026-06-28"),
        isCompleted: true,
        completionDate: date("2026-06-28"),
      },
      {
        projectId: projectOne.id,
        eventTypeId: (await prisma.eventType.findUnique({ where: { code: "STE_COM" } }))?.id,
        name: "Steering committee: launch readiness",
        reportingName: "Launch readiness committee",
        description: "Decision point for go-live readiness and support model.",
        linkedProjectWorkstreamId: p1Governance.id,
        eventDate: date("2026-08-20"),
      },
      {
        projectId: projectTwo.id,
        eventTypeId: (await prisma.eventType.findUnique({ where: { code: "V3_ER" } }))?.id,
        name: "Board pack automation checkpoint",
        reportingName: "Board pack checkpoint",
        description: "Review automated board pack storylines and financial control views.",
        linkedProjectWorkstreamId: p2Reporting.id,
        eventDate: date("2026-09-05"),
      },
    ],
  });

  const risk = await prisma.projectRisk.create({
    data: {
      projectId: projectOne.id,
      projectWorkstreamId: p1Experience.id,
      categoryId: riskCategories.stakeholderRisk.id,
      statusId: statuses.openStatus.id,
      ownerId: owner.id,
      riskCode: "DEMO-RISK-001",
      title: "Clinic adoption varies by region",
      description:
        "Regional clinics may interpret the new portal process differently without targeted onboarding.",
      probability: 3,
      impact: 4,
      exposure: 12,
      identifiedDate: date("2026-05-15"),
      targetResolutionDate: date("2026-08-15"),
      mitigationPlan: "Run role-based onboarding sessions and publish clinic readiness dashboard.",
      trigger: "Two or more pilot clinics miss readiness criteria.",
      escalated: true,
    },
  });

  await prisma.projectRiskAction.create({
    data: {
      projectRiskId: risk.id,
      actionCode: "DEMO-ACT-001",
      description: "Prepare clinic onboarding pack and regional Q&A script.",
      ownerId: owner.id,
      dueDate: date("2026-07-31"),
      statusId: statuses.activeStatus.id,
      completionCriteria: "Onboarding pack approved and scheduled for all pilot clinics.",
      evidence: "Demo evidence placeholder: readiness checklist and Q&A script.",
    },
  });

  await prisma.projectDecision.createMany({
    data: [
      {
        projectId: projectOne.id,
        projectWorkstreamId: p1Governance.id,
        decisionCode: "DEMO-DEC-001",
        title: "Use phased launch instead of big-bang rollout",
        description: "Pilot clinics provide cleaner feedback loops and lower go-live risk.",
        recommendation: "Approve phased rollout with two pilot regions.",
        decision: "Approved for demo scenario.",
        requestedBy: "Elena Martin",
        owner: "Marc Vidal",
        decisionDate: date("2026-06-30"),
        statusId: statuses.completedStatus.id,
        impact: "HIGH",
        visibility: "EXECUTIVE",
      },
      {
        projectId: projectTwo.id,
        projectWorkstreamId: p2Reporting.id,
        decisionCode: "DEMO-DEC-002",
        title: "Adopt exception-based board reporting",
        description: "Executives want attention on forecast breaks, risk exposure, and asks.",
        recommendation: "Use exception-driven narrative and keep detailed tables in appendix.",
        requestedBy: "Nina Janssen",
        owner: "Marisa Engel",
        dueDate: date("2026-08-10"),
        statusId: statuses.openStatus.id,
        impact: "MEDIUM",
        visibility: "BOTH",
      },
    ],
  });

  await prisma.timeEntry.createMany({
    data: [
      {
        projectId: projectOne.id,
        projectWorkstreamId: p1Governance.id,
        taskFamilyId: taskFamilyByCode.MEE.id,
        date: date("2026-07-10"),
        hours: 1.5,
        notes: "Demo steering preparation and launch-readiness review.",
      },
      {
        projectId: projectOne.id,
        projectWorkstreamId: p1Reporting.id,
        taskFamilyId: taskFamilyByCode.REP.id,
        date: date("2026-07-11"),
        hours: 2.25,
        notes: "Prepared executive summary and risk narrative for demo board pack.",
      },
      {
        projectId: projectTwo.id,
        projectWorkstreamId: p2Reporting.id,
        taskFamilyId: taskFamilyByCode.PLA.id,
        date: date("2026-07-12"),
        hours: 1.75,
        notes: "Designed control tower audience view for finance leadership.",
      },
    ],
  });

  await prisma.customerDna.createMany({
    data: [
      {
        projectId: projectOne.id,
        category: "Executive Ask",
        priority: "HIGH",
        statement: "Show me where launch readiness is weak before it becomes a go-live issue.",
        status: "IN_PROGRESS",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-12"),
      },
      {
        projectId: projectTwo.id,
        category: "Board Reporting",
        priority: "MEDIUM",
        statement: "Separate operational detail from the board narrative.",
        status: "ADDRESSED",
        ownerId: owner.id,
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-09"),
      },
    ],
  });

  await prisma.executiveIntelligence.createMany({
    data: [
      {
        organizationId: nova.id,
        contactId: nova.contacts.find((contact) => contact.isSponsor)?.id,
        category: "Stakeholder preference",
        sensitivity: "INTERNAL",
        confidence: "HIGH",
        note: "Sponsor prefers concise traffic-light summaries with explicit management asks.",
        source: "Synthetic demo briefing",
        visibility: "RESTRICTED",
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-12"),
      },
      {
        organizationId: atlas.id,
        contactId: atlas.contacts[0]?.id,
        category: "Decision style",
        sensitivity: "INTERNAL",
        confidence: "MEDIUM",
        note: "Finance sponsor values exception reporting and quantified residual risk.",
        source: "Synthetic demo briefing",
        visibility: "RESTRICTED",
        createdByUserId: owner.id,
        lastReviewed: date("2026-07-12"),
      },
    ],
  });

  const report = await prisma.projectReportingPack.create({
    data: {
      projectId: projectOne.id,
      title: "Atlas Care Portal - July Executive Update",
      reportingDate: date("2026-07-15"),
      reportingPeriod: "July 2026",
      version: 1,
      status: "READY",
      executiveSummary:
        "The demo project is on track for phased launch, with clinic onboarding as the main watch item.",
      achievements:
        "MVP patient journey approved; governance rhythm established; first board narrative prepared.",
      issues:
        "Regional clinic adoption remains the main risk and requires targeted onboarding.",
      nextSteps:
        "Complete onboarding pack, validate pilot readiness, and confirm launch support model.",
      managementAsk:
        "Approve phased rollout and confirm sponsor availability for the readiness committee.",
      conclusion:
        "The project is suitable for executive demo because it connects delivery, risk, decisions, and reporting.",
    },
  });

  const narrative = await prisma.managedNarrative.create({
    data: {
      projectId: projectOne.id,
      objectKey: "executive-summary",
      variant: "board",
      language: "EN",
    },
  });

  await prisma.managedNarrativeRevision.create({
    data: {
      narrativeId: narrative.id,
      sourceReportingPackId: report.id,
      revisionNumber: 1,
      status: "APPROVED",
      content:
        "Atlas Care Portal is progressing toward a controlled phased launch. The main executive focus is clinic readiness, where targeted onboarding will reduce adoption risk before go-live.",
      presentationMode: "PARAGRAPH",
      sourceType: "MANUAL",
      approvedAt: date("2026-07-15"),
      publishedAt: date("2026-07-15"),
    },
  });

  return {
    projectsCreated: 2,
    organizationsCreated: 3,
    workstreamsCreated: 5,
    eventsCreated: 3,
    risksCreated: 1,
    riskActionsCreated: 1,
    decisionsCreated: 2,
    timeEntriesCreated: 3,
    customerDnaItemsCreated: 2,
    executiveIntelligenceItemsCreated: 2,
    reportingPacksCreated: 1,
    narrativesCreated: 1,
  };
}

async function main() {
  const existingDemoProjectCount = await prisma.project.count({
    where: { projectCode: { in: demoProjectCodes } },
  });
  const existingDemoOrganizationCount = await prisma.organization.count({
    where: { code: { in: demoOrganizationCodes } },
  });

  const plan = {
    mode,
    databasePath,
    existingDemoProjectCount,
    existingDemoOrganizationCount,
    willReplaceProjectCodes: demoProjectCodes,
    willReplaceOrganizationCodes: demoOrganizationCodes,
  };

  if (mode === "dry-run") {
    await requireReferenceData();
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const result = await createDemoData();
  console.log(JSON.stringify({ ...plan, result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
