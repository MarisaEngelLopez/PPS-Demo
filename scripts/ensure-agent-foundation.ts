import "dotenv/config";
import { prisma } from "../lib/prisma";
import type { AgentApprovalMode } from "@prisma/client";

type StatusUsageDefinition = {
  code: string;
  sortOrder: number;
  isDefault?: boolean;
  isOpen?: boolean;
  isClosed?: boolean;
  isInProgress?: boolean;
  isPositive?: boolean;
  isNegative?: boolean;
};

type ScopeDefinition = {
  code: string;
  name: string;
  sortOrder: number;
  statuses: StatusUsageDefinition[];
};

const scopeDefinitions: ScopeDefinition[] = [
  {
    code: "AGENT_INSTRUCTION",
    name: "Agent Instruction",
    sortOrder: 210,
    statuses: [
      { code: "OPEN", sortOrder: 10, isDefault: true, isOpen: true },
      { code: "IN_PROGRESS", sortOrder: 20, isOpen: true, isInProgress: true },
      { code: "CLOSED", sortOrder: 80, isClosed: true },
      { code: "CANCELLED", sortOrder: 90, isClosed: true, isNegative: true },
    ],
  },
  {
    code: "AGENT_SUGGESTION",
    name: "Agent Suggestion",
    sortOrder: 220,
    statuses: [
      { code: "OPEN", sortOrder: 10, isDefault: true, isOpen: true },
      { code: "APPROVED", sortOrder: 70, isClosed: true, isPositive: true },
      { code: "REJECTED", sortOrder: 75, isClosed: true, isNegative: true },
      { code: "CLOSED", sortOrder: 80, isClosed: true },
      { code: "CANCELLED", sortOrder: 90, isClosed: true, isNegative: true },
    ],
  },
  {
    code: "AGENT_APPROVAL",
    name: "Agent Approval",
    sortOrder: 230,
    statuses: [
      { code: "OPEN", sortOrder: 10, isDefault: true, isOpen: true },
      { code: "APPROVED", sortOrder: 70, isClosed: true, isPositive: true },
      { code: "REJECTED", sortOrder: 75, isClosed: true, isNegative: true },
      { code: "CLOSED", sortOrder: 80, isClosed: true },
      { code: "CANCELLED", sortOrder: 90, isClosed: true, isNegative: true },
    ],
  },
  {
    code: "WORK_SESSION",
    name: "Work Session",
    sortOrder: 240,
    statuses: [
      {
        code: "IN_PROGRESS",
        sortOrder: 10,
        isDefault: true,
        isOpen: true,
        isInProgress: true,
      },
      { code: "ON_HOLD", sortOrder: 20, isOpen: true },
      { code: "CLOSED", sortOrder: 80, isClosed: true, isPositive: true },
      { code: "CANCELLED", sortOrder: 90, isClosed: true, isNegative: true },
    ],
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const scopeDefinition of scopeDefinitions) {
      const scope = await tx.statusScope.upsert({
        where: { code: scopeDefinition.code },
        update: {
          name: scopeDefinition.name,
          sortOrder: scopeDefinition.sortOrder,
          isActive: true,
          inheritDefault: false,
        },
        create: {
          code: scopeDefinition.code,
          name: scopeDefinition.name,
          sortOrder: scopeDefinition.sortOrder,
          isActive: true,
          inheritDefault: false,
        },
      });

      for (const statusDefinition of scopeDefinition.statuses) {
        const status = await tx.status.findUnique({
          where: { code: statusDefinition.code },
        });

        if (!status) {
          throw new Error(`Missing status ${statusDefinition.code}.`);
        }

        if (statusDefinition.isDefault) {
          await tx.statusUsage.updateMany({
            where: { scopeId: scope.id, NOT: { statusId: status.id } },
            data: { isDefault: false },
          });
        }

        await tx.statusUsage.upsert({
          where: {
            statusId_scopeId: {
              statusId: status.id,
              scopeId: scope.id,
            },
          },
          update: {
            sortOrder: statusDefinition.sortOrder,
            isDefault: Boolean(statusDefinition.isDefault),
            isActive: true,
            isOpen: Boolean(statusDefinition.isOpen),
            isClosed: Boolean(statusDefinition.isClosed),
            isInProgress: Boolean(statusDefinition.isInProgress),
            isAttention: false,
            isPositive: Boolean(statusDefinition.isPositive),
            isNegative: Boolean(statusDefinition.isNegative),
          },
          create: {
            statusId: status.id,
            scopeId: scope.id,
            sortOrder: statusDefinition.sortOrder,
            isDefault: Boolean(statusDefinition.isDefault),
            isActive: true,
            isOpen: Boolean(statusDefinition.isOpen),
            isClosed: Boolean(statusDefinition.isClosed),
            isInProgress: Boolean(statusDefinition.isInProgress),
            isAttention: false,
            isPositive: Boolean(statusDefinition.isPositive),
            isNegative: Boolean(statusDefinition.isNegative),
          },
        });
      }
    }

    const timeTrackingAgent = await tx.agentDefinition.upsert({
      where: { agentKey: "TIME_TRACKING" },
      update: {
        name: "Time Tracking Assistant",
        description:
          "One-user assistant for starting, pausing, resuming, finishing, and converting work sessions into approved time entries.",
        sortOrder: 10,
        isSystem: true,
      },
      create: {
        agentKey: "TIME_TRACKING",
        name: "Time Tracking Assistant",
        description:
          "One-user assistant for starting, pausing, resuming, finishing, and converting work sessions into approved time entries.",
        isEnabled: true,
        oneUserMode: true,
        sortOrder: 10,
        isSystem: true,
      },
    });

    const capabilities: Array<{
      capabilityKey: string;
      name: string;
      description: string;
      targetEntity: string;
      approvalMode: AgentApprovalMode;
      isEnabled: boolean;
      isProtected: boolean;
      sortOrder: number;
    }> = [
      {
        capabilityKey: "START_WORK_SESSION",
        name: "Start work session",
        description: "Start a timer against an active project workstream.",
        targetEntity: "WORK_SESSION",
        approvalMode: "MANUAL_APPROVAL",
        isEnabled: true,
        isProtected: false,
        sortOrder: 10,
      },
      {
        capabilityKey: "PAUSE_WORK_SESSION",
        name: "Pause work session",
        description: "Pause the current active work session.",
        targetEntity: "WORK_SESSION",
        approvalMode: "MANUAL_APPROVAL",
        isEnabled: true,
        isProtected: false,
        sortOrder: 30,
      },
      {
        capabilityKey: "UPDATE_WORK_SESSION_NOTES",
        name: "Update work session notes",
        description: "Add or adjust notes while a work session is still active or paused.",
        targetEntity: "WORK_SESSION",
        approvalMode: "MANUAL_APPROVAL",
        isEnabled: true,
        isProtected: false,
        sortOrder: 20,
      },
      {
        capabilityKey: "RESUME_WORK_SESSION",
        name: "Resume work session",
        description: "Resume a paused work session.",
        targetEntity: "WORK_SESSION",
        approvalMode: "MANUAL_APPROVAL",
        isEnabled: true,
        isProtected: false,
        sortOrder: 40,
      },
      {
        capabilityKey: "FINISH_WORK_SESSION",
        name: "Finish work session",
        description: "Finish a work session and calculate active rounded duration.",
        targetEntity: "WORK_SESSION",
        approvalMode: "MANUAL_APPROVAL",
        isEnabled: true,
        isProtected: false,
        sortOrder: 50,
      },
      {
        capabilityKey: "CREATE_TIME_ENTRY_SUGGESTION",
        name: "Create time-entry suggestion",
        description: "Prepare a suggested official time entry from a completed work session.",
        targetEntity: "TIME_ENTRY",
        approvalMode: "MANUAL_APPROVAL",
        isEnabled: true,
        isProtected: false,
        sortOrder: 60,
      },
      {
        capabilityKey: "CREATE_TIME_ENTRY",
        name: "Create official time entry",
        description:
          "Create the final TimeEntry record. Disabled for auto-apply in the initial one-user assistant.",
        targetEntity: "TIME_ENTRY",
        approvalMode: "AUTO_APPLY_DISABLED",
        isEnabled: false,
        isProtected: true,
        sortOrder: 70,
      },
    ];

    for (const capability of capabilities) {
      const updateData = capability.isProtected
        ? {
            name: capability.name,
            description: capability.description,
            targetEntity: capability.targetEntity,
            approvalMode: capability.approvalMode,
            isEnabled: capability.isEnabled,
            isProtected: capability.isProtected,
            sortOrder: capability.sortOrder,
            isSystem: true,
          }
        : {
            name: capability.name,
            description: capability.description,
            targetEntity: capability.targetEntity,
            isProtected: capability.isProtected,
            sortOrder: capability.sortOrder,
            isSystem: true,
          };

      await tx.agentCapability.upsert({
        where: {
          agentId_capabilityKey: {
            agentId: timeTrackingAgent.id,
            capabilityKey: capability.capabilityKey,
          },
        },
        update: updateData,
        create: {
          agentId: timeTrackingAgent.id,
          ...capability,
          isSystem: true,
        },
      });
    }

    const sourceConfigs = [
      {
        sourceType: "TEXT" as const,
        isEnabled: true,
        transcriptReviewRequired: false,
        sortOrder: 10,
      },
      {
        sourceType: "VOICE" as const,
        isEnabled: false,
        transcriptReviewRequired: true,
        sortOrder: 20,
      },
    ];

    for (const sourceConfig of sourceConfigs) {
      await tx.agentSourceConfig.upsert({
        where: {
          agentId_sourceType: {
            agentId: timeTrackingAgent.id,
            sourceType: sourceConfig.sourceType,
          },
        },
        update: {
          sortOrder: sourceConfig.sortOrder,
          isSystem: true,
        },
        create: {
          agentId: timeTrackingAgent.id,
          ...sourceConfig,
          isSystem: true,
        },
      });
    }

    await tx.agentInstructionTemplate.upsert({
      where: {
        agentId_templateKey: {
          agentId: timeTrackingAgent.id,
          templateKey: "START_WORK",
        },
      },
      update: {
        sourceType: "TEXT",
        sortOrder: 10,
        isSystem: true,
      },
      create: {
        agentId: timeTrackingAgent.id,
        templateKey: "START_WORK",
        label: "I am starting work",
        instruction: "I am starting work",
        sourceType: "TEXT",
        isDefault: true,
        isEnabled: true,
        sortOrder: 10,
        isSystem: true,
      },
    });

    const rules = [
      {
        ruleKey: "ROUNDING_INCREMENT_MINUTES",
        name: "Rounding increment",
        description: "Minutes used to round completed work sessions.",
        value: "15",
        valueType: "NUMBER",
        isEditable: true,
        isProtected: false,
        sortOrder: 10,
      },
      {
        ruleKey: "ROUNDING_MODE",
        name: "Rounding mode",
        description: "How active duration is rounded before creating a time-entry suggestion.",
        value: "NEAREST",
        valueType: "STRING",
        isEditable: true,
        isProtected: false,
        sortOrder: 20,
      },
      {
        ruleKey: "ONE_ACTIVE_SESSION_PER_USER",
        name: "One active session per user",
        description: "Prevents overlapping active or paused sessions.",
        value: "true",
        valueType: "BOOLEAN",
        isEditable: true,
        isProtected: false,
        sortOrder: 30,
      },
      {
        ruleKey: "ALLOW_CROSS_DAY_SESSIONS",
        name: "Allow cross-day sessions",
        description: "If false, sessions crossing midnight require explicit handling.",
        value: "false",
        valueType: "BOOLEAN",
        isEditable: true,
        isProtected: false,
        sortOrder: 40,
      },
      {
        ruleKey: "AUTO_APPLY_ALLOWED",
        name: "Auto-apply allowed",
        description: "Protected safety rule. Initial assistant cannot auto-apply final business records.",
        value: "false",
        valueType: "BOOLEAN",
        isEditable: false,
        isProtected: true,
        sortOrder: 50,
      },
      {
        ruleKey: "ACTION_LOGGING_REQUIRED",
        name: "Action logging required",
        description: "Protected safety rule. Agent activity must be logged.",
        value: "true",
        valueType: "BOOLEAN",
        isEditable: false,
        isProtected: true,
        sortOrder: 60,
      },
      {
        ruleKey: "NO_DELETE_ACTIONS",
        name: "No delete actions",
        description: "Protected safety rule. Agents may not delete records.",
        value: "true",
        valueType: "BOOLEAN",
        isEditable: false,
        isProtected: true,
        sortOrder: 70,
      },
      {
        ruleKey: "NO_APPROVED_REPORT_CHANGES",
        name: "No approved report changes",
        description: "Protected safety rule. Agents may not change approved executive reports.",
        value: "true",
        valueType: "BOOLEAN",
        isEditable: false,
        isProtected: true,
        sortOrder: 80,
      },
    ];

    for (const rule of rules) {
      const existing = await tx.agentRule.findFirst({
        where: {
          agentId: timeTrackingAgent.id,
          capabilityId: null,
          ruleKey: rule.ruleKey,
        },
      });

      if (existing) {
        const updateData = rule.isEditable
          ? {
              name: rule.name,
              description: rule.description,
              valueType: rule.valueType,
              isEditable: rule.isEditable,
              isProtected: rule.isProtected,
              sortOrder: rule.sortOrder,
            }
          : rule;

        await tx.agentRule.update({
          where: { id: existing.id },
          data: updateData,
        });
      } else {
        await tx.agentRule.create({
          data: {
            agentId: timeTrackingAgent.id,
            capabilityId: null,
            ...rule,
          },
        });
      }
    }
  });

  console.log("Agent foundation status scopes, usages, and behavior configuration are ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
