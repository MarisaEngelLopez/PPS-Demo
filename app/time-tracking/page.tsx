import { MainNav } from "@/components/MainNav";
import { TimeTrackingTable } from "@/components/admin/TimeTrackingTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { createTimeEntry, deleteTimeEntry } from "./actions";

export default async function TimeTrackingPage() {
  const projects = await prisma.project.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const projectWorkstreams = await prisma.projectWorkstream.findMany({
  where: {
        isActive: true,
  },
  include: {
    project: true,
    workstream: {
      include: {
        phase: true,
      },
    },
  },
  orderBy: [
    { workstream: { phase: { sortOrder: "asc" } } },
    { workstream: { sortOrder: "asc" } },
  ],
});

  const timeEntries = await prisma.timeEntry.findMany({
    include: {
      project: true,
      projectWorkstream: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
      },
    },
    orderBy: [
  { createdAt: "desc" },
  { date: "desc" },
],
  });

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Time Tracking</h1>

<div style={{ marginBottom: 12, color: "red" }}>
  Default project: {timeEntries[0]?.project?.projectCode} - {timeEntries[0]?.project?.name}
</div>

      <TimeTrackingTable
  projects={projects}
  projectWorkstreams={projectWorkstreams}
  timeEntries={timeEntries}
  defaultProjectId={timeEntries[0]?.projectId || projects[0]?.id || ""}
  createTimeEntry={createTimeEntry}
  deleteTimeEntry={deleteTimeEntry}
/>
    </main>
  );
}