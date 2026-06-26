import { TemplateWorkstreamsTable } from "@/components/admin/TemplateWorkstreamsTable";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";
import {
  getActiveTemplateWorkstreamOptions,
  getProjectTemplateDetail,
} from "@/lib/domain/projectTemplates/projectTemplateQueries";
import {
  parseTemplateWorkstreamInput,
  parseTemplateWorkstreamUpdateInput,
  templateWorkstreamError,
  templateWorkstreamOk,
  validateTemplateWorkstreamInput,
} from "@/lib/domain/projectTemplates/projectTemplateValidation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

function templatePath(templateId: string) {
  return `/admin/project-templates/${templateId}`;
}

async function addTemplateWorkstream(formData: FormData) {
  "use server";

  const input = parseTemplateWorkstreamInput(formData);

  try {
    const validation = await validateTemplateWorkstreamInput(input);
    if (validation) return validation;

    await prisma.templateWorkstream.create({
      data: input,
    });

    revalidatePath(templatePath(input.templateId));

    return templateWorkstreamOk("Template workstream added successfully.");
  } catch (e) {
    console.error("Add template workstream error:", e);

    return templateWorkstreamError("Template workstream not added: database error.");
  }
}

async function updateTemplateWorkstream(formData: FormData) {
  "use server";

  const input = parseTemplateWorkstreamUpdateInput(formData);

  try {
    if (!input.id || !input.templateId) {
      return templateWorkstreamError("Template workstream not updated: missing record.");
    }

    await prisma.templateWorkstream.update({
      where: {
        id: input.id,
        templateId: input.templateId,
      },
      data: {
        sortOrder: input.sortOrder,
        plannedOffsetDays: input.plannedOffsetDays,
        durationDays: input.durationDays,
      },
    });

    revalidatePath(templatePath(input.templateId));

    return templateWorkstreamOk("Template workstream updated successfully.");
  } catch (e) {
    console.error("Update template workstream error:", e);

    return templateWorkstreamError("Template workstream not updated: database error.");
  }
}

async function deleteTemplateWorkstream(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const templateId = String(formData.get("templateId") || "");

  try {
    if (!id || !templateId) {
      return templateWorkstreamError("Template workstream not deleted: missing record.");
    }

    const existing = await prisma.templateWorkstream.findUnique({
      where: { id },
    });

    if (!existing) {
      return templateWorkstreamError("Template workstream not deleted: it no longer exists.");
    }

    if (existing.templateId !== templateId) {
      return templateWorkstreamError("Template workstream not deleted: template mismatch.");
    }

    await prisma.templateWorkstream.delete({
      where: { id },
    });

    revalidatePath(templatePath(templateId));

    return templateWorkstreamOk("Template workstream deleted successfully.");
  } catch (e) {
    console.error("Delete template workstream error:", e);

    return templateWorkstreamError("Template workstream not deleted: database error.");
  }
}

export default async function ProjectTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [template, workstreams] = await Promise.all([
    getProjectTemplateDetail(id),
    getActiveTemplateWorkstreamOptions(),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <main style={pageStyle}>
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
