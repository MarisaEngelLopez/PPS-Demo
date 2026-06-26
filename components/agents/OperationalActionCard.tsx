"use client";

import type { CSSProperties, ReactNode } from "react";
import { sectionPanelStyle } from "@/components/ui/layoutStyles";

type OperationalActionCardProps = {
  entityType: ReactNode;
  title: ReactNode;
  project?: ReactNode;
  description?: ReactNode;
  details?: { label: ReactNode; value: ReactNode }[];
  children?: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
};

const mutedTextStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "0.78rem",
  lineHeight: 1.35,
};

export function OperationalActionCard({
  entityType,
  title,
  project,
  description,
  details = [],
  children,
  actions,
  style,
}: OperationalActionCardProps) {
  return (
    <article
      style={{
        ...sectionPanelStyle,
        display: "grid",
        gap: "0.65rem",
        borderLeft: "4px solid #2563eb",
        ...style,
      }}
    >
      <div style={{ display: "grid", gap: "0.2rem" }}>
        <div
          style={{
            color: "#1d4ed8",
            fontSize: "0.7rem",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {entityType}
        </div>
        <div style={{ color: "#0f172a", fontWeight: 800, lineHeight: 1.25 }}>
          {title}
        </div>
        {project && <div style={mutedTextStyle}>{project}</div>}
        {description && <div style={{ color: "#334155", fontSize: "0.84rem" }}>{description}</div>}
      </div>

      {details.length > 0 && (
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.45rem 0.75rem",
            margin: 0,
          }}
        >
          {details.map((detail, index) => (
            <div key={index}>
              <dt style={{ ...mutedTextStyle, fontWeight: 700 }}>{detail.label}</dt>
              <dd style={{ margin: 0, color: "#111827", fontWeight: 600 }}>
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {children}

      {actions && (
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          {actions}
        </div>
      )}
    </article>
  );
}
