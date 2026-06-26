import { AdminCardGrid, AdminCardLink } from "@/components/ui/AdminCardLink";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

export default async function SystemConfigurationPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("configuration.title")}</h1>

      <p style={{ color: "#475569", maxWidth: 880 }}>
        {t("configuration.description")}
      </p>

      <div style={{ marginTop: 16 }}>
        <AdminCardGrid>
          <AdminCardLink
            href="/configuration/business-codes"
            title={t("configuration.businessCodes.title")}
            description={t("configuration.businessCodes.description")}
          />
          <AdminCardLink
            href="/configuration/reporting-packs"
            title={t("configuration.reportingPacks.title")}
            description={t("configuration.reportingPacks.description")}
          />
          <AdminCardLink
            href="/configuration/risk-review-types"
            title={t("configuration.riskReviewTypes.title")}
            description={t("configuration.riskReviewTypes.description")}
          />
          <AdminCardLink
            href="/configuration/risk-review-outcomes"
            title={t("configuration.riskReviewOutcomes.title")}
            description={t("configuration.riskReviewOutcomes.description")}
          />
          <AdminCardLink
            href="/configuration/agents"
            title={t("configuration.agents.title")}
            description={t("configuration.agents.description")}
          />
          <AdminCardLink
            href="/configuration/agents/transactions"
            title={t("configuration.agentTransactions.title")}
            description={t("configuration.agentTransactions.description")}
          />
        </AdminCardGrid>
      </div>
    </main>
  );
}
