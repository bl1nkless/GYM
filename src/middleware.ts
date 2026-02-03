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

  const ua = req.headers.get("user-agent") || "";

  // Detect Telegram mode: ?tg=1 parameter OR Telegram in User-Agent
  const isTg =
    url.searchParams.get("tg") === "1" ||
    ua.includes("Telegram") ||
    req.headers.get("sec-fetch-dest") === "iframe";

  // Check for Supabase session cookies
  const hasSb =
    req.cookies.has("sb-access-token") ||
    req.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") || c.name.includes("supabase"));

  // In Telegram mode - always pass through, client will create session
  if (isTg) {
    return NextResponse.next();
  }

  // Outside Telegram - standard auth protection
  if (!hasSb && url.pathname !== "/auth" && url.pathname.startsWith("/app")) {
    const authUrl = url.clone();
    authUrl.pathname = "/auth";
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
