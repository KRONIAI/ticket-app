import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Aggiorna la sessione Supabase
  const response = await updateSession(request)
  
  const { pathname } = request.nextUrl
  
  // Route pubbliche che non richiedono autenticazione
  const publicRoutes = ['/login', '/auth', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  if (isPublicRoute) {
    return response
  }
  
  // Controlla se l'utente è autenticato
  const supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  // Se non è autenticato, reindirizza al login
  if (response.status === 307 && response.headers.get('location')?.includes('/login')) {
    return response
  }
  
  // Gestione delle route basate sui ruoli
  if (pathname.startsWith('/superadmin')) {
    // TODO: Verificare che l'utente sia SUPER_ADMIN
    return response
  }
  
  if (pathname.startsWith('/admin')) {
    // TODO: Verificare che l'utente sia ADMIN_AZIENDA o SUPER_ADMIN
    return response
  }
  
  if (pathname.startsWith('/app')) {
    // TODO: Verificare che l'utente abbia accesso all'app
    return response
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
