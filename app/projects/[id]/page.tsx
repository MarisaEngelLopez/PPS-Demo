import { revalidatePath } from "next/cache";
import { MainNav } from "@/components/MainNav";
import {
  pageStyle,
  h1Style,
  buttonStyle,
  detailGridStyle,
  labelStyle,
  compactInputStyle,
} from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProjectHeaderForm } from "@/components/projects/ProjectHeaderForm";
import { ProjectWorkstreamsTable } from "@/components/projects/ProjectWorkstreamsTable";
import { ProjectEventsTable } from "@/components/projects/ProjectEventsTable";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";

async function updateProject(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const sponsorIdRaw = String(formData.get("sponsorId") || "");
  const statusId = String(formData.get("statusId") || "");
  const healthStatus = String(formData.get("healthStatus") || "GREEN");
  const reportingCadence = String(formData.get("reportingCadence") || "WEEKLY");
const startDate = String(formData.get("startDate") || "");
const plannedStartDate = String(formData.get("plannedStartDate") || "");
const plannedEndDate = String(formData.get("plannedEndDate") || "");
const actualStartDate = String(formData.get("actualStartDate") || "");
const actualEndDate = String(formData.get("actualEndDate") || "");
  
  try {
    if (!id || !name || !statusId) {
      return {
        ok: false,
        message: "Project not updated: name and status are required.",
      };
    }

if (!startDate) {
  return {
    ok: false,
    message: "Project not updated: start date is required.",
  };
}

    if (
      plannedStartDate &&
      plannedEndDate &&
      new Date(plannedEndDate) < new Date(plannedStartDate)
    ) {
      return {
        ok: false,
        message: "Project not updated: planned end cannot be before planned start.",
      };
    }

    if (
      actualStartDate &&
      actualEndDate &&
      new Date(actualEndDate) < new Date(actualStartDate)
    ) {
      return {
        ok: false,
        message: "Project not updated: actual end cannot be before actual start.",
      };
    }

    await prisma.project.update({
      where: { id },
      data: {
        name,
        sponsorId: sponsorIdRaw || null,
        statusId,
        healthStatus: healthStatus as "GREEN" | "AMBER" | "RED",
        reportingCadence: reportingCadence as "WEEKLY" | "MONTHLY",
        startDate: startDate ? new Date(startDate) : new Date(),
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
      },
    });

    revalidatePath(`/projects/${id}`);

    return {
      ok: true,
      message: "Project updated successfully.",
    };
  } catch (e: any) {
  console.error("Update project error FULL:", e);

  return {
    ok: false,
    message: `Project not updated: ${e?.code || ""} ${e?.message || "database error."}`,
  };
}
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      projectType: true,
      status: true,
      projectManager: true,
      sponsor: true,
    },
  });

 if (!project) {
  notFound();
}


async function createProjectWorkstream(formData: FormData) {
  "use server";

  const workstreamId = String(formData.get("workstreamId") || "");

  try {
    if (!workstreamId) {
      return {
        ok: false,
        message: "Project workstream not added: workstream is required.",
      };
    }

    const workstream = await prisma.workstream.findUnique({
      where: { id: workstreamId },
    });

    if (!workstream) {
      return {
        ok: false,
        message: "Project workstream not added: workstream no longer exists.",
      };
    }

    if (!workstream.isActive) {
      return {
        ok: false,
        message: "Project workstream not added: workstream is inactive.",
      };
    }

    const existing = await prisma.projectWorkstream.findFirst({
  where: {
    projectId: id,
    workstreamId,
  },
});

    if (existing) {
      return {
        ok: false,
        message:
          "Project workstream not added: already exists in this project.",
      };
    }

    await prisma.projectWorkstream.create({
      data: {
        projectId: id,
        workstreamId,
        isActive: true,
      },
    });

    revalidatePath(`/projects/${id}`);

    return {
      ok: true,
      message: "Project workstream added successfully.",
    };
  } catch (e) {
    console.error("Create project workstream error:", e);

    return {
      ok: false,
      message: "Project workstream not added: database error.",
    };
  }
}

  async function toggleProjectWorkstream(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    const current = String(formData.get("current") || "") === "true";

    try {
      if (!id) {
        return {
          ok: false,
          message: "Project workstream not updated: missing record.",
        };
      }

      const updated = await prisma.projectWorkstream.update({
        where: { id },
        data: {
          isActive: !current,
        },
      });

      revalidatePath(`/projects/${id}`);

      return {
        ok: true,
        message: updated.isActive
          ? "Project workstream activated successfully."
          : "Project workstream deactivated successfully.",
      };
    } catch (e) {
      console.error("Toggle project workstream error:", e);

      return {
        ok: false,
        message: "Project workstream not updated: database error.",
      };
    }
  }

  async function deleteProjectWorkstream(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");

    try {
      if (!id) {
        return {
          ok: false,
          message: "Project workstream not deleted: missing record.",
        };
      }

      const timeEntryCount = await prisma.timeEntry.count({
        where: {
          projectWorkstreamId: id,
        },
      });

      if (timeEntryCount > 0) {
        return {
          ok: false,
          message: "Project workstream not deleted: it has time entries.",
        };
      }

      await prisma.projectWorkstream.delete({
        where: { id },
      });

      revalidatePath(`/projects/${id}`);

      return {
        ok: true,
        message: "Project workstream deleted successfully.",
      };
    } catch (e) {
      console.error("Delete project workstream error:", e);

      return {
        ok: false,
        message: "Project workstream not deleted: database error.",
      };
    }
  }

  async function updateProjectWorkstreamDates(formData: FormData) {
    "use server";

    const id = String(formData.get("id") || "");
    const plannedStartDate = String(formData.get("plannedStartDate") || "");
    const plannedEndDate = String(formData.get("plannedEndDate") || "");
    const actualStartDate = String(formData.get("actualStartDate") || "");
    const actualEndDate = String(formData.get("actualEndDate") || "");

    try {
      if (!id) {
        return {
          ok: false,
          message: "Project workstream dates not updated: missing record.",
        };
      }

      if (
        plannedStartDate &&
        plannedEndDate &&
        new Date(plannedEndDate) < new Date(plannedStartDate)
      ) {
        return {
          ok: false,
          message: "Dates not saved: planned end cannot be before planned start.",
        };
      }

      if (
        actualStartDate &&
        actualEndDate &&
        new Date(actualEndDate) < new Date(actualStartDate)
      ) {
        return {
          ok: false,
          message: "Dates not saved: actual end cannot be before actual start.",
        };
      }

      await prisma.projectWorkstream.update({
        where: { id },
        data: {
          plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
          plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
          actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
          actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
        },
      });

      revalidatePath(`/projects/${id}`);

      return {
        ok: true,
        message: "Project workstream dates updated successfully.",
      };
    } catch (e) {
      console.error("Update project workstream dates error:", e);

      return {
        ok: false,
        message: "Project workstream dates not updated: database error.",
      };
    }
  }

 async function createProjectEvent(formData: FormData) {
  "use server";

  const projectId = String(formData.get("projectId") || "");
  const eventTypeId = String(formData.get("eventTypeId") || "");
  const eventDate = String(formData.get("eventDate") || "");

  try {
    if (!projectId || !eventTypeId || !eventDate) {
      return {
        ok: false,
        message: "Milestone not added: event type and date are required.",
      };
    }

    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
    });

    if (!eventType) {
      return {
        ok: false,
        message: "Milestone not added: event type no longer exists.",
      };
    }

    if (!eventType.isActive) {
      return {
        ok: false,
        message: "Milestone not added: event type is inactive.",
      };
    }

    await prisma.projectEvent.create({
      data: {
        projectId,
        eventTypeId,
        name: eventType.name,
        eventDate: new Date(eventDate),
        isActive: true,
      },
    });

    revalidatePath(`/projects/${id}`);

    return {
      ok: true,
      message: "Milestone added successfully.",
    };
  } catch (e) {
    console.error("Create milestone error:", e);

    return {
      ok: false,
      message: "Milestone not added: database error.",
    };
  }
}

