import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const publicRoutes = ['/', '/login', '/signup']

export async function middleware(request: NextRequest) {
  // Refresh session
  let response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Try to get the user session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const authCookie = request.cookies.get('sb-auth-token')
  const isAuthenticated = !!authCookie

  // Redirect authenticated users away from login/signup
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users to login (except public routes)
  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json).*)',
  ],
}
