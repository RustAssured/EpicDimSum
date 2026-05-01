import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== 'true') {
    return NextResponse.next()
  }

  return NextResponse.rewrite(new URL('/maintenance', request.url))
}

export const config = {
  // Only intercept public-facing pages.
  // /admin, /privacy, /api, and all static assets are never matched,
  // so they remain accessible during maintenance.
  matcher: ['/', '/restaurant/:path*', '/reis/:path*'],
}
