import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser;
  } catch (error) {
    console.error("Supabase auth fetch failed in middleware.", error);
    return supabaseResponse;
  }

  // Protected routes - redirect to auth if not logged in
  // BUT: skip this check for Telegram Mini Apps - they handle auth differently
  // Check if this might be a Telegram WebApp request
  const userAgent = request.headers.get("user-agent") || "";
  const isTelegramWebApp =
    userAgent.includes("Telegram") ||
    request.headers.get("sec-fetch-dest") === "iframe";

  if (
    !user &&
    request.nextUrl.pathname.startsWith("/app") &&
    !isTelegramWebApp
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // If logged in and trying to access auth page, redirect to app
  if (user && request.nextUrl.pathname === "/auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/app/workouts";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
