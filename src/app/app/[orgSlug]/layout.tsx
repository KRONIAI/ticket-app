import { requireAuth, getCurrentOrganization } from '@/lib/auth'
import { MainNav } from '@/components/layout/main-nav'
import { notFound } from 'next/navigation'

interface UserAppLayoutProps {
  children: React.ReactNode
  params: { orgSlug: string }
}

export default async function UserAppLayout({ children, params }: UserAppLayoutProps) {
  const user = await requireAuth()
  const currentOrg = getCurrentOrganization(user, params.orgSlug)
  
  if (!currentOrg) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav user={user} currentOrgSlug={params.orgSlug} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
