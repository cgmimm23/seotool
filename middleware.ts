import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const isAuthed = !!token

  const isAuthPage = pathname.startsWith('/login')
  const isAdminPage = pathname.startsWith('/admin')
  const isAdminLogin =
    pathname === '/admin/login' ||
    pathname === '/admin/forgot-password' ||
    pathname === '/admin/reset-password'
  const isDashboard =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/sites') ||
    pathname.startsWith('/audit') ||
    pathname.startsWith('/keywords') ||
    pathname.startsWith('/serp') ||
    pathname.startsWith('/backlinks') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/settings')

  // Admin routes use a separate `admin_session` cookie (admin_accounts auth).
  if (isAdminPage && !isAdminLogin) {
    const adminSession = request.cookies.get('admin_session')?.value
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  if (!isAuthed && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isAuthed && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isDashboard || isAdminPage) {
    res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate')
    res.headers.set('Vary', 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Cookie')
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/cron|api/weekly-report|api/tracking|api/v1|api/reports|api/stripe/webhook|api/agent|reports).*)',
  ],
}
