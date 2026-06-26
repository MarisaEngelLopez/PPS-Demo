export type NarrativeChunkOptions = {
  maxVisualLines: number;
  approximateCharsPerLine: number;
};

function estimateVisualLines(line: string, approximateCharsPerLine: number) {
  if (!line.trim()) return 1;
  return Math.max(1, Math.ceil(line.length / approximateCharsPerLine));
}

export function chunkNarrativeText(
  text: string | null | undefined,
  { maxVisualLines, approximateCharsPerLine }: NarrativeChunkOptions
) {
  if (!text?.trim()) return [];

  const chunks: string[] = [];
  const current: string[] = [];
  let currentVisualLines = 0;

  for (const line of text.trim().split(/\r?\n/)) {
    const lineVisualLines = estimateVisualLines(line, approximateCharsPerLine);
    const shouldStartNewChunk =
      current.length > 0 && currentVisualLines + lineVisualLines > maxVisualLines;

    if (shouldStartNewChunk) {
      chunks.push(current.join("\n").trimEnd());
      current.length = 0;
      currentVisualLines = 0;
    }

    current.push(line);
    currentVisualLines += lineVisualLines;
  }

  if (current.length > 0) {
    chunks.push(current.join("\n").trimEnd());
  }

  return chunks;
}
