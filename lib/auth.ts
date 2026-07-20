import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/prisma";

function normalizeTrustedOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return [trimmed];
  }
  return [`http://${trimmed}`, `https://${trimmed}`];
}

const configuredTrustedOrigins = [
  process.env.PPS_PUBLIC_HOSTNAME,
  ...(process.env.PPS_ALLOWED_ORIGINS?.split(",") ?? []),
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
]
  .filter(Boolean)
  .flatMap((origin) => normalizeTrustedOrigin(origin ?? ""));

const trustedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  ...configuredTrustedOrigins,
];

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 6,
  },
  trustedOrigins,
  user: {
    modelName: "AuthUser",
    additionalFields: {
      appUserId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  session: {
    modelName: "AuthSession",
  },
  account: {
    modelName: "AuthAccount",
  },
  verification: {
    modelName: "AuthVerification",
  },
  plugins: [nextCookies()],
});
