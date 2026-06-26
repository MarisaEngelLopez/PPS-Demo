import type { PrismaClient } from "@prisma/client";
import { projectExecutionError } from "./projectExecutionRules";
import type {
  ParsedProjectTaskInput,
  ProjectExecutionActionResult,
} from "./projectExecutionTypes";

type GuardResult<T> =
  | { ok: true; value: T }
  | { ok: false; result: ProjectExecutionActionResult };

type ProjectExecutionDb = Pick<
  PrismaClient,
  | "workstream"
  | "projectWorkstream"
  | "projectTask"
  | "projectEvent"
  | "eventType"
  | "timeEntry"
>;

export async function getActiveWorkstreamForProjectAdd(
  db: ProjectExecutionDb,
  workstreamId: string
) {
  const workstream = await db.workstream.findUnique({
    where: { id: workstreamId },
  });

  if (!workstream) {
    return {
      ok: false,
      result: projectExecutionError(
        "Project workstream not added: workstream no longer exists."
      ),
    } satisfies GuardResult<typeof workstream>;
  }

  if (!workstream.isActive) {
    return {
      ok: false,
      result: projectExecutionError(
        "Project workstream not added: workstream is inactive."
      ),
    } satisfies GuardResult<typeof workstream>;
  }

  return { ok: true, value: workstream } satisfies GuardResult<typeof workstream>;
}

export async function ensureProjectWorkstreamIsNotAssigned(
  db: ProjectExecutionDb,
  projectId: string,
  workstreamId: string
) {
  const existing = await db.projectWorkstream.findFirst({
    where: {
      projectId,
      workstreamId,
    },
  });

  if (existing) {
    return projectExecutionError(
      "Project workstream not added: already exists in this project."
    );
  }

  return null;
}

export async function getProjectWorkstreamInProject(
  db: ProjectExecutionDb,
  projectId: string,
  projectWorkstreamId: string,
  messagePrefix: "Task" | "Subtask" | "Milestone"
) {
  const projectWorkstream = await db.projectWorkstream.findFirst({
    where: {
      id: projectWorkstreamId,
      projectId,
      isActive: messagePrefix === "Milestone" ? undefined : true,
    },
  });

  if (!projectWorkstream) {
    const message =
      messagePrefix === "Milestone"
        ? "Milestone not saved: linked workstream does not belong to this project."
        : `${messagePrefix} not added: workstream is not active in this project.`;

    return {
      ok: false,
      result: projectExecutionError(message),
    } satisfies GuardResult<typeof projectWorkstream>;
  }

  return {
    ok: true,
    value: projectWorkstream,
  } satisfies GuardResult<typeof projectWorkstream>;
}

export async function validateLinkedProjectWorkstream(
  db: ProjectExecutionDb,
  projectId: string,
  linkedProjectWorkstreamId: string | null
) {
  if (!linkedProjectWorkstreamId) return null;

  const result = await getProjectWorkstreamInProject(
    db,
    projectId,
    linkedProjectWorkstreamId,
    "Milestone"
  );

  return result.ok ? null : result.result;
}

export async function getActiveEventTypeForProjectEvent(
  db: ProjectExecutionDb,
  eventTypeId: string
) {
  const eventType = await db.eventType.findUnique({
    where: { id: eventTypeId },
  });

  if (!eventType) {
    return {
      ok: false,
      result: projectExecutionError(
        "Milestone not added: event type no longer exists."
      ),
    } satisfies GuardResult<typeof eventType>;
  }

  if (!eventType.isActive) {
    return {
      ok: false,
      result: projectExecutionError("Milestone not added: event type is inactive."),
    } satisfies GuardResult<typeof eventType>;
  }

  return { ok: true, value: eventType } satisfies GuardResult<typeof eventType>;
}

export async function getNextProjectTaskSortOrder(
  db: ProjectExecutionDb,
  projectWorkstreamId: string,
  parentTaskId: string | null
) {
  const maxSort = await db.projectTask.aggregate({
    where: {
      projectWorkstreamId,
      parentTaskId,
      isActive: true,
    },
    _max: {
      sortOrder: true,
    },
  });

  return (maxSort._max.sortOrder ?? -1) + 1;
}

export async function validateSubtaskParent(
  db: ProjectExecutionDb,
  input: ParsedProjectTaskInput
) {
  const parentTask = await db.projectTask.findUnique({
    where: { id: input.parentTaskId },
  });

  if (!parentTask) {
    return projectExecutionError("Subtask not added: parent task not found.");
  }

  if (parentTask.projectWorkstreamId !== input.projectWorkstreamId) {
    return projectExecutionError(
      "Subtask not added: parent task belongs to another workstream."
    );
  }

  if (parentTask.parentTaskId) {
    return projectExecutionError("Subtask not added: subtasks cannot have children.");
  }

  return null;
}

export async function validateProjectTaskForUpdate(
  db: ProjectExecutionDb,
  taskId: string
) {
  const existingTask = await db.projectTask.findUnique({
    where: { id: taskId },
    include: {
      subtasks: true,
    },
  });

  if (!existingTask) {
    return projectExecutionError("Task not updated: task not found.");
  }

  if (existingTask.parentTaskId && existingTask.subtasks.length > 0) {
    return projectExecutionError("Task not updated: invalid task hierarchy.");
  }

  return null;
}

export async function getProjectTaskForDelete(
  db: ProjectExecutionDb,
  taskId: string
) {
  const task = await db.projectTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return {
      ok: false,
      result: projectExecutionError("Task not deleted: task not found."),
    } satisfies GuardResult<typeof task>;
  }

  return { ok: true, value: task } satisfies GuardResult<typeof task>;
}

export async function validateProjectWorkstreamCanDelete(
  db: ProjectExecutionDb,
  projectWorkstreamId: string
) {
  const timeEntryCount = await db.timeEntry.count({
    where: {
      projectWorkstreamId,
    },
  });

  if (timeEntryCount > 0) {
    return projectExecutionError(
      "Project workstream not deleted: it has time entries."
    );
  }

  return null;
}
