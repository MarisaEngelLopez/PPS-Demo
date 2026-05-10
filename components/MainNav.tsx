export function MainNav() {
  return (
    <nav style={{ marginBottom: "2rem", display: "flex", gap: "1rem" }}>
      <a href="/">Home</a>

      {/* Core modules */}
      <a href="/projects">Projects</a>
      <a href="/time-tracking">Time Tracking</a>

      {/* Admin entry */}
      <a href="/admin">Admin</a>
    </nav>
  );
}