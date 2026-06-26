import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL("/configuration/agents/transactions/export", request.url);
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("agentKey", "TIME_TRACKING");

  return NextResponse.redirect(url);
}
