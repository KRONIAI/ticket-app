import { requireAdminOrSuperAdmin, getCurrentOrganization } from '@/lib/auth'
import { MainNav } from '@/components/layout/main-nav'
import { Sidebar } from '@/components/layout/sidebar'
import { notFound } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
  params: { orgSlug: string }
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const user = await requireAdminOrSuperAdmin()
  const currentOrg = getCurrentOrganization(user, params.orgSlug)
  
  if (!currentOrg) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav user={user} currentOrgSlug={params.orgSlug} />
      <div className="flex">
        <Sidebar user={user} currentOrgSlug={params.orgSlug} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
