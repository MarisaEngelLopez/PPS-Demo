const DEFAULT_DISPLAY_TIME_ZONE = "Europe/Madrid";

export function formatAgentDisplayTimestamp(value: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: process.env.APP_DISPLAY_TIME_ZONE || DEFAULT_DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
