import { requireAuth, getCurrentOrganization } from '@/lib/auth'
import { MainNav } from '@/components/layout/main-nav'
import { notFound } from 'next/navigation'

interface UserAppLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function UserAppLayout({ children, params }: UserAppLayoutProps) {
  const user = await requireAuth()
  const { orgSlug } = await params
  const currentOrg = getCurrentOrganization(user, orgSlug)
  
  if (!currentOrg) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav user={user} currentOrgSlug={orgSlug} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
