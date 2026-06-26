import { AdminCardGrid, AdminCardLink } from "@/components/ui/AdminCardLink";
import { h1Style, pageStyle } from "@/components/ui/layoutStyles";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";

export default async function Home() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("pages.homeTitle")}</h1>

      <p style={{ fontSize: "1.1rem", marginTop: "1rem" }}>
        {t("pages.homeWelcome")}
      </p>

      <div style={{ marginTop: 16 }}>
        <AdminCardGrid>
          <AdminCardLink
            href="/attention"
            title={t("pages.dailyAttention")}
            description={t("pages.dailyAttentionDescription")}
          />
        </AdminCardGrid>
      </div>
    </main>
  );
}
