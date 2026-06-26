"use client";

import { inputStyle, labelStyle } from "@/components/ui/layoutStyles";

type NarrativeFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
};

export function NarrativeField({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
}: NarrativeFieldProps) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={labelStyle}>{label}</div>
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
    </div>
  );
}
