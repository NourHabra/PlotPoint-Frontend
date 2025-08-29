import { NextResponse, type NextRequest } from "next/server";

export function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth-token")?.value;

  // Not logged in → block dashboard
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/v1/login", req.url));
  }

  // Logged in but on auth pages → go home
  if (token && (pathname === "/auth/v1/login" || pathname === "/auth/v1/register")) {
    return NextResponse.redirect(new URL("/dashboard/default", req.url));
  }

  // RBAC enforcement
  if (token && pathname.startsWith("/dashboard")) {
    try {
      const payload = JSON.parse(Buffer.from((token.split(".")[1] || ""), "base64").toString("utf-8")) as any;
      const role = payload?.role || "User";
      const adminOnly = [
        "/dashboard/templates/import",
        "/dashboard/templates/create",
        "/dashboard/templates",
        "/dashboard/admin/create-user",
        "/dashboard/users",
        "/dashboard/reports/all",
        "/dashboard/admin/tickets",
      ];
      const userWhitelist = [
        "/dashboard/templates/fill",
        "/dashboard/reports",
        "/dashboard/support",
      ];
      if (role !== "Admin") {
        // Allow whitelisted paths explicitly
        if (userWhitelist.some((p) => pathname.startsWith(p))) {
          // pass
        } else if (
          adminOnly.some((p) => {
            // Block exact admin-only paths and their subpaths, except whitelisted
            if (p === "/dashboard/templates") {
              // block /dashboard/templates and its subpaths EXCEPT /dashboard/templates/fill
              if (pathname === "/dashboard/templates") return true;
              if (pathname.startsWith("/dashboard/templates/") && !pathname.startsWith("/dashboard/templates/fill")) return true;
              return false;
            }
            return pathname === p || pathname.startsWith(p + "/");
          })
        ) {
          return NextResponse.redirect(new URL("/dashboard/default", req.url));
        }
      } else {
        // Admin: block user-only pages, but do not block admin subpages
        const userOnly = [
          "/dashboard/templates/fill",
          "/dashboard/reports",
          "/dashboard/support",
        ];
        if (
          userOnly.some((p) => {
            if (p === "/dashboard/reports") {
              // Allow admin reports subpages like /dashboard/reports/all
              return pathname === "/dashboard/reports"; // block only exact
            }
            return pathname === p || pathname.startsWith(p + "/");
          })
        ) {
          return NextResponse.redirect(new URL("/dashboard/default", req.url));
        }
      }
    } catch {}
  }

  return NextResponse.next();
}
