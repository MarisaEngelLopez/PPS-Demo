export type NarrativePresentationMode = "BULLETS" | "CHECKPOINTS";

export type NarrativePresentationItem = {
  text: string;
  children: string[];
};

function cleanPoint(value: string) {
  return value.replace(/^\s*(?:[-*•✓✔◦▪–]|\d+[.)])\s*/, "").trim();
}

function parseItem(value: string): NarrativePresentationItem {
  const point = cleanPoint(value);
  const separator = point.indexOf(":");
  if (separator <= 0) return { text: point, children: [] };

  const text = point.slice(0, separator).trim();
  const children = point
    .slice(separator + 1)
    .split(";")
    .map(cleanPoint)
    .filter(Boolean);
  return children.length ? { text, children } : { text: point, children: [] };
}

export function getNarrativePresentationItems(
  text: string | null | undefined,
  mode: NarrativePresentationMode
) {
  if (!text?.trim()) return [];

  const rawLines = text.split(/\r?\n/).filter((line) => line.trim());
  const lines =
    mode === "CHECKPOINTS" && rawLines.length === 1
      ? rawLines[0].split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/u)
      : rawLines;
  const items: NarrativePresentationItem[] = [];

  for (const line of lines) {
    if (/^\s+(?:[◦▪–])\s*/u.test(line) && items.length > 0) {
      items[items.length - 1].children.push(cleanPoint(line));
      continue;
    }
    items.push(parseItem(line));
  }

  return items;
}

export function formatNarrativePresentationText(
  text: string | null | undefined,
  mode: NarrativePresentationMode
) {
  const marker = mode === "CHECKPOINTS" ? "✓" : "•";
  return getNarrativePresentationItems(text, mode)
    .flatMap((item) => [
      `${marker} ${item.text}`,
      ...item.children.map((child) => `   ◦ ${child}`),
    ])
    .join("\n");
}
