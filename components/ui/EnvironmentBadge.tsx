export function EnvironmentBadge() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "DEV";
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "local";
  const gitBranch = process.env.NEXT_PUBLIC_GIT_BRANCH || "unknown";

  const isProd = appEnv === "PROD";

  return (
    <div
      style={{
        fontSize: "0.75rem",
        fontWeight: 700,
        padding: "0.25rem 0.5rem",
        borderRadius: "999px",
        background: isProd ? "#dcfce7" : "#fee2e2",
        color: isProd ? "#166534" : "#991b1b",
        border: `1px solid ${isProd ? "#86efac" : "#fecaca"}`,
        whiteSpace: "nowrap",
      }}
      title={`${appEnv} · ${gitBranch} · ${appVersion}`}
    >
      {appEnv} · {gitBranch} · {appVersion}
    </div>
  );
}