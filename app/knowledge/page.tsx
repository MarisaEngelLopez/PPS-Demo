import { AdminCardLink } from "@/components/ui/AdminCardLink";
import {
  adminCardGridStyle,
  h1Style,
  pageStyle,
  sectionPanelStyle,
} from "@/components/ui/layoutStyles";
import { getServerLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/dictionaries";

export default async function KnowledgePage() {
  const locale = await getServerLocale();

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{translate(locale, "knowledge.title")}</h1>
      <div style={{ ...sectionPanelStyle, marginBottom: "1rem", color: "#475569" }}>
        {translate(locale, "knowledge.description")}
      </div>
      <div style={adminCardGridStyle}>
        <AdminCardLink
          href="/knowledge/executive-intelligence"
          title={translate(locale, "executiveIntelligence.title")}
          description={translate(locale, "executiveIntelligence.cardDescription")}
        />
      </div>
    </main>
  );
}
