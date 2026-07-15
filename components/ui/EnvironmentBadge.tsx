export function EnvironmentBadge() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "DEV";
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "local";
  const gitBranch = process.env.NEXT_PUBLIC_GIT_BRANCH || "unknown";

  return (
    <div
      style={{
        fontSize: "0.75rem",
        fontWeight: 700,
        padding: "0.25rem 0.5rem",
        borderRadius: "999px",
        background: "#f8fafc",
        color: "#475569",
        border: "1px solid #cbd5e1",
        whiteSpace: "nowrap",
      }}
      title={`${appEnv} · ${gitBranch} · ${appVersion}`}
    >
      {appEnv} · {gitBranch} · {appVersion}
    </div>
  );
}
