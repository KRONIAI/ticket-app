import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

export default async function HomePage() {
  const user = await getAuthUser()
  
  if (!user) {
    redirect('/login')
  }

  // Determina dove reindirizzare l'utente in base ai suoi ruoli
  const superAdmin = user.memberships.find(m => m.role === 'SUPER_ADMIN' && m.is_active)
  const adminMembership = user.memberships.find(m => m.role === 'ADMIN_AZIENDA' && m.is_active)
  const userMembership = user.memberships.find(m => m.role === 'UTENTE' && m.is_active)

  if (superAdmin) {
    redirect('/superadmin')
  } else if (adminMembership) {
    redirect(`/admin/${adminMembership.organization.slug}`)
  } else if (userMembership) {
    redirect(`/app/${userMembership.organization.slug}`)
  } else {
    redirect('/welcome')
  }
}
