"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export function ProjectWorkspaceView({
  briefing,
  management,
  narrativeManagement,
}: {
  briefing: ReactNode;
  management: ReactNode;
  narrativeManagement: ReactNode;
}) {
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const [view, setView] = useState<"BRIEFING" | "MANAGEMENT" | "NARRATIVE">(
    requestedView === "narrative"
      ? "NARRATIVE"
      : requestedView === "briefing"
        ? "BRIEFING"
        : "MANAGEMENT"
  );

  const tabStyle = (active: boolean): React.CSSProperties => ({
    border: 0,
    borderBottom: active ? "3px solid #1d4ed8" : "3px solid transparent",
    background: "transparent",
    color: active ? "#0f172a" : "#64748b",
    cursor: "pointer",
    fontWeight: active ? 700 : 600,
    padding: "0.65rem 0.85rem",
  });

  return (
    <>
      <nav
        aria-label="Project view"
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "1px solid #cbd5e1",
          marginBottom: "1rem",
        }}
      >
        <button
          type="button"
          onClick={() => setView("BRIEFING")}
          style={tabStyle(view === "BRIEFING")}
        >
          Executive Briefing
        </button>
        <button
          type="button"
          onClick={() => setView("MANAGEMENT")}
          style={tabStyle(view === "MANAGEMENT")}
        >
          Manage Project
        </button>
        <button
          type="button"
          onClick={() => setView("NARRATIVE")}
          style={tabStyle(view === "NARRATIVE")}
        >
          Manage Project Narrative
        </button>
      </nav>

      {view === "BRIEFING"
        ? briefing
        : view === "MANAGEMENT"
          ? management
          : narrativeManagement}
    </>
  );
}
