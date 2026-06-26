import Link from "next/link";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  compactInputStyle,
  h1Style,
  pageStyle,
  pageToggleButtonStyle,
  tableActionGroupStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, tdStyle, thStyle } from "@/components/ui/tableStyles";
import {
  agentActionLogInclude,
  getAgentActionLogRows,
  getAgentActionLogWhere,
  parseAgentLogDateParam,
} from "@/lib/domain/agents/agentActionLog";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

type SearchParams = {
  from?: string;
  to?: string;
  agentKey?: string;
  actionType?: string;
  projectId?: string;
};

export const dynamic = "force-dynamic";

export default async function AgentTransactionLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const from = parseAgentLogDateParam(params.from ?? null);
  const to = parseAgentLogDateParam(params.to ?? null, true);
  const agentKey = params.agentKey || "";
  const actionType = params.actionType || "";
  const projectId = params.projectId || "";

  const [logs, actionTypes, projects, agents] = await Promise.all([
    prisma.agentActionLog.findMany({
      where: getAgentActionLogWhere({
        from,
        to,
        agentKey: agentKey || null,
        actionType: actionType || null,
        projectId: projectId || null,
      }),
      include: agentActionLogInclude,
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.agentActionLog.findMany({
      where: agentKey ? { agentKey } : {},
      distinct: ["actionType"],
      select: { actionType: true },
      orderBy: { actionType: "asc" },
    }),
    prisma.project.findMany({
      orderBy: [{ projectCode: "asc" }, { name: "asc" }],
    }),
    prisma.agentDefinition.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const rows = getAgentActionLogRows(logs);
  const exportQuery = new URLSearchParams({
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(agentKey ? { agentKey } : {}),
    ...(actionType ? { actionType } : {}),
    ...(projectId ? { projectId } : {}),
  }).toString();

  return (
    <main style={pageStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <h1 style={h1Style}>{t("configuration.agentTransactions.title")}</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/configuration" style={pageToggleButtonStyle}>
            {t("configuration.title")}
          </Link>
          <Link href="/configuration/agents" style={pageToggleButtonStyle}>
            {t("configuration.agentConfig.title")}
          </Link>
        </div>
      </div>

      <SectionHeader title={t("configuration.agentTransactions.activity")} />
      <form
        method="get"
        style={{
          ...tableActionGroupStyle,
          marginBottom: "0.75rem",
          alignItems: "end",
        }}
      >
        <label style={{ color: "#475569", fontSize: "0.8rem" }}>
          {t("filters.from")}
          <input
            name="from"
            type="date"
            defaultValue={params.from ?? ""}
            style={compactInputStyle}
          />
        </label>
        <label style={{ color: "#475569", fontSize: "0.8rem" }}>
          {t("filters.to")}
          <input
            name="to"
            type="date"
            defaultValue={params.to ?? ""}
            style={compactInputStyle}
          />
        </label>
        <label style={{ color: "#475569", fontSize: "0.8rem" }}>
          {t("labels.agent")}
          <select
            name="agentKey"
            defaultValue={agentKey}
            style={{ ...compactInputStyle, minWidth: 190 }}
          >
            <option value="">{t("filters.allAgents")}</option>
            {agents.map((agent) => (
              <option key={agent.agentKey} value={agent.agentKey}>
                {agent.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ color: "#475569", fontSize: "0.8rem" }}>
          {t("labels.action")}
          <select
            name="actionType"
            defaultValue={actionType}
            style={{ ...compactInputStyle, minWidth: 210 }}
          >
            <option value="">{t("filters.allActions")}</option>
            {actionTypes.map((action) => (
              <option key={action.actionType} value={action.actionType}>
                {action.actionType}
              </option>
            ))}
          </select>
        </label>
        <label style={{ color: "#475569", fontSize: "0.8rem" }}>
          {t("labels.project")}
          <select
            name="projectId"
            defaultValue={projectId}
            style={{ ...compactInputStyle, minWidth: 240 }}
          >
            <option value="">{t("filters.allProjects")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectCode} - {project.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" style={tableButtonStyle}>
          {t("actions.apply")}
        </button>
        <Link
          href={`/configuration/agents/transactions/export${
            exportQuery ? `?${exportQuery}` : ""
          }`}
          style={tableButtonStyle}
        >
          {t("actions.downloadCsv")}
        </Link>
      </form>

      <div className="responsive-table-shell">
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t("labels.when")}</th>
              <th style={thStyle}>{t("labels.agent")}</th>
              <th style={thStyle}>{t("labels.action")}</th>
              <th style={thStyle}>{t("labels.project")}</th>
              <th style={thStyle}>{t("labels.workstream")}</th>
              <th style={thStyle}>{t("labels.task")}</th>
              <th style={thStyle}>{t("timeTracking.instruction")}</th>
              <th style={thStyle}>{t("labels.suggestion")}</th>
              <th style={thStyle}>{t("labels.message")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={tdStyle} colSpan={9}>
                  {t("configuration.noAgentTransactions")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.timestamp}</td>
                  <td style={tdStyle}>{row.agentKey}</td>
                  <td style={tdStyle}>{row.actionType}</td>
                  <td style={tdStyle}>{row.project}</td>
                  <td style={tdStyle}>{row.workstream}</td>
                  <td style={tdStyle}>{row.task}</td>
                  <td style={tdStyle}>{row.instruction}</td>
                  <td style={tdStyle}>{row.suggestion}</td>
                  <td style={tdStyle}>{row.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
