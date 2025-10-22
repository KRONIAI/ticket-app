import { requireSuperAdmin } from '@/lib/auth'
import { MainNav } from '@/components/layout/main-nav'
import { Sidebar } from '@/components/layout/sidebar'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireSuperAdmin()

  return (
    <div className="min-h-screen bg-background">
      <MainNav user={user} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
