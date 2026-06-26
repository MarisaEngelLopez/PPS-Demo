"use client";

import { useRouter } from "next/navigation";

type ProjectOption = {
  id: string;
  projectCode: string;
  name: string;
};

type Props = {
  projects: ProjectOption[];
  selectedProjectId?: string;
};

export default function ProjectReportSelector({
  projects,
  selectedProjectId,
}: Props) {
  const router = useRouter();

  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        width: "420px",
      }}
    >
      Project

 <select
        value={selectedProjectId ?? ""}
        className="filter-input"
style={{
    width: "420px",
    maxWidth: "420px",
    appearance: "auto",
    WebkitAppearance: "menulist",
    MozAppearance: "menulist",
  }}
        onChange={(event) => {
          const nextProjectId = event.target.value;
          router.push(`/executive-report?projectId=${nextProjectId}`);
          router.refresh();
        }}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.projectCode} — {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
