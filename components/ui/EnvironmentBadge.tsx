import { getEnvironmentDisplay } from "@/components/ui/environmentStyles";

export function EnvironmentBadge() {
  const environment = getEnvironmentDisplay();

  return (
    <div
      style={{
        fontSize: "0.75rem",
        fontWeight: 700,
        padding: "0.25rem 0.5rem",
        borderRadius: "999px",
        whiteSpace: "nowrap",
        ...environment.style,
      }}
      title={environment.title}
    >
      {environment.label} · {environment.gitBranch} · {environment.appVersion}
    </div>
  );
}
