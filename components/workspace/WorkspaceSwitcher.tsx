import { getAuthorizationContext, hasRole } from "@/lib/authorization";
import {
  getSelectableWorkspaces,
  getSelectedWorkspace,
} from "@/lib/workspaceContext";
import { switchWorkspace } from "@/app/workspace-actions";

export async function WorkspaceSwitcher() {
  const context = await getAuthorizationContext();

  if (!context || !hasRole(context, "OWNER_ADMIN")) return null;

  const [selectedWorkspace, workspaces] = await Promise.all([
    getSelectedWorkspace(),
    getSelectableWorkspaces(),
  ]);

  return (
    <div
      style={{
        alignItems: "center",
        background: selectedWorkspace.code === "DEMO" ? "#7f1d1d" : "#eff6ff",
        borderBottom:
          selectedWorkspace.code === "DEMO"
            ? "2px solid #fecaca"
            : "1px solid #bfdbfe",
        color: selectedWorkspace.code === "DEMO" ? "#fff7ed" : "#1e3a8a",
        display: "flex",
        gap: "0.75rem",
        justifyContent: "center",
        padding: "0.45rem 1rem",
      }}
    >
      <strong style={{ fontSize: "0.82rem" }}>Workspace</strong>
      <form action={switchWorkspace} style={{ margin: 0 }}>
        <input name="nextPath" type="hidden" value="/" />
        <select
          aria-label="Selected workspace"
          name="workspaceCode"
          defaultValue={selectedWorkspace.code}
          style={{
            backgroundColor:
              selectedWorkspace.code === "DEMO" ? "#450a0a" : "#ffffff",
            border: "1px solid rgba(255,255,255,0.45)",
            borderRadius: 8,
            color: selectedWorkspace.code === "DEMO" ? "#ffffff" : "#0f172a",
            colorScheme: selectedWorkspace.code === "DEMO" ? "dark" : "light",
            fontSize: "0.86rem",
            fontWeight: 700,
            minHeight: 34,
            padding: "0.25rem 0.55rem",
            WebkitTextFillColor:
              selectedWorkspace.code === "DEMO" ? "#ffffff" : "#0f172a",
          }}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.code}>
              {workspace.code} - {workspace.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          style={{
            background: selectedWorkspace.code === "DEMO" ? "#fef2f2" : "#2563eb",
            border: "1px solid rgba(15,23,42,0.18)",
            borderRadius: 8,
            color: selectedWorkspace.code === "DEMO" ? "#7f1d1d" : "#ffffff",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 800,
            marginLeft: "0.45rem",
            minHeight: 34,
            padding: "0.25rem 0.6rem",
          }}
        >
          Apply
        </button>
      </form>
      <span style={{ fontSize: "0.78rem", opacity: 0.86 }}>
        Admin switch controls project and organization views.
      </span>
    </div>
  );
}
