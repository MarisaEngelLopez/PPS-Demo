import type { Prisma } from "@prisma/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export const executiveReportProjectInclude = {
  projectType: true,
  governedStatus: true,
  projectManagerContact: true,
  issuerOrganization: true,
  clientOrganization: true,
  deliveryOrganization: true,
  sponsorContact: true,
  reportingPacks: {
    where: { isActive: true },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
  },
  projectDecisions: {
    where: {
      isActive: true,
      visibility: {
        in: ["EXECUTIVE", "BOTH"],
      },
    },
    include: {
      statusRef: {
        include: {
          usages: {
            include: { scope: true },
          },
        },
      },
      projectWorkstream: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
      },
    },
    orderBy: [{ escalated: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  },
  projectWorkstreams: {
    include: {
      workstream: {
        include: {
          phase: true,
        },
      },
      governedStatus: true,
      projectTasks: {
        where: {
          isActive: true,
          parentTaskId: null,
        },
        orderBy: [
          { sortOrder: "asc" },
          { plannedStartDate: "asc" },
          { name: "asc" },
        ],
        include: {
          subtasks: {
            where: { isActive: true },
            orderBy: [
              { sortOrder: "asc" },
              { plannedStartDate: "asc" },
              { name: "asc" },
            ],
          },
        },
      },
    },
    orderBy: {
      workstream: {
        sortOrder: "asc",
      },
    },
  },
  events: {
    include: {
      eventType: true,
      linkedProjectWorkstream: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
      },
    },
    orderBy: {
      eventDate: "asc",
    },
  },
  projectRisks: {
    include: {
      category: true,
      status: {
        include: {
          usages: {
            include: { scope: true },
          },
        },
      },
      owner: true,
      projectWorkstream: {
        include: {
          workstream: {
            include: {
              phase: true,
            },
          },
        },
      },
      riskActions: {
        include: {
          owner: true,
          statusRef: {
            include: {
              usages: {
                include: { scope: true },
              },
            },
          },
          evidenceRecords: {
            include: {
              evidenceType: true,
            },
            orderBy: [{ evidenceDate: "desc" }, { createdAt: "desc" }],
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      },
      assessments: {
        include: {
          assessedByUser: true,
        },
        orderBy: [{ assessmentDate: "desc" }, { createdAt: "desc" }],
      },
      reviews: {
        include: {
          reviewType: true,
          reviewOutcome: true,
          reviewedByUser: true,
          residualAssessment: true,
          decisionLinks: {
            include: {
              projectDecision: {
                include: {
                  statusRef: {
                    include: {
                      usages: {
                        include: { scope: true },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ exposure: "desc" }, { updatedAt: "desc" }],
  },
} satisfies Prisma.ProjectInclude;

export type ExecutiveReportProject = Prisma.ProjectGetPayload<{
  include: typeof executiveReportProjectInclude;
}>;

export type ExecutiveReportReportingPack =
  ExecutiveReportProject["reportingPacks"][number];
export type ExecutiveReportRisk = ExecutiveReportProject["projectRisks"][number];
export type ExecutiveReportRiskAction =
  ExecutiveReportRisk["riskActions"][number];
export type ExecutiveReportDecision =
  ExecutiveReportProject["projectDecisions"][number];
export type ExecutiveReportWorkstream =
  ExecutiveReportProject["projectWorkstreams"][number];
export type ExecutiveReportEvent = ExecutiveReportProject["events"][number];

export type ExecutiveReportProjectOption = {
  id: string;
  projectCode: string;
  name: string;
};

export type ExecutiveReportSection = {
  id: string;
  title: string;
  titleKey?: TranslationKey;
  visible: boolean;
};
