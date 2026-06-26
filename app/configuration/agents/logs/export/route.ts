import { NextRequest } from "next/server";
import {
  escapeCsvCell,
  formatLogTimestamp,
  getAgentConfigurationLogRows,
} from "@/lib/domain/agents/agentConfigurationLog";
import { prisma } from "@/lib/prisma";

function parseDateParam(value: string | null, endOfDay = false) {
  if (!value) return null;

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  const from = parseDateParam(request.nextUrl.searchParams.get("from"));
  const to = parseDateParam(request.nextUrl.searchParams.get("to"), true);

  const logs = await prisma.agentConfigurationChangeLog.findMany({
    where: {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      agent: true,
      capability: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = getAgentConfigurationLogRows(logs);
  const headers = [
    "Timestamp",
    "Area",
    "Agent",
    "Target",
    "Change Type",
    "Field",
    "Previous Value",
    "New Value",
  ];

  const csv = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      [
        formatLogTimestamp(row.createdAt),
        row.area,
        row.agent,
        row.target,
        row.changeType,
        row.field,
        row.previousValue,
        row.newValue,
      ]
        .map(escapeCsvCell)
        .join(",")
    ),
  ].join("\r\n");

  const rangeLabel = `${request.nextUrl.searchParams.get("from") || "all"}_${
    request.nextUrl.searchParams.get("to") || "all"
  }`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agent-configuration-log-${rangeLabel}.csv"`,
    },
  });
}
