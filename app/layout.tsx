import MainNav from "@/components/ui/MainNav";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getServerLocale } from "@/lib/i18n/server";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import {
  getAuthorizationContext,
  hasRole,
  isDemoOnlyUser,
} from "@/lib/authorization";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Operations System",
  description: "Project operations and executive reporting system",
  applicationName: "PPS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "PPS",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/pps-icon.svg",
    apple: "/pps-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const authorizationContext = await getAuthorizationContext();
  const isOwnerAdmin = authorizationContext
    ? hasRole(authorizationContext, "OWNER_ADMIN")
    : false;
  const isDemoOnly = authorizationContext
    ? isDemoOnlyUser(authorizationContext)
    : false;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
  <Providers initialLocale={locale}>
    <ServiceWorkerRegistration />
    <MainNav
      showOwnerNavigation={isOwnerAdmin}
      showEnvironmentPill={!isDemoOnly}
    />
    <WorkspaceSwitcher />
    {children}
  </Providers>
</body>
    </html>
  );
}
