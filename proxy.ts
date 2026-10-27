import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const destinations = {
  hr: '/dashboard/hr',
  manager: '/dashboard/manager',
  it_admin: '/dashboard/admin',
} as const

const roleForPath = (pathname: string) => {
  if (pathname.startsWith('/dashboard/hr') || pathname.startsWith('/hr')) return 'hr'
  if (pathname.startsWith('/dashboard/manager') || pathname.startsWith('/manager')) return 'manager'
  if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/admin')) return 'it_admin'
  return null
}

export async function proxy(request: NextRequest) {
  const { response, user, role } = await updateSession(request)
  const { pathname } = request.nextUrl
  const protectedRoute = roleForPath(pathname)
  const isLogin = pathname === '/login' || pathname.startsWith('/auth/login')

  if (protectedRoute && !user) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  if (protectedRoute && user && role !== protectedRoute) {
    return NextResponse.redirect(new URL(role ? destinations[role] : '/login?error=profile', request.url))
  }

  if (isLogin && user) {
    if (!role) return response
    return NextResponse.redirect(new URL(destinations[role], request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
