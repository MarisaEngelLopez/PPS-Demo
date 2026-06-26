import { revalidatePath } from "next/cache";
import { pageStyle, h1Style, tableButtonStyle } from "@/components/ui/layoutStyles";
import { tableStyle, thStyle, tdStyle } from "@/components/ui/tableStyles";
import { prisma } from "@/lib/prisma";
import { generateNextBusinessCode } from "@/lib/businessCodes/codeGenerator";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

async function getNextCodes() {
  return prisma.$transaction(async (tx) => ({
    project: await generateNextBusinessCode(tx, "PROJECT"),
    risk: await generateNextBusinessCode(tx, "RISK"),
    decision: await generateNextBusinessCode(tx, "DECISION"),
    riskAction: await generateNextBusinessCode(tx, "RISK_ACTION"),
  }));
}

async function purgeInactiveGeneratedProjects() {
  "use server";

  const projects = await prisma.project.findMany({
    where: {
      isActive: false,
      projectCode: { startsWith: "PR_" },
    },
    select: { id: true, projectCode: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const project of projects) {
      const risks = await tx.projectRisk.findMany({
        where: { projectId: project.id },
        select: { id: true },
      });
      const riskIds = risks.map((risk) => risk.id);

      if (riskIds.length > 0) {
        await tx.projectRiskAction.deleteMany({
          where: { projectRiskId: { in: riskIds } },
        });
      }

      await tx.projectDecision.deleteMany({ where: { projectId: project.id } });
      await tx.projectRisk.deleteMany({ where: { projectId: project.id } });
      await tx.projectReportingPack.deleteMany({ where: { projectId: project.id } });
      await tx.projectEvent.deleteMany({ where: { projectId: project.id } });
      await tx.timeEntry.deleteMany({ where: { projectId: project.id } });

      const workstreams = await tx.projectWorkstream.findMany({
        where: { projectId: project.id },
        select: { id: true },
      });
      const workstreamIds = workstreams.map((workstream) => workstream.id);

      if (workstreamIds.length > 0) {
        await tx.projectTask.deleteMany({
          where: { projectWorkstreamId: { in: workstreamIds } },
        });
      }

      await tx.projectWorkstream.deleteMany({ where: { projectId: project.id } });
      await tx.project.delete({ where: { id: project.id } });
    }
  });

  revalidatePath("/configuration/business-codes");
  revalidatePath("/admin/configuration/business-codes");
  revalidatePath("/admin/business-codes");
  revalidatePath("/projects");
  revalidatePath("/time-tracking");
}

async function purgeGeneratedRisks() {
  "use server";

  const risks = await prisma.projectRisk.findMany({
    where: {
      isActive: false,
      riskCode: { startsWith: "RI_" },
    },
    select: { id: true },
  });
  const riskIds = risks.map((risk) => risk.id);

  await prisma.$transaction(async (tx) => {
    if (riskIds.length > 0) {
      await tx.projectRiskAction.deleteMany({
        where: { projectRiskId: { in: riskIds } },
      });
    }
    await tx.projectRisk.deleteMany({
      where: {
        isActive: false,
        riskCode: { startsWith: "RI_" },
      },
    });
  });

  revalidatePath("/configuration/business-codes");
  revalidatePath("/admin/configuration/business-codes");
  revalidatePath("/admin/business-codes");
  revalidatePath("/risks");
}

async function purgeGeneratedRiskActions() {
  "use server";

  await prisma.projectRiskAction.deleteMany({
    where: {
      actionCode: { startsWith: "RA_" },
      projectRisk: { isActive: false },
    },
  });

  revalidatePath("/configuration/business-codes");
  revalidatePath("/admin/configuration/business-codes");
  revalidatePath("/admin/business-codes");
  revalidatePath("/risks");
}

async function purgeGeneratedDecisions() {
  "use server";

  await prisma.projectDecision.deleteMany({
    where: {
      isActive: false,
      decisionCode: { startsWith: "DE_" },
    },
  });

  revalidatePath("/configuration/business-codes");
  revalidatePath("/admin/configuration/business-codes");
  revalidatePath("/admin/business-codes");
  revalidatePath("/decisions");
}

export default async function BusinessCodesConfigurationPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const [nextCodes, projectCounts, riskCount, riskActionCount, decisionCount] =
    await Promise.all([
      getNextCodes(),
      prisma.project.groupBy({
        by: ["isActive"],
        where: { projectCode: { startsWith: "PR_" } },
        _count: { _all: true },
      }),
      prisma.projectRisk.groupBy({
        by: ["isActive"],
        where: { riskCode: { startsWith: "RI_" } },
        _count: { _all: true },
      }),
      Promise.all([
        prisma.projectRiskAction.count({
          where: {
            actionCode: { startsWith: "RA_" },
            projectRisk: { isActive: true },
          },
        }),
        prisma.projectRiskAction.count({
          where: {
            actionCode: { startsWith: "RA_" },
            projectRisk: { isActive: false },
          },
        }),
      ]),
      prisma.projectDecision.groupBy({
        by: ["isActive"],
        where: { decisionCode: { startsWith: "DE_" } },
        _count: { _all: true },
      }),
    ]);

  const activeProjects =
    projectCounts.find((row) => row.isActive)?._count._all ?? 0;
  const inactiveProjects =
    projectCounts.find((row) => !row.isActive)?._count._all ?? 0;
  const activeRisks = riskCount.find((row) => row.isActive)?._count._all ?? 0;
  const inactiveRisks =
    riskCount.find((row) => !row.isActive)?._count._all ?? 0;
  const [activeRiskActions, inactiveRiskActions] = riskActionCount;
  const activeDecisions =
    decisionCount.find((row) => row.isActive)?._count._all ?? 0;
  const inactiveDecisions =
    decisionCount.find((row) => !row.isActive)?._count._all ?? 0;

  const rows = [
    {
      area: "Projects",
      nextCode: nextCodes.project,
      existing: `${activeProjects} ${t("labels.active")} / ${inactiveProjects} ${t("labels.inactive")}`,
      action: purgeInactiveGeneratedProjects,
      button: t("configuration.businessCodes.purgeProjects"),
      note: t("configuration.businessCodes.projectGuardrail"),
    },
    {
      area: "Risks",
      nextCode: nextCodes.risk,
      existing: `${activeRisks} ${t("labels.active")} / ${inactiveRisks} ${t("labels.inactive")}`,
      action: purgeGeneratedRisks,
      button: t("configuration.businessCodes.purgeRisks"),
      note: t("configuration.businessCodes.riskGuardrail"),
    },
    {
      area: "Risk Actions",
      nextCode: nextCodes.riskAction,
      existing: `${activeRiskActions} ${t("labels.active")} / ${inactiveRiskActions} ${t("labels.inactive")}`,
      action: purgeGeneratedRiskActions,
      button: t("configuration.businessCodes.purgeRiskActions"),
      note: t("configuration.businessCodes.riskActionGuardrail"),
    },
    {
      area: "Decisions",
      nextCode: nextCodes.decision,
      existing: `${activeDecisions} ${t("labels.active")} / ${inactiveDecisions} ${t("labels.inactive")}`,
      action: purgeGeneratedDecisions,
      button: t("configuration.businessCodes.purgeDecisions"),
      note: t("configuration.businessCodes.decisionGuardrail"),
    },
  ];

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("configuration.businessCodes.title")}</h1>

      <p style={{ color: "#475569", maxWidth: 880 }}>
        {t("configuration.businessCodes.longDescription")}
      </p>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.area")}</th>
            <th style={thStyle}>{t("labels.nextCode")}</th>
            <th style={thStyle}>{t("labels.existingGeneratedRecords")}</th>
            <th style={thStyle}>{t("labels.resetAction")}</th>
            <th style={thStyle}>{t("labels.guardrail")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area}>
              <td style={tdStyle}>{row.area}</td>
              <td style={tdStyle}>{row.nextCode}</td>
              <td style={tdStyle}>{row.existing}</td>
              <td style={tdStyle}>
                <form action={row.action}>
                  <button type="submit" style={tableButtonStyle}>
                    {row.button}
                  </button>
                </form>
              </td>
              <td style={tdStyle}>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
