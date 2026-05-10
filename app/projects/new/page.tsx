import { MainNav } from "@/components/MainNav";
import {
  pageStyle,
  h1Style,
  formStyle,
  inputStyle,
  buttonStyle,
} from "@/components/ui/layoutStyles";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NewProjectPage() {
  const projectTypes = await prisma.projectType.findMany({
    where: { isActive: true },
  });

  const statuses = await prisma.projectStatus.findMany({
    where: { isActive: true },
  });

  const users = await prisma.user.findMany();

  async function createProject(formData: FormData) {
    "use server";

    const projectCode = String(formData.get("projectCode"));
    const name = String(formData.get("name"));
    const projectTypeId = String(formData.get("projectTypeId"));
    const statusId = String(formData.get("statusId"));
    const projectManagerId = String(formData.get("projectManagerId"));

    await prisma.project.create({
      data: {
        projectCode,
        name,
        projectTypeId,
        statusId,
        projectManagerId,
        startDate: new Date(),
        reportingCadence: "WEEKLY",
        defaultLanguage: "EN",
        reportLanguageMode: "EN",
        healthStatus: "GREEN",
        isActive: true,
      },
    });

    redirect("/projects");
  }

  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>➕ New Project</h1>

      <form action={createProject} style={formStyle}>
        <input name="projectCode" required placeholder="PRJ-002" style={inputStyle} />
        <input name="name" required placeholder="Project Name" style={inputStyle} />

        <select name="projectTypeId" style={inputStyle}>
          {projectTypes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select name="statusId" style={inputStyle}>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select name="projectManagerId" style={inputStyle}>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>

        <button type="submit" style={buttonStyle}>
          Create Project
        </button>
      </form>
    </main>
  );
}