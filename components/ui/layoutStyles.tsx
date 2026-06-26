export const pageStyle = {
  padding: "2rem",
  fontFamily: "Arial, sans-serif",
  fontSize: "14px",
};

export const h1Style = {
  fontSize: "24px",
  marginBottom: "1rem",
  fontWeight: "bold",
};

export const h2Style = {
  fontSize: "18px",
  marginTop: "2rem",
};

export const formStyle = {
  display: "grid",
  gap: "1rem",
  maxWidth: "600px",
};

export const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: "0.4rem",
  padding: "0.35rem 0.45rem",
  textAlign: "left" as const,
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  boxSizing: "border-box" as const,
  minHeight: "34px",
};

export const compactInputStyle = {
  ...inputStyle,
  fontSize: "0.82rem",
  padding: "0.2rem 0.3rem",
  minHeight: "24px",
  lineHeight: 1.1,
};

export const filterInputStyle = {
  ...compactInputStyle,
  fontSize: "0.75rem",
  minHeight: "22px",
  padding: "0.15rem 0.25rem",
};

export const buttonStyle = {
  padding: "0.4rem 0.5rem",
  borderRadius: "8px",
  border: "1px solid #ccc",
  cursor: "pointer",
};

export const addActionButtonStyle = {
  ...buttonStyle,
  display: "inline-flex",
  alignItems: "center",
  gap: "0.55rem",
  padding: "0.48rem 0.75rem",
  borderRadius: "10px",
  background: "#ffffff",
  color: "#111827",
  fontSize: "0.92rem",
  fontWeight: 500,
  lineHeight: 1.1,
};

export const addActionPlusStyle = {
  color: "#7c3aed",
  fontSize: "1.45rem",
  fontWeight: 800,
  lineHeight: 0.8,
  textShadow: "0 1px 0 #c4b5fd",
};

export const tableButtonStyle = {
  padding: "0.2rem 0.45rem",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "0.7rem",
  lineHeight: 1.1,
};

export const sectionPanelStyle = {
  padding: "0.75rem",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
};

export const highlightedSectionPanelStyle = {
  ...sectionPanelStyle,
  background: "#eff6ff",
  border: "1px solid #dbeafe",
};

export const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.5rem",
};

export const sectionTitleStyle = {
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "#334155",
  lineHeight: 1.2,
};

export const sectionActionButtonStyle = {
  ...tableButtonStyle,
  padding: "0.35rem 0.65rem",
  fontSize: "0.8rem",
  fontWeight: 500,
  whiteSpace: "nowrap",
};

export const pageToggleButtonStyle = {
  ...sectionActionButtonStyle,
  padding: "0.55rem 0.8rem",
  fontSize: "0.9rem",
  borderRadius: "8px",
};

export const labelStyle = {
  display: "block",
  fontWeight: 700,
  fontSize: "0.7rem",
  color: "#111827",
  lineHeight: 1.2,
};

export const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 120px 1fr",
  gap: "0.35rem 0.6rem",
  alignItems: "center",
  marginBottom: "1rem",
};

export const tableActionGroupStyle = {
  display: "flex",
  gap: "0.35rem",
  alignItems: "center",
  flexWrap: "wrap" as const,
};

export const adminCardGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
};

export const adminCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  background: "white",
  textDecoration: "none",
  color: "inherit",
};

export const adminCardTitleStyle = {
  fontWeight: 600,
  fontSize: 16,
  marginBottom: 4,
};

export const adminCardDescriptionStyle = {
  fontSize: 13,
  color: "#6b7280",
};
