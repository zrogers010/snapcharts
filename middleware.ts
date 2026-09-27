import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { hostname, pathname, search } = request.nextUrl;

  if (hostname.startsWith("www.")) {
    const apexDomain = hostname.replace(/^www\./, "");
    const redirectUrl = new URL(
      `${pathname}${search}`,
      `${request.nextUrl.protocol}//${apexDomain}`
    );
    
    const response = NextResponse.redirect(redirectUrl, 301);
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
    return response;
  }

  const response = NextResponse.next();
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.svg).*)",
  ],
};
