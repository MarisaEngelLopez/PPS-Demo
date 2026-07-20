export function getEnvironmentDisplay() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "DEV";
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "local";
  const gitBranch = process.env.NEXT_PUBLIC_GIT_BRANCH || "unknown";
  const normalizedEnv = appEnv.trim().toUpperCase();
  const isDev = normalizedEnv === "DEV" || normalizedEnv.includes("SANDBOX");

  return {
    appEnv,
    appVersion,
    gitBranch,
    isDev,
    label: isDev ? "DEV DB" : appEnv,
    title: `${appEnv} · ${gitBranch} · ${appVersion}`,
    style: isDev
      ? {
          background: "#dc2626",
          border: "1px solid #fecaca",
          boxShadow: "0 0 0 2px rgba(220, 38, 38, 0.22)",
          color: "#ffffff",
        }
      : {
          background: "#f8fafc",
          border: "1px solid #cbd5e1",
          boxShadow: "none",
          color: "#475569",
        },
  };
}
