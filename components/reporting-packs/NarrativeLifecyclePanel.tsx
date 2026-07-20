"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionToast } from "@/components/ui/useActionToast";
import { buttonStyle, sectionPanelStyle } from "@/components/ui/layoutStyles";
import type {
  ManagedNarrativeSummary,
  NarrativeLifecycleAction,
} from "@/components/reporting-packs/types";
import { getBriefingContentBudget } from "@/lib/domain/narrative/briefingContentBudget";

const OBJECT_LABELS: Record<string, string> = {
  "executive-summary": "Executive Summary",
  "progress-since-last-report": "Progress Since Last Report",
  accomplishments: "Accomplishments",
  "issues-concerns": "Issues / Concerns",
  "next-steps": "Next Steps",
  "management-ask": "Management Ask",
  conclusion: "Conclusion",
};

function getEvidenceCount(evidenceJson?: string | null) {
  if (!evidenceJson) return 0;
  try {
    const evidence = JSON.parse(evidenceJson) as Record<string, unknown>;
    return Object.values(evidence).reduce<number>(
      (total, value) => total + (Array.isArray(value) ? value.length : 0),
      0
    );
  } catch {
    return 0;
  }
}

export function NarrativeLifecyclePanel({
  projectId,
  reportingPackId,
  narratives,
  language,
  onLanguageChange,
  reviewNarrativeProposal,
  updateNarrativeProposal,
}: {
  projectId: string;
  reportingPackId: string;
  narratives: ManagedNarrativeSummary[];
  language: "EN" | "ES";
  onLanguageChange: (language: "EN" | "ES") => void;
  reviewNarrativeProposal: NarrativeLifecycleAction;
  updateNarrativeProposal: NarrativeLifecycleAction;
}) {
  const router = useRouter();
  const { handleAction } = useActionToast();
  const [variant, setVariant] = useState<"SHORT" | "DETAILED">("SHORT");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const visibleNarratives = useMemo(
    () => narratives.filter((item) => item.language === language && item.variant === variant),
    [language, narratives, variant]
  );

  async function review(revisionId: string, decision: "APPROVE" | "REJECT" | "PUBLISH") {
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("revisionId", revisionId);
    formData.set("decision", decision);
    await handleAction(reviewNarrativeProposal, formData, () => router.refresh());
  }

  async function save(revisionId: string, originalContent: string) {
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("revisionId", revisionId);
    formData.set("content", drafts[revisionId] ?? originalContent);
    await handleAction(updateNarrativeProposal, formData, () => router.refresh());
  }

  if (narratives.length === 0) return null;

  return (
    <section style={{ ...sectionPanelStyle, margin: "1rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", marginBottom: "0.6rem", flexWrap: "wrap" }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>Narrative Assets</div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {(["EN", "ES"] as const).map((value) => (
            <button key={value} type="button" onClick={() => onLanguageChange(value)} style={{ ...buttonStyle, padding: "0.3rem 0.55rem", background: language === value ? "#334155" : "#fff", color: language === value ? "#fff" : "#475569", border: "1px solid #cbd5e1" }}>{value}</button>
          ))}
          {(["SHORT", "DETAILED"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setVariant(value)} style={{ ...buttonStyle, padding: "0.3rem 0.55rem", background: variant === value ? "#1d4ed8" : "#fff", color: variant === value ? "#fff" : "#475569", border: "1px solid #cbd5e1" }}>{value}</button>
          ))}
        </div>
      </div>
      <div style={{ color: "#64748b", fontSize: "0.76rem", marginBottom: "0.55rem" }}>
        SHORT feeds the one-page briefing. DETAILED feeds the full executive report, PDF, and PowerPoint.
      </div>
      <div style={{ display: "grid", gap: "0.45rem" }}>
        {visibleNarratives.length === 0 && (
          <div style={{ padding: "0.6rem", color: "#9a3412", background: "#fff7ed" }}>
            No {language} {variant.toLowerCase()} assets exist yet. Keep {language} selected and generate the narrative.
          </div>
        )}
        {visibleNarratives.map((narrative) => {
          const proposal = narrative.revisions.find(
            (revision) =>
              revision.status === "PROPOSED" &&
              revision.sourceReportingPackId === reportingPackId
          );
          const approved = narrative.revisions.find((revision) => revision.status === "APPROVED");
          const evidenceCount = getEvidenceCount(
            (proposal ?? approved)?.evidenceJson
          );
          const budget =
            variant === "SHORT" && proposal
              ? getBriefingContentBudget(
                  drafts[proposal.id] ?? proposal.content,
                  narrative.objectKey
                )
              : null;
          return (
            <div
              key={narrative.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, 1fr) auto auto",
                gap: "0.5rem",
                alignItems: "center",
                borderTop: "1px solid #e2e8f0",
                paddingTop: "0.45rem",
                fontSize: "0.78rem",
              }}
            >
              <div>
                <strong>{OBJECT_LABELS[narrative.objectKey] ?? narrative.objectKey}</strong>
                <span style={{ color: "#64748b", marginLeft: "0.4rem" }}>
                  {narrative.variant} / {narrative.language}
                </span>
              </div>
              <div style={{ color: proposal ? "#9a3412" : "#475569" }}>
                {proposal
                  ? `Revision ${proposal.revisionNumber} awaiting review`
                  : approved
                    ? `Revision ${approved.revisionNumber} ${approved.publishedAt ? "published" : "approved"}`
                    : "No active revision"}
              </div>
              <div style={{ display: "flex", gap: "0.3rem", minWidth: "138px" }}>
                {proposal && (
                  <Fragment key={`proposal-actions-${proposal.id}`}>
                    <button type="button" disabled={budget ? !budget.fits : false} title={budget && !budget.fits ? "Short narrative exceeds the one-page briefing budget." : undefined} onClick={() => review(proposal.id, "APPROVE")} style={{ ...buttonStyle, padding: "0.3rem 0.55rem", opacity: budget && !budget.fits ? 0.5 : 1 }}>
                      Approve
                    </button>
                    <button type="button" onClick={() => review(proposal.id, "REJECT")} style={{ ...buttonStyle, padding: "0.3rem 0.55rem", background: "#fff", color: "#475569", border: "1px solid #cbd5e1" }}>
                      Reject
                    </button>
                  </Fragment>
                )}
                {!proposal && approved && !approved.publishedAt && (
                  <button type="button" onClick={() => review(approved.id, "PUBLISH")} style={{ ...buttonStyle, padding: "0.3rem 0.55rem", background: "#0f766e" }}>
                    Publish
                  </button>
                )}
              </div>
              {proposal && (
                <details style={{ gridColumn: "1 / -1", background: "#f8fafc", padding: "0.45rem" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                    Review changes · {proposal.sourceType} · {evidenceCount} evidence records
                  </summary>
                  <div style={{ display: "grid", gridTemplateColumns: approved ? "1fr 1fr" : "1fr", gap: "0.6rem", marginTop: "0.45rem" }}>
                    {approved && <div><strong>Approved</strong><div style={{ whiteSpace: "pre-wrap", marginTop: "0.25rem" }}>{approved.content}</div></div>}
                    <div>
                      <strong>Proposed</strong>
                      <textarea
                        value={drafts[proposal.id] ?? proposal.content}
                        onChange={(event) => setDrafts((current) => ({ ...current, [proposal.id]: event.target.value }))}
                        rows={variant === "SHORT" ? 5 : 9}
                        style={{ width: "100%", marginTop: "0.25rem", padding: "0.45rem", resize: "vertical", border: "1px solid #cbd5e1", font: "inherit", lineHeight: 1.45 }}
                      />
                      {budget && !budget.fits && (
                        <div style={{ color: "#9a3412", fontSize: "0.72rem", fontWeight: 700, marginTop: "0.3rem" }}>
                          One-page budget exceeded by approximately {budget.overflowLines} line{budget.overflowLines === 1 ? "" : "s"}. Edit this SHORT asset before approval.
                        </div>
                      )}
                      {budget?.fits && (
                        <div style={{ color: "#166534", fontSize: "0.7rem", marginTop: "0.3rem" }}>
                          One-page budget: {budget.visualLines}/{budget.maxVisualLines} estimated lines.
                        </div>
                      )}
                      <button type="button" onClick={() => save(proposal.id, proposal.content)} style={{ ...buttonStyle, marginTop: "0.35rem", padding: "0.3rem 0.55rem" }}>Save proposal</button>
                    </div>
                  </div>
                </details>
              )}
              {!proposal && approved && evidenceCount > 0 && (
                <div style={{ gridColumn: "1 / -1", color: "#475569", fontSize: "0.72rem" }}>
                  Approved narrative evidence: {evidenceCount} linked project records
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
