import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "zaffine-super-secure-jwt-key-solar-inventory-2026"
);
const COOKIE_NAME = "zaffine_session";

export async function middleware(request: NextRequest) {
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

  // Auth pages are always accessible directly to avoid redirect loops
  if (isAuthPage) {
    return NextResponse.next();
  }

  // If not logged in
  if (!sessionUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is logged in
  if (sessionUser.status === "PENDING" && !isPendingPage) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  // Super Admin route check
  if (pathname.startsWith("/admin") && sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?denied=admin_only", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
