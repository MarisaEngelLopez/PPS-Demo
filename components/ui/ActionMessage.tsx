type ActionResult = {
  ok: boolean;
  message: string;
};

export function ActionMessage({ result }: { result?: ActionResult | null }) {
  if (!result) return null;

  return (
    <div
      style={{
        marginTop: "0.5rem",
        padding: "0.5rem",
        borderRadius: "4px",
        background: result.ok ? "#dcfce7" : "#fee2e2",
        color: result.ok ? "#166534" : "#991b1b",
        fontSize: "0.85rem",
      }}
    >
      {result.message}
    </div>
  );
}
