import { revalidatePath } from "next/cache";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  compactInputStyle,
  h1Style,
  pageStyle,
  tableActionGroupStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { tableStyle, tdStyle, thStyle } from "@/components/ui/tableStyles";
import {
  AGENT_CONFIGURATION_PATH,
  getAgentConfigurationPageData,
  normalizeAgentApprovalMode,
  normalizeAgentBoolean,
  normalizeAgentNumber,
} from "@/lib/domain/agents/agentConfiguration";
import {
  formatLogTimestamp,
  getAgentConfigurationLogRows,
} from "@/lib/domain/agents/agentConfigurationLog";
import { AGENT_APPROVAL_MODES } from "@/lib/domain/agents/agentRules";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

function boolLabel(value: boolean, locale: Awaited<ReturnType<typeof getServerLocale>>) {
  return translate(locale, value ? "labels.yes" : "labels.no");
}

function formatJson(value: unknown) {
  return JSON.stringify(value);
}

async function logAgentConfigurationChange(input: {
  agentId: string;
  capabilityId?: string | null;
  changeType: string;
  before: unknown;
  after: unknown;
}) {
  "use server";

  await prisma.agentConfigurationChangeLog.create({
    data: {
      agentId: input.agentId,
      capabilityId: input.capabilityId ?? null,
      changeType: input.changeType,
      beforeJson: formatJson(input.before),
      afterJson: formatJson(input.after),
    },
  });
}

async function updateAgentDefinition(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) return;

  const existing = await prisma.agentDefinition.findUnique({ where: { id } });
  if (!existing) return;

  const next = {
    isEnabled: normalizeAgentBoolean(formData.get("isEnabled")),
    oneUserMode: normalizeAgentBoolean(formData.get("oneUserMode")),
  };

  await prisma.agentDefinition.update({
    where: { id },
    data: next,
  });

  await logAgentConfigurationChange({
    agentId: id,
    changeType: "AGENT_DEFINITION_UPDATED",
    before: {
      isEnabled: existing.isEnabled,
      oneUserMode: existing.oneUserMode,
    },
    after: next,
  });

  revalidatePath(AGENT_CONFIGURATION_PATH);
}

async function updateAgentSource(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) return;

  const existing = await prisma.agentSourceConfig.findUnique({
    where: { id },
  });
  if (!existing) return;

  const next = {
    isEnabled: normalizeAgentBoolean(formData.get("isEnabled")),
    transcriptReviewRequired: normalizeAgentBoolean(
      formData.get("transcriptReviewRequired")
    ),
  };

  await prisma.agentSourceConfig.update({
    where: { id },
    data: next,
  });

  await logAgentConfigurationChange({
    agentId: existing.agentId,
    changeType: "AGENT_SOURCE_UPDATED",
    before: {
      sourceType: existing.sourceType,
      isEnabled: existing.isEnabled,
      transcriptReviewRequired: existing.transcriptReviewRequired,
    },
    after: {
      sourceType: existing.sourceType,
      ...next,
    },
  });

  revalidatePath(AGENT_CONFIGURATION_PATH);
}

async function updateAgentCapability(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) return;

  const existing = await prisma.agentCapability.findUnique({ where: { id } });
  if (!existing) return;

  const requestedApprovalMode = normalizeAgentApprovalMode(
    formData.get("approvalMode")
  );
  const next = {
    isEnabled: normalizeAgentBoolean(formData.get("isEnabled")),
    approvalMode: existing.isProtected
      ? existing.approvalMode
      : requestedApprovalMode,
  };

  await prisma.agentCapability.update({
    where: { id },
    data: next,
  });

  await logAgentConfigurationChange({
    agentId: existing.agentId,
    capabilityId: existing.id,
    changeType: "AGENT_CAPABILITY_UPDATED",
    before: {
      capabilityKey: existing.capabilityKey,
      isEnabled: existing.isEnabled,
      approvalMode: existing.approvalMode,
    },
    after: {
      capabilityKey: existing.capabilityKey,
      ...next,
    },
  });

  revalidatePath(AGENT_CONFIGURATION_PATH);
}

