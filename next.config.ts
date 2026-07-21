import type { NextConfig } from "next";

const permanentTunnelHost = process.env.PPS_PUBLIC_HOSTNAME?.trim();
const extraAllowedOrigins = process.env.PPS_ALLOWED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const remoteOrigins = [
  "*.trycloudflare.com",
  ...(permanentTunnelHost ? [permanentTunnelHost] : []),
  ...(extraAllowedOrigins ?? []),
];
const allowedDevOrigins = [
  ...new Set(
    remoteOrigins.flatMap((origin) => {
      const host = origin
        .replace(/^https?:\/\//, "")
        .split("/")[0]
        .split(":")[0];
      return host ? [origin, host] : [origin];
    })
  ),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "localhost:3001",
        "127.0.0.1:3001",
        "localhost:3002",
        "127.0.0.1:3002",
        ...remoteOrigins,
      ],
    },
  },
};

export default nextConfig;
