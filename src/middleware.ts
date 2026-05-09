import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionOptions } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/app")) {
    const cookieValue = request.cookies.get(sessionOptions.cookieName)?.value;
    if (!cookieValue) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Full session verification happens in each page via getTenantCtx (Node.js runtime).
    // Edge Runtime can't access runtime env vars so we only check cookie presence here.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
