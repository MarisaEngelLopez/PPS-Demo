"use server";

import { prisma } from "@/lib/prisma";
import { generateNextBusinessCode } from "@/lib/businessCodes/codeGenerator";
import {
  canDeleteRiskByLifecycle,
  getRiskClosureBlockers,
  isExactOpenStatus,
} from "@/lib/domain/risks/riskRules";
import type { Prisma } from "@prisma/client";
import {
  resolveStatusForScopeInput,
  resolveStatusByIdForScope,
} from "@/lib/domain/risks/riskQueries";
import {
  parseRiskActionInput,
  parseRiskActionEvidenceInput,
  parseRiskAssessmentInput,
  parseRiskReviewInput,
  parseRiskInput,
  riskError,
  riskOk,
  validateRiskActionInput,
  validateRiskActionEvidenceInput,
  validateRiskAssessmentInput,
  validateRiskReviewInput,
  validateRiskInput,
} from "@/lib/domain/risks/riskValidation";
import { revalidatePath } from "next/cache";
import { getSelectedWorkspace } from "@/lib/workspaceContext";

type RiskTransaction = Prisma.TransactionClient;

async function getClosedStatusIdsForScope(
  tx: RiskTransaction,
  scopeCode: "RISK" | "RISK_ACTION"
) {
  const usages = await tx.statusUsage.findMany({
    where: {
      isActive: true,
      isClosed: true,
      status: { isActive: true },
      scope: {
        isActive: true,
        code: { in: ["DEFAULT", scopeCode] },
      },
    },
    select: { statusId: true },
  });

  return new Set(usages.map((usage) => usage.statusId));
}

async function getClosedStatusForScope(
  tx: RiskTransaction,
  scopeCode: "RISK" | "RISK_ACTION"
) {
  const usage = await tx.statusUsage.findFirst({
    where: {
      isActive: true,
      isClosed: true,
      status: { isActive: true },
      scope: {
        isActive: true,
        code: { in: ["DEFAULT", scopeCode] },
      },
    },
    include: { status: true },
    orderBy: [
      { scope: { code: "desc" } },
      { sortOrder: "asc" },
      { status: { sortOrder: "asc" } },
    ],
  });

  return usage?.status ?? null;
}

async function closeRiskIfReviewOutcomeRequiresIt(
  tx: RiskTransaction,
  riskId: string,
  reviewOutcomeId: string
) {
  const reviewOutcome = await tx.riskReviewOutcome.findUnique({
    where: { id: reviewOutcomeId },
    select: { isClosed: true },
  });

  if (!reviewOutcome?.isClosed) return;

  const blockers = await getRiskClosureBlockersForRisk(tx, riskId);

  if (blockers.length > 0) {
    throw new Error(`Risk cannot be closed: ${blockers.join("; ")}.`);
  }

  const closedRiskStatus = await getClosedStatusForScope(tx, "RISK");

  if (!closedRiskStatus) {
    throw new Error("Configure one active closed risk status.");
  }

  await tx.projectRisk.update({
    where: { id: riskId },
    data: { statusId: closedRiskStatus.id },
  });
}

async function getRiskClosureBlockersForRisk(
  tx: RiskTransaction,
  riskId: string
) {
  const closedActionStatusIds = await getClosedStatusIdsForScope(
    tx,
    "RISK_ACTION"
  );

  const [actions, residualAssessment, closedReview] = await Promise.all([
    tx.projectRiskAction.findMany({
      where: { projectRiskId: riskId },
      select: { statusId: true },
    }),
    tx.riskAssessment.findFirst({
      where: { riskId, assessmentType: "RESIDUAL" },
      select: { id: true },
    }),
    tx.riskReview.findFirst({
      where: {
        riskId,
        reviewOutcome: {
          isActive: true,
          isClosed: true,
        },
      },
      select: { id: true },
    }),
  ]);

  return getRiskClosureBlockers({
    actionCount: actions.length,
    openActionCount: actions.filter(
      (action) => !closedActionStatusIds.has(action.statusId)
    ).length,
    hasResidualAssessment: Boolean(residualAssessment),
    hasClosedReviewOutcome: Boolean(closedReview),
  });
}