async function updateAgentRule(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) return;

  const existing = await prisma.agentRule.findUnique({ where: { id } });
  if (!existing || !existing.isEditable) return;

  const nextValue =
    existing.valueType === "BOOLEAN"
      ? String(normalizeAgentBoolean(formData.get("value")))
      : existing.valueType === "NUMBER"
      ? String(normalizeAgentNumber(formData.get("value"), Number(existing.value)))
      : String(formData.get("value") || "").trim();

  await prisma.agentRule.update({
    where: { id },
    data: { value: nextValue },
  });

  await logAgentConfigurationChange({
    agentId: existing.agentId,
    capabilityId: existing.capabilityId,
    changeType: "AGENT_RULE_UPDATED",
    before: {
      ruleKey: existing.ruleKey,
      value: existing.value,
    },
    after: {
      ruleKey: existing.ruleKey,
      value: nextValue,
    },
  });

  revalidatePath(AGENT_CONFIGURATION_PATH);
}

async function updateInstructionTemplate(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) return;

  const existing = await prisma.agentInstructionTemplate.findUnique({
    where: { id },
  });
  if (!existing) return;

  const next = {
    label: String(formData.get("label") || "").trim(),
    instruction: String(formData.get("instruction") || "").trim(),
    isEnabled: normalizeAgentBoolean(formData.get("isEnabled")),
    isDefault: normalizeAgentBoolean(formData.get("isDefault")),
  };

  if (!next.label || !next.instruction) return;

  await prisma.$transaction(async (tx) => {
    if (next.isDefault) {
      await tx.agentInstructionTemplate.updateMany({
        where: { agentId: existing.agentId, NOT: { id } },
        data: { isDefault: false },
      });
    }

    await tx.agentInstructionTemplate.update({
      where: { id },
      data: next,
    });

    await tx.agentConfigurationChangeLog.create({
      data: {
        agentId: existing.agentId,
        changeType: "AGENT_INSTRUCTION_TEMPLATE_UPDATED",
        beforeJson: formatJson({
          templateKey: existing.templateKey,
          label: existing.label,
          instruction: existing.instruction,
          isEnabled: existing.isEnabled,
          isDefault: existing.isDefault,
        }),
        afterJson: formatJson({
          templateKey: existing.templateKey,
          ...next,
        }),
      },
    });
  });

  revalidatePath(AGENT_CONFIGURATION_PATH);
}

