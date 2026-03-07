import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {

  const refreshCookie = req.cookies.get("tl_refresh")
  const { pathname } = req.nextUrl

  const isAuthRoute = pathname.startsWith("/auth")
  const isApiRoute  = pathname.startsWith("/api")

  // ── API route protection ────────────────────────────────────────────────
  // Guard any future app/api/ routes against cross-origin requests.
  // All current API traffic goes to Spring Boot — this is a forward-looking
  // safeguard for any Next.js API routes added later.
  if (isApiRoute) {
    const origin  = req.headers.get("origin")
    const host    = req.headers.get("host")
    const allowed = process.env.NEXT_PUBLIC_APP_URL ?? `https://${host}`

    // Non-browser requests (curl, server-to-server) have no Origin header — allow them.
    // Browser requests must originate from the same host.
    if (origin && origin !== allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // API routes also require an active session
    if (!refreshCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.next()
  }

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
    '/',
    '/explanation/:path*',
    '/chat/:path*',
    '/rag/:path*',
    '/validation/:path*',
    '/artifacts/:path*',
    '/roadmap/:path*',
    '/auth/:path*',
    '/api/:path*',       
  ],
}