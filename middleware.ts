import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== 'true') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Admin and privacy always accessible during maintenance
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/maintenance')
  ) {
    return NextResponse.next()
  }

  return NextResponse.rewrite(new URL('/maintenance', request.url))
}

export const config = {
  // Run on all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon|mascots|api).*)'],
}
