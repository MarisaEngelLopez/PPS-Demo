import ExcelJS from "exceljs";

import { prisma } from "@/lib/prisma";
import { getServerLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";

export async function GET() {
  const locale = await getServerLocale();
  const isSpanish = locale === "es";
  const entries = await prisma.timeEntry.findMany({
    include: {
      project: true,
      taskFamily: true,
      projectTask: true,
      projectWorkstream: {
        include: {
          workstream: { include: { phase: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Project Ops System";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(isSpanish ? "Partes de horas" : "Time entries", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = [
    { header: isSpanish ? "Fecha" : "Date", key: "date", width: 14 },
    { header: isSpanish ? "Código de proyecto" : "Project code", key: "projectCode", width: 18 },
    { header: isSpanish ? "Proyecto" : "Project", key: "project", width: 32 },
    { header: isSpanish ? "Fase" : "Phase", key: "phase", width: 22 },
    { header: isSpanish ? "Línea de trabajo" : "Workstream", key: "workstream", width: 34 },
    { header: isSpanish ? "Familia de tareas" : "Task family", key: "taskFamily", width: 24 },
    { header: isSpanish ? "Tarea" : "Task", key: "task", width: 30 },
    { header: isSpanish ? "Horas" : "Hours", key: "hours", width: 12 },
    { header: isSpanish ? "Comentarios" : "Comments", key: "notes", width: 60 },
  ];

  entries.forEach((entry) => {
    worksheet.addRow({
      date: entry.date,
      projectCode: entry.project.projectCode,
      project: entry.project.name,
      phase: entry.projectWorkstream.workstream.phase?.name ?? "",
      workstream: entry.projectWorkstream.workstream.name,
      taskFamily:
        isSpanish && entry.taskFamily.nameEs
          ? entry.taskFamily.nameEs
          : entry.taskFamily.name,
      task: entry.projectTask?.name ?? "",
      hours: entry.hours,
      notes: entry.notes ?? "",
    });
  });

  worksheet.autoFilter = { from: "A1", to: "I1" };
  worksheet.getColumn("date").numFmt = isSpanish ? "dd/mm/yyyy" : "yyyy-mm-dd";
  worksheet.getColumn("hours").numFmt = "0.00";
  worksheet.getRow(1).height = 24;
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { vertical: "middle" };
  });
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: "top", wrapText: true };
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="time-entries-${date}.xlsx"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
