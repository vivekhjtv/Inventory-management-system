import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "zaffine-super-secure-jwt-key-solar-inventory-2026"
);
const COOKIE_NAME = "zaffine_session_v2";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal next paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let sessionUser: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      sessionUser = payload;
    } catch {
      // Invalid/expired token
      sessionUser = null;
    }
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isPendingPage = pathname === "/pending";

  // If already logged in and navigating to auth pages (/login or /register)
  if (isAuthPage) {
    if (sessionUser) {
      if (sessionUser.status === "PENDING") {
        return NextResponse.redirect(new URL("/pending", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    return response;
  }

  // If not logged in and accessing protected pages
  if (!sessionUser) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    return response;
  }

  // User is logged in but pending approval
  if (sessionUser.status === "PENDING" && !isPendingPage) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  // Active user on /pending page
  if (sessionUser.status === "ACTIVE" && isPendingPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Super Admin route check
  if (pathname.startsWith("/admin") && sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?denied=admin_only", request.url));
  }

  const response = NextResponse.next();
  // Prevent browser from caching protected authenticated pages (prevents back-button restoring protected views after logout)
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
