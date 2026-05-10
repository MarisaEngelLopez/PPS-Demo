# Data Model – Project Operations System

## Core Entities

### Project
- id
- projectCode (unique)
- name
- projectTypeId
- statusId
- projectManagerId
- sponsorId
- startDate
- plannedStartDate
- plannedEndDate
- actualStartDate
- actualEndDate
- reportingCadence
- healthStatus
- isActive

---

### ProjectWorkstream
- id
- projectId
- workstreamId
- plannedStartDate
- plannedEndDate
- actualStartDate
- actualEndDate
- isActive

---

### Workstream
- id
- name
- phaseId
- sortOrder
- isActive

---

### Phase
- id
- name
- sortOrder
- isActive

---

### ProjectTemplate
- id
- name

---

### TemplateWorkstream
- id
- templateId
- workstreamId
- sortOrder
- plannedOffsetDays
- durationDays

---

## Relationships

- Project → ProjectWorkstreams (1:N)
- Workstream → Phase (N:1)
- Template → TemplateWorkstreams (1:N)
- TemplateWorkstream → Workstream (N:1)

---

## Key Logic

### Template Application
plannedStart = project.startDate + plannedOffsetDays  
plannedEnd = plannedStart + durationDays  

### Delay
Only for open workstreams  
delay = working days between plannedEnd and today  

### Phase Roll-up
- completed → all workstreams completed  
- in progress → any started  
- delay → max delay of workstreams