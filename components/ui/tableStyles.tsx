export const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
border: "1px solid #e5e7eb",   // ✅ THIS is key
  marginTop: "1rem",
};

export const thStyle: React.CSSProperties = {
  padding: "6px 8px",
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
borderRight: "1px solid #e5e7eb",   // ✅ add this
  fontSize: "0.7rem",
  height: "16px",
  verticalAlign: "middle",
};

export const tdStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderBottom: "1px solid #f1f5f9",
 borderRight: "1px solid #e5e7eb",   // ✅ add this
  fontSize: "0.7rem",
  height: "16px",
  verticalAlign: "middle",
};