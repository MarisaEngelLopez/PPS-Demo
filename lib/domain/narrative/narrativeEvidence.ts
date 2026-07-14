export type TimeEntryNarrativeEvidence = {
  date: Date;
  hours: number;
  notes: string | null;
  projectWorkstream: {
    customName?: string | null;
    reportingName?: string | null;
    workstream: { name: string };
  };
  projectTask?: {
    name: string;
    reportingName?: string | null;
  } | null;
};

export type NarrativeEvidenceTheme = {
  label: string;
  details: string[];
  latestDate: Date;
  hours: number;
};

const GENERIC_COMMENTS = new Set([
  "admin",
  "administration",
  "foundation",
  "foundation work",
  "meeting",
  "project management",
  "report preparation",
  "test",
  "testing",
  "work",
]);

function evidenceLabel(entry: TimeEntryNarrativeEvidence) {
  const workstream =
    entry.projectWorkstream.reportingName ||
    entry.projectWorkstream.customName ||
    entry.projectWorkstream.workstream.name;
  const task = entry.projectTask?.reportingName || entry.projectTask?.name;
  return task ? `${workstream} / ${task}` : workstream;
}

function normalizeComment(value: string) {
  return value.replace(/\s+/g, " ").replace(/[.;,\s]+$/g, "").trim();
}

function commentKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\p{L}]+/gu, " ").trim();
}

function isUsefulComment(value: string) {
  const key = commentKey(value);
  if (GENERIC_COMMENTS.has(key)) return false;
  if (/^(change[ds]?|update[ds]?)\s+(it|this|that|to)\b/i.test(key)) return false;
  return key.length >= 15 && key.split(" ").length >= 3;
}

export function buildTimeEntryEvidenceThemes({
  entries,
  comparisonDate,
  reportingDate,
}: {
  entries: TimeEntryNarrativeEvidence[];
  comparisonDate: Date;
  reportingDate: Date;
}) {
  const grouped = new Map<string, NarrativeEvidenceTheme & { seen: Set<string> }>();

  for (const entry of entries) {
    if (entry.date <= comparisonDate || entry.date > reportingDate || !entry.notes) continue;
    const detail = normalizeComment(entry.notes);
    if (!isUsefulComment(detail)) continue;

    const label = evidenceLabel(entry);
    const key = commentKey(detail);
    const group = grouped.get(label) ?? {
      label,
      details: [],
      latestDate: entry.date,
      hours: 0,
      seen: new Set<string>(),
    };

    group.hours += entry.hours;
    if (entry.date > group.latestDate) group.latestDate = entry.date;
    if (!group.seen.has(key) && group.details.length < 4) {
      group.details.push(detail);
      group.seen.add(key);
    }
    grouped.set(label, group);
  }

  return [...grouped.values()]
    .sort(
      (a, b) =>
        b.latestDate.getTime() - a.latestDate.getTime() || b.hours - a.hours
    )
    .map((theme) => ({
      label: theme.label,
      details: theme.details,
      latestDate: theme.latestDate,
      hours: theme.hours,
    }));
}

type EvidenceKind = "ACHIEVEMENT" | "ISSUE" | "NEXT_STEP";

function classifyDetail(detail: string): EvidenceKind {
  if (
    /\b(blocked|blocking|bug|error|fail(?:ed|ure)?|issue|need(?:s|ed)? attention|nok|not working|problem)\b/i.test(
      detail
    )
  ) {
    return "ISSUE";
  }
  if (
    /\b(begin|continue|continuing|improv(?:e|ing)|next|plan(?:ned)? to|start|upcoming|working on)\b/i.test(
      detail
    )
  ) {
    return "NEXT_STEP";
  }
  return "ACHIEVEMENT";
}

export function formatEvidenceThemes(
  themes: NarrativeEvidenceTheme[],
  kind: EvidenceKind,
  limit: number,
  localize: (value: string) => string = (value) => value
) {
  return themes.flatMap((theme) => {
    const details = theme.details
      .filter((detail) => classifyDetail(detail) === kind)
      .slice(0, 3);
    return details.length
      ? [`${localize(theme.label)}: ${details.map(localize).join("; ")}.`]
      : [];
  }).slice(0, limit);
}
