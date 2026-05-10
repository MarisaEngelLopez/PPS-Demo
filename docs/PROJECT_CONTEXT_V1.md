# Project Operations System – Context & Design Decisions

## 1. Tech Stack
- Next.js (App Router)
- Prisma + SQLite
- Server Actions
- No API layer (direct server actions)

---

## 2. Application Structure

### Modules

1. Projects
   - /projects
   - Project list + detail page
   - Editable project header
   - Project Workstreams

2. Time Tracking
   - /time-tracking
   - Fast entry table
   - Inline row creation
   - Persistent inputs (date, project, workstream)

3. Admin (Master Data)
   - /admin
   - Subpages:
     - /admin/phases
     - /admin/workstreams
     - /admin/task-families
     - /admin/archetypes (Project Types)
     - /admin/statuses

---

## 3. UI Pattern (CRITICAL – reuse everywhere)

All admin and operational tables follow:

- Table layout
- Inline creation row OR expandable create row
- Server actions for:
  - create
  - toggle active
  - delete
- No modals
- No complex forms

---

## 4. Data Model (Current)

### Core

Project
- id
- name
- statusId
- sponsorId
- startDate
- etc.

Phase
- id
- name
- sortOrder
- isActive

Workstream
- id
- name
- phaseId
- sortOrder
- isActive

ProjectWorkstream
- id
- projectId
- workstreamId
- statusId
- startDate
- endDate
- notes

TimeEntry
- id
- projectId
- projectWorkstreamId
- date
- hours
- notes
- createdAt

---

## 5. Key Design Decisions

### A. Separation of concerns

- Workstreams = delivery structure
- Task Families = classification (NOT yet used in time tracking)

### B. Time Tracking Philosophy

Optimized for speed:
- Inline entry
- Persistent values after save:
  - date
  - project
  - workstream
- No forced categorization beyond what is needed

### C. Task Families

- Defined in Admin
- NOT yet used in time tracking
- Will be used later for reporting classification

### D. Navigation

Top level:
- Projects
- Time Tracking
- Admin

Admin is a dashboard, not a flat menu.

---

## 6. Current UX Strengths

- Excel-like fast entry
- Minimal clicks
- Structured data
- Clean separation between configuration and operations

---

## 7. Known Decisions (DO NOT BREAK)

- Keep inline table pattern
- Avoid modals
- Avoid over-modeling early
- Keep time tracking fast above all

---

## 8. Next Planned Step

### Reporting (Priority)

Initial reports:
- Hours by Project
- Hours by Workstream
- Last 7 days activity

Later:
- Task Family breakdown
- Weekly view
- Burn vs plan

---

## 9. Folder Structure (Important)

app/
  projects/
  time-tracking/
  admin/
    phases/
    workstreams/
    task-families/
    archetypes/
    statuses/

components/
  admin/
  projects/
  ui/

---

## 10. How to Resume in New Chat

Paste:

"I am continuing the Project Operations System.
Read PROJECT_CONTEXT.md and continue with [feature]."

---
