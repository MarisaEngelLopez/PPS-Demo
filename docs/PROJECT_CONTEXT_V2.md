Project Operations System – V2 (Authoritative Context)
1. Tech Stack
Next.js (App Router)
Prisma + SQLite
Server Actions (NO API layer)
Client components only where needed (tables, inputs)
2. Core Architectural Principle (NEW – CRITICAL)
Master Data ≠ Project Data ≠ Transaction Data
Layers:
1. Master Data (Admin)
   - Phases
   - Workstreams
   - Task Families
   - Statuses
   - Project Types

2. Project Configuration
   - ProjectWorkstream
   - Project-level status, dates, activation

3. Transactions
   - TimeEntry

👉 RULE:

NEVER mix these layers
3. Application Structure
Modules
3.1 Projects
/projects
Project list
Project detail page
Editable header
ProjectWorkstreams (assignment layer)
3.2 Time Tracking
/time-tracking
Fast entry table
Linked ONLY to:
Project
ProjectWorkstream (NOT Workstream)
3.3 Admin (Master Data)
/admin
Subpages:
phases
workstreams
task-families
archetypes
statuses
4. Data Model (UPDATED – IMPORTANT)
Master Data
Phase
  → Workstream
Workstream
- id
- name
- phaseId
- sortOrder
- isActive
Project Layer (CRITICAL)
ProjectWorkstream
- id
- projectId
- workstreamId
- statusId
- plannedStartDate
- plannedEndDate
- actualStartDate
- actualEndDate
- isActive

👉 IMPORTANT:

ProjectWorkstream is NOT master data
It is a configuration of a Workstream inside a Project
Transaction Layer
TimeEntry
- projectId
- projectWorkstreamId   ✅ (NOT workstreamId)

👉 RULE:

Time tracking MUST NEVER use Workstream directly
5. Master Data Pattern (REFERENCE MODEL)
Workstreams (Authoritative Pattern)
Creation
Admin → Workstreams
Create once
Reusable everywhere
Usage
Project → selects existing Workstreams
→ creates ProjectWorkstream
NEVER:
❌ Create Workstreams inside project pages
❌ Duplicate workstreams per project
6. UI Pattern (CRITICAL – DO NOT BREAK)

All tables follow:

- Table layout
- Inline create row
- Row-level actions
- No modals
Table Actions

Each row supports:

✔ Toggle Active
✔ Delete (if safe)
✔ Update (via row-level action)
7. Forms & Server Actions (HARD LESSONS)
❌ What broke before
- Forms inside tables → unstable
- Inputs not inside forms → data lost
- Multiple nested forms → hydration errors
- Mixing JSX + functions → build errors
✅ Correct Pattern (FINAL)
For row editing (like dates)
✔ Use React state for inputs
✔ Use hidden inputs inside form
✔ One form per action
Example Pattern
const [plannedStartDate, setPlannedStartDate] = useState(...)

<form action={update...}>
  <input type="hidden" name="plannedStartDate" value={plannedStartDate} />
</form>
RULE
Inputs shown to user ≠ inputs sent to server
8. Date Strategy (NEW)
At Project level
plannedStartDate
plannedEndDate
actualStartDate
actualEndDate
At ProjectWorkstream level

Same structure.

Purpose
✔ Enable timeline
✔ Enable variance tracking
✔ Enable reporting
9. Time Tracking Rules (UPDATED)
MUST
✔ Filter ProjectWorkstreams by selected Project
✔ Only show ACTIVE ProjectWorkstreams
✔ Persist last values for speed
MUST NOT
❌ Use Workstream directly
❌ Show all workstreams globally
10. UX Principles
✔ Speed over perfection
✔ Minimal clicks
✔ Excel-like interaction
✔ No blocking flows
11. Anti-Patterns (DO NOT REPEAT)
❌ Mixing master data with project data
❌ Recreating workstreams per project
❌ Complex forms
❌ Nested forms
❌ Detached inputs
❌ Overengineering early
12. System Strengths (UPDATED)
✔ Clean data separation
✔ Scalable model
✔ Fast UX
✔ Extensible reporting base
✔ Real PMO logic (not generic CRUD)
13. Next Step (Aligned with your profile)
Timeline / Gantt View
Project → Workstreams → Dates

Visual:

[Planned]  ───────────
[Actual]   ────────
14. How to Resume in New Chat (UPDATED)

Paste:

I am continuing the Project Operations System.

Read PROJECT_CONTEXT_V2.

IMPORTANT:
- Respect separation: Master Data vs ProjectWorkstream vs TimeEntry
- Respect table + inline pattern
- Respect form handling rules

Continue with: [feature]
🔒 Final note (very important)

This line is your safeguard:

If something feels “quick but unclear”, it will break later.
Follow the patterns.