import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Skip API routes, static files, and Next.js internals
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname === "/favicon.ico" ||
    url.pathname.startsWith("/images") ||
    url.pathname.startsWith("/fonts") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webp")
  ) {
    return NextResponse.next();
  }

  // Skip /tg/* routes - they handle their own auth
  if (url.pathname.startsWith("/tg")) {
    return NextResponse.next();
  }

  const ua = req.headers.get("user-agent") || "";

  // Detect Telegram mode
  const isTelegram =
    url.searchParams.get("tg") === "1" ||
    ua.includes("Telegram") ||
    req.headers.get("sec-fetch-dest") === "iframe";

  // Check for Supabase session cookies
  const hasSession = req.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") || c.name.includes("supabase"));

  // ─────────────────────────────────────────────────────────────
  // Telegram mode WITHOUT session → redirect to /tg/bootstrap
  // ─────────────────────────────────────────────────────────────
  if (isTelegram && !hasSession) {
    const bootstrapUrl = url.clone();
    bootstrapUrl.pathname = "/tg/bootstrap";
    bootstrapUrl.searchParams.delete("tg"); // clean up
    return NextResponse.redirect(bootstrapUrl);
  }

  // Telegram WITH session → pass through
  if (isTelegram && hasSession) {
    return NextResponse.next();
  }

  // ─────────────────────────────────────────────────────────────
  // Non-Telegram mode
  // ─────────────────────────────────────────────────────────────

  // Protected routes require session
  if (!hasSession && url.pathname.startsWith("/app")) {
    const authUrl = url.clone();
    authUrl.pathname = "/auth";
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
