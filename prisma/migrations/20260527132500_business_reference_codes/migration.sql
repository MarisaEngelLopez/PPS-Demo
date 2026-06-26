-- Governed business reference codes use stable two-letter prefixes.
ALTER TABLE "ProjectRiskAction" ADD COLUMN "actionCode" TEXT;

CREATE UNIQUE INDEX "ProjectRisk_riskCode_key" ON "ProjectRisk"("riskCode");
CREATE UNIQUE INDEX "ProjectRiskAction_actionCode_key" ON "ProjectRiskAction"("actionCode");
CREATE UNIQUE INDEX "ProjectDecision_decisionCode_key" ON "ProjectDecision"("decisionCode");
