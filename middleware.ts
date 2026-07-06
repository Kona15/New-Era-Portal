import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

const PUBLIC_ROUTES = ["/login", "/api/auth/login", "/api/auth/logout"];
const ADMIN_ROUTES = ["/admin", "/api/admin", "/api/members", "/api/import", "/api/reports/admin"];
const CHANGE_PASSWORD_ROUTE = "/change-password";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("new-era-token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("new-era-token");
    return response;
  }

  // Force password change
  if (payload.mustChangePassword && pathname !== CHANGE_PASSWORD_ROUTE && !pathname.startsWith("/api/auth/change-password")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Password change required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL(CHANGE_PASSWORD_ROUTE, request.url));
  }

  // Admin-only routes
  if (
    (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) ||
      pathname.startsWith("/members") ||
      pathname.startsWith("/reports")) &&
    payload.role !== "admin"
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Inject user info into headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-name", payload.name);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js)).*)",
  ],
};
