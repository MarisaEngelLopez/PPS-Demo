import { NextRequest, NextResponse } from "next/server";

const accessCookieName = "pps_access_token";
const accessQueryParam = "accessToken";

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function tokenMatches(candidate: string | null | undefined, expected: string) {
  return Boolean(candidate) && candidate === expected;
}

function accessForm(pathname: string) {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PPS Access</title>
    <style>
      body { align-items: center; background: #f8fafc; color: #0f172a; display: flex; font-family: Arial, sans-serif; justify-content: center; min-height: 100vh; margin: 0; }
      main { background: #ffffff; border: 1px solid #cbd5e1; max-width: 360px; padding: 24px; width: calc(100% - 32px); }
      h1 { font-size: 20px; margin: 0 0 8px; }
      p { color: #475569; font-size: 14px; line-height: 1.4; margin: 0 0 16px; }
      label { display: grid; font-size: 13px; font-weight: 700; gap: 6px; }
      input { border: 1px solid #94a3b8; font-size: 16px; padding: 10px; }
      button { background: #2563eb; border: 0; color: #ffffff; cursor: pointer; font-weight: 800; margin-top: 14px; padding: 10px 12px; width: 100%; }
    </style>
  </head>
  <body>
    <main>
      <h1>PPS Access</h1>
      <p>This PPS instance is protected. Enter the access token to continue.</p>
      <form method="get" action="${pathname}">
        <label>
          Access token
          <input name="${accessQueryParam}" type="password" autocomplete="current-password" autofocus />
        </label>
        <button type="submit">Continue</button>
      </form>
    </main>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
      status: 401,
    }
  );
}

export function proxy(request: NextRequest) {
  const configuredToken = process.env.PPS_ACCESS_TOKEN?.trim();
  const url = request.nextUrl;
  const host = url.hostname;

  if (isLocalHost(host)) return NextResponse.next();

  if (!configuredToken) {
    return new Response("PPS access gate is not configured for remote access.", {
      headers: { "Cache-Control": "no-store" },
      status: 503,
    });
  }

  const queryToken = url.searchParams.get(accessQueryParam);
  if (tokenMatches(queryToken, configuredToken)) {
    const cleanUrl = url.clone();
    cleanUrl.searchParams.delete(accessQueryParam);
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(accessCookieName, configuredToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
    });
    return response;
  }

  const cookieToken = request.cookies.get(accessCookieName)?.value;
  const headerToken = request.headers.get("x-pps-access-token");
  if (
    tokenMatches(cookieToken, configuredToken) ||
    tokenMatches(headerToken, configuredToken)
  ) {
    return NextResponse.next();
  }

  if (request.method === "GET") {
    return accessForm(url.pathname);
  }

  return new Response("Unauthorized", {
    headers: { "Cache-Control": "no-store" },
    status: 401,
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map)$).*)",
  ],
};
