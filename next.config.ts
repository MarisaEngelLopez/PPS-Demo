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

const nextConfig: NextConfig = {
  allowedDevOrigins: remoteOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        ...remoteOrigins,
      ],
    },
  },
};

export default nextConfig;
