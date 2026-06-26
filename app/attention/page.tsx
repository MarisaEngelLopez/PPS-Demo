import { AttentionWorkspace } from "@/app/attention/AttentionWorkspace";
import { getDailyAttentionItems } from "@/lib/domain/attention/attentionEngine";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function DailyAttentionWorkspacePage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const items = await getDailyAttentionItems();

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("pages.dailyAttentionWorkspace")}</h1>
      <p style={{ color: "#475569", marginBottom: "1rem", maxWidth: 880 }}>
        {t("pages.dailyAttentionWorkspaceDescription")}
      </p>
      <AttentionWorkspace items={items} />
    </main>
  );
}
