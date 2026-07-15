"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/components/i18n/TranslationProvider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  localeCookieName,
  localeLabels,
  supportedLocales,
  type AppLocale,
} from "@/lib/i18n/locales";

type NavLink = {
  href: string;
  labelKey: TranslationKey;
};

const navItems: NavLink[] = [
  { href: "/", labelKey: "nav.home" },
  { href: "/organizations", labelKey: "nav.organizations" },
  { href: "/projects", labelKey: "nav.projects" },
  { href: "/customer-dna", labelKey: "nav.customerDna" },
  { href: "/knowledge", labelKey: "nav.knowledge" },
  { href: "/time-tracking", labelKey: "nav.timeTracking" },
  { href: "/risks", labelKey: "nav.risks" },
  { href: "/decisions", labelKey: "nav.decisions" },
  { href: "/executive-report", labelKey: "nav.executiveReport" },
  { href: "/admin", labelKey: "nav.admin" },
  { href: "/configuration", labelKey: "nav.configuration" },
];

const mobileNavItems: NavLink[] = [
  { href: "/attention", labelKey: "nav.mobileAttention" },
  { href: "/time-tracking/assistant", labelKey: "nav.mobileTtAssistant" },
  { href: "/projects/progress-assistant", labelKey: "nav.mobileProgressAssistant" },
];

const navStyle = {
  background: "#0f172a",
  borderBottom: "3px solid #2563eb",
  padding: "0.75rem 1.5rem",
  alignItems: "center",
  gap: "0.75rem",
};

const linkBaseStyle = {
  color: "white",
  textDecoration: "none",
  padding: "0.45rem 0.75rem",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "0.9rem",
  lineHeight: 1.2,
  minHeight: "40px",
  display: "inline-flex",
  alignItems: "center",
  boxSizing: "border-box" as const,
};

function linkIsActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function EnvironmentPill() {
  const environment = process.env.NEXT_PUBLIC_APP_ENV || "DEV";

  return (
    <span
      style={{
        background: "#f8fafc",
        border: "1px solid #cbd5e1",
        color: "#475569",
        padding: "0.35rem 0.7rem",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {environment}
    </span>
  );
}

function LanguageMenuControl({ compact = false }: { compact?: boolean }) {
  const { locale } = useTranslation();

  function handleChange(nextLocale: AppLocale) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; samesite=lax`;
    window.location.reload();
  }

  return (
    <select
      aria-label="Application language"
      value={locale}
      onChange={(event) => handleChange(event.target.value as AppLocale)}
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.32)",
        borderRadius: "8px",
        color: "white",
        colorScheme: "dark",
        flex: compact ? "0 0 auto" : undefined,
        fontSize: compact ? "0.78rem" : "0.85rem",
        fontWeight: 700,
        minHeight: "40px",
        padding: compact ? "0.35rem 0.4rem" : "0.4rem 0.55rem",
        WebkitTextFillColor: "white",
        width: compact ? "64px" : undefined,
      }}
    >
      {supportedLocales.map((item) => (
        <option key={item} value={item}>
          {compact ? item.toUpperCase() : localeLabels[item]}
        </option>
      ))}
    </select>
  );
}

export default function MainNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <>
      <nav className="desktop-main-nav" style={navStyle}>
        {navItems.map((item) => {
          const active = linkIsActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...linkBaseStyle,
                background: active ? "#2563eb" : "transparent",
                opacity: active ? 1 : 0.82,
              }}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
        <div
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <LanguageMenuControl />
          <EnvironmentPill />
        </div>
      </nav>
      <nav className="mobile-operational-nav" style={navStyle}>
        {mobileNavItems.map((item) => {
          const active = linkIsActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...linkBaseStyle,
                flex: "1 1 0",
                justifyContent: "center",
                textAlign: "center",
                background: active ? "#2563eb" : "transparent",
                opacity: active ? 1 : 0.88,
              }}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
        <LanguageMenuControl compact />
      </nav>
    </>
  );
}
