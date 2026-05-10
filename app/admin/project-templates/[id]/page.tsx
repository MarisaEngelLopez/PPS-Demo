import { MainNav } from "@/components/MainNav";
import { TemplateWorkstreamsTable } from "@/components/admin/TemplateWorkstreamsTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

async function addTemplateWorkstream(formData: FormData) {
  "use server";

  const templateId = String(formData.get("templateId") || "");
  const workstreamId = String(formData.get("workstreamId") || "");
  const sortOrder = Number(formData.get("sortOrder") || 100);

  const plannedOffsetDaysRaw = String(formData.get("plannedOffsetDays") || "");
  const durationDaysRaw = String(formData.get("durationDays") || "");

  const plannedOffsetDays =
    plannedOffsetDaysRaw === "" ? null : Number(plannedOffsetDaysRaw);

  const durationDays = durationDaysRaw === "" ? null : Number(durationDaysRaw);

  try {
    if (!templateId || !workstreamId) {
      return {
        ok: false,
        message: "Template workstream not added: template and workstream are required.",
      };
    }

    const existing = await prisma.templateWorkstream.findFirst({
      where: {
        templateId,
        workstreamId,
      },
    });

    if (existing) {
      return {
        ok: false,
        message: "Template workstream not added: already exists in this template.",
      };
    }

    await prisma.templateWorkstream.create({
      data: {
        templateId,
        workstreamId,
        sortOrder: Number.isNaN(sortOrder) ? 100 : sortOrder,
        plannedOffsetDays:
          plannedOffsetDays === null || Number.isNaN(plannedOffsetDays)
            ? null
            : plannedOffsetDays,
        durationDays:
          durationDays === null || Number.isNaN(durationDays)
            ? null
            : durationDays,
      },
    });

    revalidatePath(`/admin/project-templates/${templateId}`);

    return {
      ok: true,
      message: "Template workstream added successfully.",
    };
  } catch (e) {
    console.error("Add template workstream error:", e);

    return {
      ok: false,
      message: "Template workstream not added: database error.",
    };
  }
}

async function updateTemplateWorkstream(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const templateId = String(formData.get("templateId") || "");

  const sortOrder = Number(formData.get("sortOrder"));
  const plannedOffsetDaysRaw = String(formData.get("plannedOffsetDays") || "");
  const durationDaysRaw = String(formData.get("durationDays") || "");

  const plannedOffsetDays =
    plannedOffsetDaysRaw === "" ? null : Number(plannedOffsetDaysRaw);

  const durationDays = durationDaysRaw === "" ? null : Number(durationDaysRaw);

  try {
    if (!id || !templateId) {
      return {
        ok: false,
        message: "Template workstream not updated: missing record.",
      };
    }

    await prisma.templateWorkstream.update({
      where: { id },
      data: {
        sortOrder: Number.isNaN(sortOrder) ? 100 : sortOrder,
        plannedOffsetDays:
          plannedOffsetDays === null || Number.isNaN(plannedOffsetDays)
            ? null
            : plannedOffsetDays,
        durationDays:
          durationDays === null || Number.isNaN(durationDays)
            ? null
            : durationDays,
      },
    });

    revalidatePath(`/admin/project-templates/${templateId}`);

    return {
      ok: true,
      message: "Template workstream updated successfully.",
    };
  } catch (e) {
    console.error("Update template workstream error:", e);

    return {
      ok: false,
      message: "Template workstream not updated: database error.",
    };
  }
}

async function deleteTemplateWorkstream(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const templateId = String(formData.get("templateId") || "");

  try {
    if (!id || !templateId) {
      return {
        ok: false,
        message: "Template workstream not deleted: missing record.",
      };
    }

    await prisma.templateWorkstream.delete({
      where: { id },
    });

    revalidatePath(`/admin/project-templates/${templateId}`);

    return {
      ok: true,
      message: "Template workstream deleted successfully.",
    };
  } catch (e) {
    console.error("Delete template workstream error:", e);

    return {
      ok: false,
      message: "Template workstream not deleted: database error.",
    };
  }
}

export default async function ProjectTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const template = await prisma.projectTemplate.findUnique({
    where: { id },
    include: {
      templateWorkstreams: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
        orderBy: [
          { sortOrder: "asc" },
          { workstream: { phase: { sortOrder: "asc" } } },
          { workstream: { sortOrder: "asc" } },
        ],
      },
    },
  });

  if (!template) {
    notFound();
  }

  const workstreams = await prisma.workstream.findMany({
    where: { isActive: true },
    include: {
      phase: true,
    },
    orderBy: [
      { phase: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>{template.name}</h1>

      <TemplateWorkstreamsTable
        template={template}
        workstreams={workstreams}
        addTemplateWorkstream={addTemplateWorkstream}
        updateTemplateWorkstream={updateTemplateWorkstream}
        deleteTemplateWorkstream={deleteTemplateWorkstream}
      />
    </main>
  );
}