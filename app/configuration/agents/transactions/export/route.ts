import { NextRequest } from "next/server";
import {
  agentActionLogInclude,
  escapeCsvCell,
  getAgentActionLogRows,
  getAgentActionLogWhere,
  parseAgentLogDateParam,
} from "@/lib/domain/agents/agentActionLog";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  const agentKey = request.nextUrl.searchParams.get("agentKey") || "";
  const actionType = request.nextUrl.searchParams.get("actionType") || "";
  const projectId = request.nextUrl.searchParams.get("projectId") || "";
  const from = parseAgentLogDateParam(fromParam);
  const to = parseAgentLogDateParam(toParam, true);

  const logs = await prisma.agentActionLog.findMany({
    where: getAgentActionLogWhere({
      from,
      to,
      agentKey: agentKey || null,
      actionType: actionType || null,
      projectId: projectId || null,
    }),
    include: agentActionLogInclude,
    orderBy: { createdAt: "desc" },
  });

  const rows = getAgentActionLogRows(logs);
  const headers = [
    "Timestamp",
    "Agent",
    "Action Type",
    "Actor",
    "Project",
    "Workstream",
    "Task",
    "Instruction",
    "Suggestion",
    "Work Session Id",
    "Approval Id",
    "Message",
    "Before",
    "After",
    "Metadata",
  ];

  const csv = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      [
        row.timestamp,
        row.agentKey,
        row.actionType,
        row.actor,
        row.project,
        row.workstream,
        row.task,
        row.instruction,
        row.suggestion,
        row.workSessionId,
        row.approvalId,
        row.message,
        row.before,
        row.after,
        row.metadata,
      ]
        .map(escapeCsvCell)
        .join(",")
    ),
  ].join("\r\n");

  const rangeLabel = `${fromParam || "all"}_${toParam || "all"}`;
  const agentLabel = agentKey || "all-agents";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agent-transaction-log-${agentLabel}-${rangeLabel}.csv"`,
    },
  });
}
