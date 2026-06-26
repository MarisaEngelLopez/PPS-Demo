import { updateApplicationLanguage } from "@/app/configuration/language/actions";
import {
  compactInputStyle,
  h1Style,
  labelStyle,
  pageStyle,
  sectionPanelStyle,
  tableButtonStyle,
} from "@/components/ui/layoutStyles";
import { translate } from "@/lib/i18n/dictionaries";
import { getServerLocale } from "@/lib/i18n/server";
import { localeLabels, supportedLocales } from "@/lib/i18n/locales";

export default async function LanguageConfigurationPage() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{t("language.title")}</h1>

      <section style={{ ...sectionPanelStyle, maxWidth: 640 }}>
        <p style={{ color: "#475569", marginTop: 0 }}>
          {t("configuration.language.description")}
        </p>

        <form
          action={updateApplicationLanguage}
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "140px minmax(0, 1fr) auto",
            alignItems: "center",
          }}
        >
          <label htmlFor="locale" style={labelStyle}>
            {t("language.current")}
          </label>
          <select
            id="locale"
            name="locale"
            defaultValue={locale}
            style={compactInputStyle}
          >
            {supportedLocales.map((option) => (
              <option key={option} value={option}>
                {localeLabels[option]}
              </option>
            ))}
          </select>
          <button type="submit" style={tableButtonStyle}>
            {t("language.save")}
          </button>
        </form>
      </section>
    </main>
  );
}