export default async function AgentConfigurationPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const agents = await getAgentConfigurationPageData();
  const sources = agents.flatMap((agent) =>
    agent.sources.map((source) => ({ ...source, agent }))
  );
  const capabilities = agents.flatMap((agent) =>
    agent.capabilities.map((capability) => ({ ...capability, agent }))
  );
  const instructionTemplates = agents.flatMap((agent) =>
    agent.instructionTemplates.map((template) => ({ ...template, agent }))
  );
  const rules = agents.flatMap((agent) =>
    agent.rules.map((rule) => ({ ...rule, agent }))
  );
  const recentLogs = agents
    .flatMap((agent) =>
      agent.configLogs.map((log) => ({
        ...log,
        agent,
      }))
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 12);
  const recentLogRows = getAgentConfigurationLogRows(recentLogs);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("configuration.agentConfig.title")}</h1>

      <p style={{ color: "#475569", maxWidth: 980 }}>
        {t("configuration.agentConfig.description")}
      </p>

      <div style={{ marginTop: 22 }}>
        <SectionHeader title="Agents" />
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.agent")}</th>
            <th style={thStyle}>{t("labels.key")}</th>
            <th style={thStyle}>{t("labels.enabled")}</th>
            <th style={thStyle}>{t("labels.oneUserMode")}</th>
            <th style={thStyle}>{t("labels.description")}</th>
            <th style={thStyle}>{t("table.action")}</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id}>
              <td style={tdStyle}>{agent.name}</td>
              <td style={tdStyle}>{agent.agentKey}</td>
              <td style={tdStyle}>{boolLabel(agent.isEnabled, locale)}</td>
              <td style={tdStyle}>{boolLabel(agent.oneUserMode, locale)}</td>
              <td style={tdStyle}>{agent.description}</td>
              <td style={tdStyle}>
                <form
                  action={updateAgentDefinition}
                  style={tableActionGroupStyle}
                >
                  <input type="hidden" name="id" value={agent.id} />
                  <label>
                    <input
                      type="checkbox"
                      name="isEnabled"
                      value="true"
                      defaultChecked={agent.isEnabled}
                    />{" "}
                    {t("labels.enabled")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="oneUserMode"
                      value="true"
                      defaultChecked={agent.oneUserMode}
                    />{" "}
                    {t("labels.oneUserMode")}
                  </label>
                  <button type="submit" style={tableButtonStyle}>
                    {t("actions.save")}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 22 }}>
        <SectionHeader title={t("configuration.inputSources")} />
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.agent")}</th>
            <th style={thStyle}>{t("labels.source")}</th>
            <th style={thStyle}>{t("labels.enabled")}</th>
            <th style={thStyle}>{t("labels.reviewTranscript")}</th>
            <th style={thStyle}>{t("table.action")}</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id}>
              <td style={tdStyle}>{source.agent.name}</td>
              <td style={tdStyle}>{source.sourceType}</td>
              <td style={tdStyle}>{boolLabel(source.isEnabled, locale)}</td>
              <td style={tdStyle}>
                {boolLabel(source.transcriptReviewRequired, locale)}
              </td>
              <td style={tdStyle}>
                <form
                  action={updateAgentSource}
                  style={tableActionGroupStyle}
                >
                  <input type="hidden" name="id" value={source.id} />
                  <label>
                    <input
                      type="checkbox"
                      name="isEnabled"
                      value="true"
                      defaultChecked={source.isEnabled}
                    />{" "}
                    {t("labels.enabled")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="transcriptReviewRequired"
                      value="true"
                      defaultChecked={source.transcriptReviewRequired}
                    />{" "}
                    {t("labels.review")}
                  </label>
                  <button type="submit" style={tableButtonStyle}>
                    {t("actions.save")}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 22 }}>
        <SectionHeader title={t("configuration.capabilities")} />
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.agent")}</th>
            <th style={thStyle}>{t("labels.capability")}</th>
            <th style={thStyle}>{t("labels.target")}</th>
            <th style={thStyle}>{t("labels.enabled")}</th>
            <th style={thStyle}>{t("labels.approvalMode")}</th>
            <th style={thStyle}>{t("labels.protected")}</th>
            <th style={thStyle}>{t("table.action")}</th>
          </tr>
        </thead>
        <tbody>
          {capabilities.map((capability) => (
            <tr key={capability.id}>
              <td style={tdStyle}>{capability.agent.name}</td>
              <td style={tdStyle}>
                <strong>{capability.name}</strong>
                <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  {capability.capabilityKey}
                </div>
              </td>
              <td style={tdStyle}>{capability.targetEntity}</td>
              <td style={tdStyle}>{boolLabel(capability.isEnabled, locale)}</td>
              <td style={tdStyle}>{capability.approvalMode}</td>
              <td style={tdStyle}>{boolLabel(capability.isProtected, locale)}</td>
              <td style={tdStyle}>
                <form
                  action={updateAgentCapability}
                  style={tableActionGroupStyle}
                >
                  <input type="hidden" name="id" value={capability.id} />
                  <label>
                    <input
                      type="checkbox"
                      name="isEnabled"
                      value="true"
                      defaultChecked={capability.isEnabled}
                    />{" "}
                    {t("labels.enabled")}
                  </label>
                  <select
                    name="approvalMode"
                    defaultValue={capability.approvalMode}
                    disabled={capability.isProtected}
                    style={{ ...compactInputStyle, width: 180 }}
                  >
                    {AGENT_APPROVAL_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                  <button type="submit" style={tableButtonStyle}>
                    {t("actions.save")}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 22 }}>
        <SectionHeader title={t("configuration.instructionTemplates")} />
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.agent")}</th>
            <th style={thStyle}>{t("labels.template")}</th>
            <th style={thStyle}>{t("timeTracking.instruction")}</th>
            <th style={thStyle}>{t("labels.enabled")}</th>
            <th style={thStyle}>{t("labels.default")}</th>
            <th style={thStyle}>{t("table.action")}</th>
          </tr>
        </thead>
        <tbody>
          {instructionTemplates.map((template) => (
            <tr key={template.id}>
              <td style={tdStyle}>{template.agent.name}</td>
              <td style={tdStyle}>
                <strong>{template.templateKey}</strong>
              </td>
              <td style={tdStyle}>{template.instruction}</td>
              <td style={tdStyle}>{boolLabel(template.isEnabled, locale)}</td>
              <td style={tdStyle}>{boolLabel(template.isDefault, locale)}</td>
              <td style={tdStyle}>
                <form action={updateInstructionTemplate} style={tableActionGroupStyle}>
                  <input type="hidden" name="id" value={template.id} />
                  <input
                    name="label"
                    defaultValue={template.label}
                    style={{ ...compactInputStyle, width: 150 }}
                  />
                  <input
                    name="instruction"
                    defaultValue={template.instruction}
                    style={{ ...compactInputStyle, width: 190 }}
                  />
                  <label>
                    <input
                      type="checkbox"
                      name="isEnabled"
                      value="true"
                      defaultChecked={template.isEnabled}
                    />{" "}
                    {t("labels.enabled")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="isDefault"
                      value="true"
                      defaultChecked={template.isDefault}
                    />{" "}
                    {t("labels.default")}
                  </label>
                  <button type="submit" style={tableButtonStyle}>
                    {t("actions.save")}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 22 }}>
        <SectionHeader title={t("configuration.rules")} />
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.agent")}</th>
            <th style={thStyle}>{t("labels.rule")}</th>
            <th style={thStyle}>{t("labels.value")}</th>
            <th style={thStyle}>{t("labels.type")}</th>
            <th style={thStyle}>{t("labels.editable")}</th>
            <th style={thStyle}>{t("labels.protected")}</th>
            <th style={thStyle}>{t("table.action")}</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td style={tdStyle}>{rule.agent.name}</td>
              <td style={tdStyle}>
                <strong>{rule.name}</strong>
                <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  {rule.ruleKey}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  {rule.description}
                </div>
              </td>
              <td style={tdStyle}>{rule.value}</td>
              <td style={tdStyle}>{rule.valueType}</td>
              <td style={tdStyle}>{boolLabel(rule.isEditable, locale)}</td>
              <td style={tdStyle}>{boolLabel(rule.isProtected, locale)}</td>
              <td style={tdStyle}>
                <form
                  action={updateAgentRule}
                  style={tableActionGroupStyle}
                >
                  <input type="hidden" name="id" value={rule.id} />
                  {rule.valueType === "BOOLEAN" ? (
                    <label>
                      <input
                        type="checkbox"
                        name="value"
                        value="true"
                        defaultChecked={rule.value === "true"}
                        disabled={!rule.isEditable}
                      />{" "}
                      True
                    </label>
                  ) : (
                    <input
                      name="value"
                      defaultValue={rule.value}
                      disabled={!rule.isEditable}
                      type={rule.valueType === "NUMBER" ? "number" : "text"}
                      style={{ ...compactInputStyle, width: 120 }}
                    />
                  )}
                  <button
                    type="submit"
                    style={tableButtonStyle}
                    disabled={!rule.isEditable}
                  >
                    {t("actions.save")}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 22 }}>
        <SectionHeader title={t("configuration.recentChanges")} />
      </div>
      <form
        action="/configuration/agents/logs/export"
        method="get"
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "end",
          flexWrap: "wrap",
          marginBottom: "0.5rem",
        }}
      >
        <label style={{ color: "#475569", fontSize: "0.8rem" }}>
          {t("filters.from")}
          <input name="from" type="date" style={compactInputStyle} />
        </label>
        <label style={{ color: "#475569", fontSize: "0.8rem" }}>
          {t("filters.to")}
          <input name="to" type="date" style={compactInputStyle} />
        </label>
        <button type="submit" style={tableButtonStyle}>
          {t("actions.downloadCsv")}
        </button>
      </form>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t("labels.when")}</th>
            <th style={thStyle}>{t("labels.agent")}</th>
            <th style={thStyle}>{t("labels.target")}</th>
            <th style={thStyle}>{t("labels.changeType")}</th>
            <th style={thStyle}>{t("labels.field")}</th>
            <th style={thStyle}>{t("labels.previousValue")}</th>
            <th style={thStyle}>{t("labels.newValue")}</th>
          </tr>
        </thead>
        <tbody>
          {recentLogRows.length === 0 ? (
            <tr>
              <td style={tdStyle} colSpan={7}>
                {t("configuration.noChanges")}
              </td>
            </tr>
          ) : (
            recentLogRows.map((log) => (
              <tr key={log.id}>
                <td style={tdStyle}>{formatLogTimestamp(log.createdAt)}</td>
                <td style={tdStyle}>{log.agent}</td>
                <td style={tdStyle}>{log.target}</td>
                <td style={tdStyle}>{log.changeType}</td>
                <td style={tdStyle}>{log.field}</td>
                <td style={tdStyle}>{log.previousValue}</td>
                <td style={tdStyle}>{log.newValue}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
