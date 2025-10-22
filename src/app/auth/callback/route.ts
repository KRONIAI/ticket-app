import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Controlla se l'utente ha un profilo
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Cerca il profilo esistente
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        // Se non esiste un profilo, crealo
        if (!profile) {
          await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || null,
              avatar_url: user.user_metadata?.avatar_url || null
            })
        }

        // Controlla le membership per determinare dove reindirizzare
        const { data: memberships } = await supabase
          .from('memberships')
          .select(`
            *,
            organization:organizations(*)
          `)
          .eq('user_id', profile?.id || user.id)
          .eq('is_active', true)

        if (memberships && memberships.length > 0) {
          const superAdmin = memberships.find(m => m.role === 'SUPER_ADMIN')
          const adminMembership = memberships.find(m => m.role === 'ADMIN_AZIENDA')
          const userMembership = memberships.find(m => m.role === 'UTENTE')

          if (superAdmin) {
            return NextResponse.redirect(`${origin}/superadmin`)
          } else if (adminMembership) {
            return NextResponse.redirect(`${origin}/admin/${adminMembership.organization.slug}`)
          } else if (userMembership) {
            return NextResponse.redirect(`${origin}/app/${userMembership.organization.slug}`)
          }
        }

        // Se non ha membership, reindirizza a una pagina di benvenuto
        return NextResponse.redirect(`${origin}/welcome`)
      }
    }
  }

  // Se c'è un errore, reindirizza al login
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
