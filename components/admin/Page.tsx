import Link from "next/link";

export default function AdminPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Admin</h1>

      <h2>Structure</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        <Link href="/admin/project-templates">Project Templates</Link>
        <Link href="/admin/phases">Phases</Link>
        <Link href="/admin/workstreams">Workstreams</Link>
<Link href="/admin/event-types">Event Types</Link>
      </div>

      <h2 style={{ marginTop: 24 }}>Configuration</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        <Link href="/admin/task-families">Task Families</Link>
        <Link href="/admin/projectTypes">Project Types</Link>
        <Link href="/admin/statuses">Project Statuses</Link>
      </div>
    </div>
  );
}