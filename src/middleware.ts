import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "./middleware/auth-middleware";

export function middleware(req: NextRequest) {
  const response = authMiddleware(req);
  if (response) return response as NextResponse;
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/v1/login", "/auth/v1/register"],
};
