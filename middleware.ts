import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {

  const refreshCookie = req.cookies.get("tl_refresh")
  const { pathname } = req.nextUrl

  const isAuthRoute = pathname.startsWith("/auth")

  // /auth/callback is the OAuth2 landing page — it arrives with no cookie yet
  // (the cookie is set by the backend redirect, but the browser may not have
  // sent it on this first request depending on timing). Never redirect away
  // from it — the page itself handles all auth state setup and navigation.
  if (pathname === "/auth/callback") {
    return NextResponse.next()
  }

  // If not logged in → block protected pages
  if (!refreshCookie && !isAuthRoute) {
    const url = req.nextUrl.clone()
    url.pathname = "/auth/sign-in"
    return NextResponse.redirect(url)
  }

  // If logged in → prevent visiting login page again
  if (refreshCookie && isAuthRoute) {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/auth/:path*"
  ]
}