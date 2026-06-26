export type RiskReviewConfigActionResult = {
  ok: boolean;
  message: string;
};

export type RiskReviewTypeRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isInterim: boolean;
  isResidual: boolean;
  isClosure: boolean;
  reviewCount: number;
};

export type RiskReviewOutcomeRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isPending: boolean;
  isAccepted: boolean;
  isContinueMitigation: boolean;
  isEscalated: boolean;
  isClosed: boolean;
  reviewCount: number;
};