export async function createProjectRisk(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const input = parseRiskInput(formData);
    const inputError = validateRiskInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: {
          id: input.projectId,
          isActive: true,
          workspaceId: selectedWorkspace.id,
        },
        select: { id: true },
      });

      if (!project) throw new Error("Select an active project.");

      if (input.projectWorkstreamId) {
        const workstream = await tx.projectWorkstream.findFirst({
          where: {
            id: input.projectWorkstreamId,
            projectId: input.projectId,
            isActive: true,
            project: { workspaceId: selectedWorkspace.id },
          },
          select: { id: true },
        });

        if (!workstream) {
          throw new Error("Select an active workstream for the chosen project.");
        }
      }

      const category = await tx.riskCategory.findFirst({
        where: { id: input.categoryId, isActive: true },
        select: { id: true },
      });

      if (!category) throw new Error("Select an active risk category.");

      const status = await resolveStatusByIdForScope(tx, "RISK", input.statusId);

      if (!status) throw new Error("Select an active risk status.");

      const riskCode = await generateNextBusinessCode(tx, "RISK");

      await tx.projectRisk.create({
        data: {
          projectId: input.projectId,
          projectWorkstreamId: input.projectWorkstreamId,
          categoryId: input.categoryId,
          statusId: input.statusId,
          ownerId: input.ownerId,
          riskCode,
          title: input.title,
          description: input.description,
          mitigationPlan: input.mitigationPlan,
          contingencyPlan: input.contingencyPlan,
          trigger: input.trigger,
          notes: input.notes,
          probability: input.probability,
          impact: input.impact,
          exposure: input.probability * input.impact,
          identifiedDate: new Date(),
          targetResolutionDate: input.targetResolutionDate,
          escalated: input.escalated,
          isActive: true,
        },
      });
    });

    revalidatePath("/risks");
    return riskOk("Risk created successfully.");
  } catch (error) {
    return riskError(
      `Risk not created: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function updateProjectRisk(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");
    if (!id) return riskError("Risk not updated: missing id.");

    const input = parseRiskInput(formData);
    const inputError = validateRiskInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: {
          id: input.projectId,
          isActive: true,
          workspaceId: selectedWorkspace.id,
        },
        select: { id: true },
      });

      if (!project) throw new Error("Select an active project.");

      if (input.projectWorkstreamId) {
        const workstream = await tx.projectWorkstream.findFirst({
          where: {
            id: input.projectWorkstreamId,
            projectId: input.projectId,
            isActive: true,
            project: { workspaceId: selectedWorkspace.id },
          },
          select: { id: true },
        });

        if (!workstream) {
          throw new Error("Select an active workstream for the chosen project.");
        }
      }

      const category = await tx.riskCategory.findFirst({
        where: { id: input.categoryId, isActive: true },
        select: { id: true },
      });

      if (!category) throw new Error("Select an active risk category.");

      const status = await resolveStatusByIdForScope(tx, "RISK", input.statusId);

      if (!status) throw new Error("Select an active risk status.");

      const existingRisk = await tx.projectRisk.findFirst({
        where: { id, project: { workspaceId: selectedWorkspace.id } },
        select: { id: true },
      });
      if (!existingRisk) {
        throw new Error("Risk not found in the selected workspace.");
      }

      const closedRiskStatusIds = await getClosedStatusIdsForScope(tx, "RISK");
      if (closedRiskStatusIds.has(status.id)) {
        const blockers = await getRiskClosureBlockersForRisk(tx, id);

        if (blockers.length > 0) {
          throw new Error(`Risk cannot be closed: ${blockers.join("; ")}.`);
        }
      }

      await tx.projectRisk.update({
        where: { id },
        data: {
          projectId: input.projectId,
          projectWorkstreamId: input.projectWorkstreamId,
          categoryId: input.categoryId,
          statusId: input.statusId,
          ownerId: input.ownerId,
          title: input.title,
          description: input.description,
          mitigationPlan: input.mitigationPlan,
          contingencyPlan: input.contingencyPlan,
          trigger: input.trigger,
          notes: input.notes,
          probability: input.probability,
          impact: input.impact,
          exposure: input.probability * input.impact,
          targetResolutionDate: input.targetResolutionDate,
          escalated: input.escalated,
        },
      });
    });

    revalidatePath("/risks");
    return riskOk("Risk updated successfully.");
  } catch (error) {
    return riskError(
      `Risk not updated: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function deleteProjectRisk(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) return riskError("Risk not deleted: missing id.");

  const selectedWorkspace = await getSelectedWorkspace();
  const risk = await prisma.projectRisk.findFirst({
    where: { id, project: { workspaceId: selectedWorkspace.id } },
    include: {
      status: true,
      riskActions: { select: { id: true } },
      assessments: { select: { id: true } },
      reviews: { select: { id: true } },
    },
  });

  if (
    !risk ||
    !canDeleteRiskByLifecycle({
      statusCode: risk.status.code,
      actionCount: risk.riskActions.length,
      assessmentCount: risk.assessments.length,
      reviewCount: risk.reviews.length,
    })
  ) {
    return riskError(
      "Risk not deleted: only open risks without actions, assessments or reviews can be deleted."
    );
  }

  await prisma.projectRisk.delete({
    where: { id },
  });

  revalidatePath("/risks");
  return riskOk("Risk deleted successfully.");
}

export async function createProjectRiskAction(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const input = parseRiskActionInput(formData);
    const inputError = validateRiskActionInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const risk = await tx.projectRisk.findFirst({
        where: {
          id: input.projectRiskId,
          isActive: true,
          project: { workspaceId: selectedWorkspace.id },
        },
        select: { id: true },
      });

      if (!risk) throw new Error("Select an active risk.");

      const status = await resolveStatusForScopeInput(
        tx,
        "RISK_ACTION",
        input.statusCode
      );

      if (!status) throw new Error("Configure at least one active risk action status.");

      const actionCode = await generateNextBusinessCode(tx, "RISK_ACTION");

      await tx.projectRiskAction.create({
        data: {
          projectRiskId: input.projectRiskId,
          actionCode,
          description: input.description,
          ownerId: input.ownerId,
          statusId: status.id,
          dueDate: input.dueDate,
          completionCriteria: input.completionCriteria,
          evidence: input.evidence,
        },
      });
    });

    revalidatePath("/risks");
    return riskOk("Risk action created successfully.");
  } catch (error) {
    return riskError(
      `Risk action not created: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function updateProjectRiskAction(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");
    if (!id) return riskError("Risk action not updated: missing id.");

    const input = parseRiskActionInput(formData);
    const descriptionOnlyInput = {
      ...input,
      projectRiskId: "existing-risk",
    };
    const inputError = validateRiskActionInput(descriptionOnlyInput);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const status = await resolveStatusForScopeInput(
        tx,
        "RISK_ACTION",
        input.statusCode
      );

      if (!status) throw new Error("Configure at least one active risk action status.");

      const existingAction = await tx.projectRiskAction.findFirst({
        where: {
          id,
          projectRisk: { project: { workspaceId: selectedWorkspace.id } },
        },
        select: { id: true },
      });
      if (!existingAction) {
        throw new Error("Risk action not found in the selected workspace.");
      }

      await tx.projectRiskAction.update({
        where: { id },
        data: {
          description: input.description,
          ownerId: input.ownerId,
          statusId: status.id,
          dueDate: input.dueDate,
          completionCriteria: input.completionCriteria,
          evidence: input.evidence,
        },
      });
    });

    revalidatePath("/risks");
    return riskOk("Risk action updated successfully.");
  } catch (error) {
    return riskError(
      `Risk action not updated: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function deleteProjectRiskAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) return;

  const selectedWorkspace = await getSelectedWorkspace();
  const action = await prisma.projectRiskAction.findFirst({
    where: {
      id,
      projectRisk: { project: { workspaceId: selectedWorkspace.id } },
    },
    include: { statusRef: true },
  });

  const statusCode = action?.statusRef?.code;

  if (!action || !isExactOpenStatus(statusCode)) return;

  await prisma.projectRiskAction.delete({
    where: { id },
  });

  revalidatePath("/risks");
}

