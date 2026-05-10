import Link from "next/link";
import { MainNav } from "@/components/MainNav";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  background: "white",
  textDecoration: "none",
  color: "inherit",
};

const titleStyle = {
  fontWeight: 600,
  fontSize: 16,
  marginBottom: 4,
};

const descStyle = {
  fontSize: 13,
  color: "#6b7280",
};

export default function AdminPage() {
  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>Admin</h1>

      {/* STRUCTURE */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          Structure
        </h2>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          <Link href="/admin/project-templates" style={cardStyle}>
            <div style={titleStyle}>Project Templates</div>
            <div style={descStyle}>
              Define reusable workstream structures for faster project setup.
            </div>
          </Link>

          <Link href="/admin/phases" style={cardStyle}>
            <div style={titleStyle}>Phases</div>
            <div style={descStyle}>
              Define the main stages of a project lifecycle.
            </div>
          </Link>

          <Link href="/admin/workstreams" style={cardStyle}>
            <div style={titleStyle}>Workstreams</div>
            <div style={descStyle}>
              Break down delivery areas linked to phases.
            </div>
          </Link>

 <Link href="/admin/event-types" style={cardStyle}>
            <div style={titleStyle}>Events</div>
            <div style={descStyle}>
              Define the main events of your project lifecycle.
            </div>
          </Link>

        </div>
      </section>

      {/* CONFIGURATION */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          Configuration
        </h2>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          <Link href="/admin/task-families" style={cardStyle}>
            <div style={titleStyle}>Task Families</div>
            <div style={descStyle}>
              Group recurring types of work for tracking and reporting.
            </div>
          </Link>

          <Link href="/admin/projectTypes" style={cardStyle}>
            <div style={titleStyle}>Project Types</div>
            <div style={descStyle}>
              Define standard project structures and templates.
            </div>
          </Link>

          <Link href="/admin/statuses" style={cardStyle}>
            <div style={titleStyle}>Project Statuses</div>
            <div style={descStyle}>
              Manage lifecycle states such as Active, On Hold, Completed.
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}