async function toggleProjectEvent(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");
  const current = String(formData.get("current") || "") === "true";

  try {
    if (!id || !projectId) {
      return {
        ok: false,
        message: "Milestone not updated: missing record.",
      };
    }

    const updated = await prisma.projectEvent.update({
      where: { id },
      data: { isActive: !current },
    });

    revalidatePath(`/projects/${id}`);

    return {
      ok: true,
      message: updated.isActive
        ? "Milestone activated successfully."
        : "Milestone deactivated successfully.",
    };
  } catch (e) {
    console.error("Toggle milestone error:", e);

    return {
      ok: false,
      message: "Milestone not updated: database error.",
    };
  }
}

async function deleteProjectEvent(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const projectId = String(formData.get("projectId") || "");

  try {
    if (!id || !projectId) {
      return {
        ok: false,
        message: "Milestone not deleted: missing record.",
      };
    }

    await prisma.projectEvent.delete({
      where: { id },
    });

    revalidatePath(`/projects/${id}`);

    return {
      ok: true,
      message: "Milestone deleted successfully.",
    };
  } catch (e) {
    console.error("Delete milestone error:", e);

    return {
      ok: false,
      message: "Milestone not deleted: database error.",
    };
  }
}

const users = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
  });

  const statuses = await prisma.projectStatus.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const projectWorkstreams = await prisma.projectWorkstream.findMany({
    where: { projectId: project.id },
    include: {
      workstream: {
        include: {
          phase: true,
        },
      },
      status: true,
    },
    orderBy: [
      { workstream: { phase: { sortOrder: "asc" } } },
      { workstream: { sortOrder: "asc" } },
    ],
  });

  const availableWorkstreams = await prisma.workstream.findMany({
    where: { isActive: true },
    include: {
      phase: true,
    },
    orderBy: [
      { phase: { sortOrder: "asc" } },
      { sortOrder: "asc" },
    ],
  });

const projectEvents = await prisma.projectEvent.findMany({
  where: { projectId: project.id },
  include: {
    eventType: true,
  },
  orderBy: { eventDate: "asc" },
});

const eventTypes = await prisma.eventType.findMany({
  where: { isActive: true },
  orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
});

    return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>{project.name}</h1>

<ProjectHeaderForm
  project={project}
  users={users}
  statuses={statuses}
  updateProject={updateProject}
/>

      <h2 style={h1Style}>Project Workstreams</h2>

      <ProjectWorkstreamsTable
        availableWorkstreams={availableWorkstreams}
        projectWorkstreams={projectWorkstreams}
        createProjectWorkstream={createProjectWorkstream}
        toggleProjectWorkstream={toggleProjectWorkstream}
        deleteProjectWorkstream={deleteProjectWorkstream}
        updateProjectWorkstreamDates={updateProjectWorkstreamDates}
      />

<h2 style={h1Style}>Project Milestones</h2>

<ProjectEventsTable
  projectId={project.id}
  events={projectEvents}
eventTypes={eventTypes}
  createProjectEvent={createProjectEvent}
  toggleProjectEvent={toggleProjectEvent}
  deleteProjectEvent={deleteProjectEvent}
/>

<div style={{ marginTop: "2rem" }}>
 <ProjectTimeline
  projectWorkstreams={projectWorkstreams.filter((pw) => pw.isActive)}
  projectEvents={projectEvents.filter((event) => event.isActive)}
/>
</div>

  
    </main>
  );
}