export async function createRiskActionEvidence(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const input = parseRiskActionEvidenceInput(formData);
    const inputError = validateRiskActionEvidenceInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const riskAction = await tx.projectRiskAction.findFirst({
        where: {
          id: input.riskActionId,
          projectRisk: { project: { workspaceId: selectedWorkspace.id } },
        },
        select: { id: true },
      });

      if (!riskAction) throw new Error("Select an existing risk action.");

      const evidenceType = await tx.evidenceType.findFirst({
        where: { id: input.evidenceTypeId, isActive: true },
        select: { id: true },
      });

      if (!evidenceType) throw new Error("Select an active evidence type.");

      await tx.riskActionEvidence.create({
        data: {
          riskActionId: input.riskActionId,
          evidenceTypeId: input.evidenceTypeId,
          title: input.title,
          description: input.description,
          documentReference: input.documentReference,
          url: input.url,
          evidenceDate: input.evidenceDate,
          uploadedBy: input.uploadedBy,
        },
      });
    });

    revalidatePath("/risks");
    return riskOk("Evidence created successfully.");
  } catch (error) {
    return riskError(
      `Evidence not created: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function updateRiskActionEvidence(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");
    if (!id) return riskError("Evidence not updated: missing id.");

    const input = parseRiskActionEvidenceInput(formData);
    const inputError = validateRiskActionEvidenceInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const evidenceRecord = await tx.riskActionEvidence.findFirst({
        where: {
          id,
          riskAction: {
            projectRisk: { project: { workspaceId: selectedWorkspace.id } },
          },
        },
        select: { id: true },
      });

      if (!evidenceRecord) throw new Error("Select an existing evidence record.");

      const evidenceType = await tx.evidenceType.findFirst({
        where: { id: input.evidenceTypeId, isActive: true },
        select: { id: true },
      });

      if (!evidenceType) throw new Error("Select an active evidence type.");

      await tx.riskActionEvidence.update({
        where: { id },
        data: {
          evidenceTypeId: input.evidenceTypeId,
          title: input.title,
          description: input.description,
          documentReference: input.documentReference,
          url: input.url,
          evidenceDate: input.evidenceDate,
          uploadedBy: input.uploadedBy,
        },
      });
    });

    revalidatePath("/risks");
    return riskOk("Evidence updated successfully.");
  } catch (error) {
    return riskError(
      `Evidence not updated: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function deleteRiskActionEvidence(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");
    if (!id) return riskError("Evidence not deleted: missing id.");

    const existing = await prisma.riskActionEvidence.findFirst({
      where: {
        id,
        riskAction: {
          projectRisk: { project: { workspaceId: selectedWorkspace.id } },
        },
      },
      select: { id: true },
    });
    if (!existing) {
      return riskError("Evidence not deleted: record is not in the selected workspace.");
    }

    await prisma.riskActionEvidence.delete({ where: { id } });

    revalidatePath("/risks");
    return riskOk("Evidence deleted successfully.");
  } catch (error) {
    return riskError(
      `Evidence not deleted: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function createRiskAssessment(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const input = parseRiskAssessmentInput(formData);
    const inputError = validateRiskAssessmentInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const risk = await tx.projectRisk.findFirst({
        where: {
          id: input.riskId,
          isActive: true,
          project: { workspaceId: selectedWorkspace.id },
        },
        select: { id: true },
      });

      if (!risk) throw new Error("Select an active risk.");

      if (input.assessedByUserId) {
        const assessor = await tx.user.findUnique({
          where: { id: input.assessedByUserId },
          select: { id: true },
        });

        if (!assessor) throw new Error("Select an existing assessor.");
      }

      await tx.riskAssessment.create({
        data: {
          riskId: input.riskId,
          assessmentType: input.assessmentType,
          probability: input.probability,
          impact: input.impact,
          exposure: input.probability * input.impact,
          comments: input.comments,
          assessedByUserId: input.assessedByUserId,
          assessmentDate: input.assessmentDate ?? new Date(),
        },
      });
    });

    revalidatePath("/risks");
    return riskOk("Assessment created successfully.");
  } catch (error) {
    return riskError(
      `Assessment not created: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function updateRiskAssessment(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");
    if (!id) return riskError("Assessment not updated: missing id.");

    const input = parseRiskAssessmentInput(formData);
    const inputError = validateRiskAssessmentInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const assessment = await tx.riskAssessment.findFirst({
        where: {
          id,
          risk: { project: { workspaceId: selectedWorkspace.id } },
        },
        select: { id: true },
      });

      if (!assessment) throw new Error("Select an existing assessment.");

      if (input.assessedByUserId) {
        const assessor = await tx.user.findUnique({
          where: { id: input.assessedByUserId },
          select: { id: true },
        });

        if (!assessor) throw new Error("Select an existing assessor.");
      }

      await tx.riskAssessment.update({
        where: { id },
        data: {
          assessmentType: input.assessmentType,
          probability: input.probability,
          impact: input.impact,
          exposure: input.probability * input.impact,
          comments: input.comments,
          assessedByUserId: input.assessedByUserId,
          assessmentDate: input.assessmentDate ?? new Date(),
        },
      });
    });

    revalidatePath("/risks");
    return riskOk("Assessment updated successfully.");
  } catch (error) {
    return riskError(
      `Assessment not updated: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function deleteRiskAssessment(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");
    if (!id) return riskError("Assessment not deleted: missing id.");

    const existing = await prisma.riskAssessment.findFirst({
      where: { id, risk: { project: { workspaceId: selectedWorkspace.id } } },
      select: { id: true },
    });
    if (!existing) {
      return riskError("Assessment not deleted: record is not in the selected workspace.");
    }

    await prisma.riskAssessment.delete({ where: { id } });

    revalidatePath("/risks");
    return riskOk("Assessment deleted successfully.");
  } catch (error) {
    return riskError(
      `Assessment not deleted: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function createRiskReview(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const input = parseRiskReviewInput(formData);
    const inputError = validateRiskReviewInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const risk = await tx.projectRisk.findFirst({
        where: {
          id: input.riskId,
          isActive: true,
          project: { workspaceId: selectedWorkspace.id },
        },
        select: { id: true, projectId: true },
      });

      if (!risk) throw new Error("Select an active risk.");

      if (input.residualAssessmentId) {
        const assessment = await tx.riskAssessment.findFirst({
          where: {
            id: input.residualAssessmentId,
            riskId: risk.id,
          },
          select: { id: true },
        });

        if (!assessment) {
          throw new Error("Select an assessment that belongs to this risk.");
        }
      }

      const [reviewType, reviewOutcome] = await Promise.all([
        tx.riskReviewType.findFirst({
          where: { id: input.reviewTypeId, isActive: true },
          select: { id: true },
        }),
        tx.riskReviewOutcome.findFirst({
          where: { id: input.reviewOutcomeId, isActive: true },
          select: { id: true },
        }),
      ]);

      if (!reviewType) throw new Error("Select an active review type.");
      if (!reviewOutcome) throw new Error("Select an active review outcome.");

      if (input.reviewedByUserId) {
        const reviewer = await tx.user.findUnique({
          where: { id: input.reviewedByUserId },
          select: { id: true },
        });

        if (!reviewer) throw new Error("Select an existing reviewer.");
      }

      if (input.linkedDecisionIds.length > 0) {
        const decisionCount = await tx.projectDecision.count({
          where: {
            id: { in: input.linkedDecisionIds },
            projectId: risk.projectId,
          },
        });

        if (decisionCount !== input.linkedDecisionIds.length) {
          throw new Error("Linked decisions must belong to the same project.");
        }
      }

      await tx.riskReview.create({
        data: {
          riskId: input.riskId,
          residualAssessmentId: input.residualAssessmentId,
          reviewTypeId: input.reviewTypeId,
          reviewOutcomeId: input.reviewOutcomeId,
          reviewedByUserId: input.reviewedByUserId,
          reviewDate: input.reviewDate ?? new Date(),
          comments: input.comments,
          decisionLinks: {
            create: input.linkedDecisionIds.map((projectDecisionId) => ({
              projectDecisionId,
            })),
          },
        },
      });

      await closeRiskIfReviewOutcomeRequiresIt(
        tx,
        input.riskId,
        input.reviewOutcomeId
      );
    });

    revalidatePath("/risks");
    return riskOk("Review created successfully.");
  } catch (error) {
    return riskError(
      `Review not created: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function updateRiskReview(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");
    if (!id) return riskError("Review not updated: missing id.");

    const input = parseRiskReviewInput(formData);
    const inputError = validateRiskReviewInput(input);
    if (inputError) return inputError;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.riskReview.findFirst({
        where: { id, risk: { project: { workspaceId: selectedWorkspace.id } } },
        include: { risk: { select: { id: true, projectId: true } } },
      });

      if (!existing) throw new Error("Select an existing review.");

      if (input.residualAssessmentId) {
        const assessment = await tx.riskAssessment.findFirst({
          where: {
            id: input.residualAssessmentId,
            riskId: existing.risk.id,
          },
          select: { id: true },
        });

        if (!assessment) {
          throw new Error("Select an assessment that belongs to this risk.");
        }
      }

      const [reviewType, reviewOutcome] = await Promise.all([
        tx.riskReviewType.findFirst({
          where: { id: input.reviewTypeId, isActive: true },
          select: { id: true },
        }),
        tx.riskReviewOutcome.findFirst({
          where: { id: input.reviewOutcomeId, isActive: true },
          select: { id: true },
        }),
      ]);

      if (!reviewType) throw new Error("Select an active review type.");
      if (!reviewOutcome) throw new Error("Select an active review outcome.");

      if (input.reviewedByUserId) {
        const reviewer = await tx.user.findUnique({
          where: { id: input.reviewedByUserId },
          select: { id: true },
        });

        if (!reviewer) throw new Error("Select an existing reviewer.");
      }

      if (input.linkedDecisionIds.length > 0) {
        const decisionCount = await tx.projectDecision.count({
          where: {
            id: { in: input.linkedDecisionIds },
            projectId: existing.risk.projectId,
          },
        });

        if (decisionCount !== input.linkedDecisionIds.length) {
          throw new Error("Linked decisions must belong to the same project.");
        }
      }

      await tx.riskReview.update({
        where: { id },
        data: {
          residualAssessmentId: input.residualAssessmentId,
          reviewTypeId: input.reviewTypeId,
          reviewOutcomeId: input.reviewOutcomeId,
          reviewedByUserId: input.reviewedByUserId,
          reviewDate: input.reviewDate ?? new Date(),
          comments: input.comments,
          decisionLinks: {
            deleteMany: {},
            create: input.linkedDecisionIds.map((projectDecisionId) => ({
              projectDecisionId,
            })),
          },
        },
      });

      await closeRiskIfReviewOutcomeRequiresIt(
        tx,
        existing.risk.id,
        input.reviewOutcomeId
      );
    });

    revalidatePath("/risks");
    return riskOk("Review updated successfully.");
  } catch (error) {
    return riskError(
      `Review not updated: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}

export async function deleteRiskReview(formData: FormData) {
  try {
    const selectedWorkspace = await getSelectedWorkspace();
    const id = String(formData.get("id") || "");
    if (!id) return riskError("Review not deleted: missing id.");

    const existing = await prisma.riskReview.findFirst({
      where: { id, risk: { project: { workspaceId: selectedWorkspace.id } } },
      select: { id: true },
    });
    if (!existing) {
      return riskError("Review not deleted: record is not in the selected workspace.");
    }

    await prisma.riskReview.delete({ where: { id } });

    revalidatePath("/risks");
    return riskOk("Review deleted successfully.");
  } catch (error) {
    return riskError(
      `Review not deleted: ${
        error instanceof Error ? error.message : "database error."
      }`
    );
  }
}
