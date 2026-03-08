import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── API route protection ────────────────────────────────────────────────
  // Only guard Next.js API routes (not Spring Boot traffic).
  if (pathname.startsWith("/api")) {
    const origin  = req.headers.get("origin")
    const host    = req.headers.get("host")
    const allowed = process.env.NEXT_PUBLIC_APP_URL ?? `https://${host}`
    if (origin && origin !== allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.next()
  }

  // All page-level auth protection is handled client-side by useAuthGuard().
  // The refresh cookie cannot be used here because the backend is on a
  // different domain (cross-origin) — browsers never send cross-origin
  // httpOnly cookies to Next.js middleware. Client-side sessionStorage is
  // the source of truth for auth state.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/explanation/:path*',
    '/chat/:path*',
    '/validation/:path*',
    '/artifacts/:path*',
    '/roadmap/:path*',
    '/auth/:path*',
    '/api/:path*',       
  ],
}