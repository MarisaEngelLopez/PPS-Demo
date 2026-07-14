"use client";

import { inputStyle, labelStyle } from "@/components/ui/layoutStyles";
import { compactInputStyle } from "@/components/ui/layoutStyles";
import { useState } from "react";
import { getNarrativePresentationItems } from "@/lib/domain/reporting/narrativePresentation";

type NarrativeFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  objectKey?: string;
  initialPresentationMode?: "AUTO" | "BULLETS" | "CHECKPOINTS";
};

export function NarrativeField({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
  objectKey,
  initialPresentationMode = "AUTO",
}: NarrativeFieldProps) {
  const defaultMode =
    objectKey === "executive-summary" || objectKey === "conclusion"
      ? "CHECKPOINTS"
      : "BULLETS";
  const [preference, setPreference] = useState(initialPresentationMode);
  const mode = preference === "AUTO" ? defaultMode : preference;
  const items = objectKey
    ? getNarrativePresentationItems(value, mode as "BULLETS" | "CHECKPOINTS")
    : [];

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center" }}>
        <div style={labelStyle}>{label}</div>
        {objectKey && (
          <select
            name={`${name}PresentationMode`}
            value={preference}
            onChange={(event) =>
              setPreference(
                event.target.value as "AUTO" | "BULLETS" | "CHECKPOINTS"
              )
            }
            disabled={disabled}
            style={{ ...compactInputStyle, width: "auto", marginTop: 0 }}
          >
            <option value="AUTO">Auto</option>
            <option value="BULLETS">Bullets</option>
            <option value="CHECKPOINTS">Checkpoints</option>
          </select>
        )}
      </div>
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          minHeight: "72px",
          marginTop: "0.25rem",
          whiteSpace: "pre-wrap",
        }}
      />
      {objectKey && value.trim() && (
        <div style={{ marginTop: "0.35rem", padding: "0.55rem", border: "1px solid #e2e8f0", background: "#ffffff", fontSize: "0.76rem" }}>
          {items.map((item, index) => (
            <div key={`${item.text}-${index}`} style={{ marginBottom: "0.25rem" }}>
              <div>{mode === "CHECKPOINTS" ? "✓" : "•"} {item.text}</div>
              {item.children.map((child, childIndex) => (
                <div key={`${child}-${childIndex}`} style={{ marginLeft: "1.5rem" }}>◦ {child}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
