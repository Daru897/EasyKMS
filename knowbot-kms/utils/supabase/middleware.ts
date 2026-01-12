import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes logic
  // IMPORTANT: For dashboard, we completely skip middleware auth checks
  // The client-side AuthContext (now using SSR-compatible cookies) will handle ALL auth
  // This prevents any timing issues between middleware and client-side session reading
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Skip middleware auth check - let client-side handle it
    // Both middleware and AuthContext now use the same cookie-based session
    console.log('[Middleware] Dashboard route - skipping auth check, client will handle');
    // Don't redirect - always let the page load
  }

  // Admin-only routes
  if (request.nextUrl.pathname.startsWith('/admin') && user?.email !== 'admin@example.com') {
    const url = request.nextUrl.clone()
    url.pathname = '/unauthorized'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}