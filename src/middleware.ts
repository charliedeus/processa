// middleware.ts (RAIZ)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Usa AUTH_SECRET (ou NEXTAUTH_SECRET) para validar o JWT
const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
const PUBLIC_PATHS = new Set([
  '/login',
  '/register',
  '/verify',
  '/forgot',
  '/reset',
])

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const token = await getToken({ req, secret: SECRET })

  // 1) Comportamento da RAIZ "/"
  if (pathname === '/') {
    if (token) {
      // logado → manda pro dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url))
    } else {
      // não logado → manda pro login (callback para dashboard)
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', '/dashboard')
      return NextResponse.redirect(loginUrl)
    }
  }

  // 2) Se estiver logado, bloquear páginas públicas (login/register/etc)
  if (token && PUBLIC_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // 3) Proteger dashboard (multi-tenant e sem tenant)
  const isDashboard =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    /^\/[^/]+\/dashboard(\/.*)?$/.test(pathname) // :org/dashboard...

  if (isDashboard && !token) {
    const loginUrl = new URL('/login', req.url)
    const cb = pathname + (search || '')
    loginUrl.searchParams.set('callbackUrl', cb)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/', // raiz
    '/login',
    '/register',
    '/verify',
    '/forgot',
    '/reset',
    '/dashboard/:path*', // sem tenant
    '/:org/dashboard/:path*', // com tenant
  ],
}
