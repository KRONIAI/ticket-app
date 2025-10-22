'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Building2, 
  Ticket, 
  Users, 
  Settings, 
  BarChart3,
  Clock,
  MessageSquare,
  Plus,
  Home,
  UserCog,
  Database
} from 'lucide-react'
import { AuthUser, UserRole } from '@/lib/auth'

interface SidebarProps {
  user: AuthUser
  currentOrgSlug?: string
}

interface SidebarItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  badge?: string
}

const getSidebarItems = (currentOrgSlug?: string): SidebarItem[] => {
  if (currentOrgSlug) {
    // Menu per Admin Azienda
    return [
      {
        title: 'Panoramica',
        href: `/admin/${currentOrgSlug}`,
        icon: Home,
        roles: ['ADMIN_AZIENDA', 'SUPER_ADMIN']
      },
      {
        title: 'Ticket',
        href: `/admin/${currentOrgSlug}/tickets`,
        icon: Ticket,
        roles: ['ADMIN_AZIENDA', 'SUPER_ADMIN']
      },
      {
        title: 'Nuovo Ticket',
        href: `/admin/${currentOrgSlug}/tickets/new`,
        icon: Plus,
        roles: ['ADMIN_AZIENDA', 'SUPER_ADMIN']
      },
      {
        title: 'Utenti',
        href: `/admin/${currentOrgSlug}/users`,
        icon: Users,
        roles: ['ADMIN_AZIENDA', 'SUPER_ADMIN']
      },
      {
        title: 'Dipendenti & Turni',
        href: `/admin/${currentOrgSlug}/shifts`,
        icon: Clock,
        roles: ['ADMIN_AZIENDA', 'SUPER_ADMIN']
      },
      {
        title: 'Servizi',
        href: `/admin/${currentOrgSlug}/services`,
        icon: Settings,
        roles: ['ADMIN_AZIENDA', 'SUPER_ADMIN']
      },
      {
        title: 'Report',
        href: `/admin/${currentOrgSlug}/reports`,
        icon: BarChart3,
        roles: ['ADMIN_AZIENDA', 'SUPER_ADMIN']
      }
    ]
  } else {
    // Menu per Super Admin
    return [
      {
        title: 'Panoramica',
        href: '/superadmin',
        icon: Home,
        roles: ['SUPER_ADMIN']
      },
      {
        title: 'Aziende',
        href: '/superadmin/organizations',
        icon: Building2,
        roles: ['SUPER_ADMIN']
      },
      {
        title: 'Catalogo Servizi',
        href: '/superadmin/services',
        icon: Database,
        roles: ['SUPER_ADMIN']
      },
      {
        title: 'Utenti',
        href: '/superadmin/users',
        icon: UserCog,
        roles: ['SUPER_ADMIN']
      },
      {
        title: 'Log di Sistema',
        href: '/superadmin/logs',
        icon: MessageSquare,
        roles: ['SUPER_ADMIN']
      }
    ]
  }
}

export function Sidebar({ user, currentOrgSlug }: SidebarProps) {
  const pathname = usePathname()
  const sidebarItems = getSidebarItems(currentOrgSlug)
  
  const currentRole = currentOrgSlug 
    ? user.memberships.find(m => m.organization.slug === currentOrgSlug)?.role
    : user.memberships.find(m => m.role === 'SUPER_ADMIN')?.role

  const filteredItems = sidebarItems.filter(item => 
    currentRole && item.roles.includes(currentRole)
  )

  return (
    <div className="pb-12 w-64">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              {currentOrgSlug ? 'Amministrazione' : 'Super Admin'}
            </h2>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-1 p-2">
                {filteredItems.map((item) => (
                  <Button
                    key={item.href}
                    variant={pathname === item.href ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      pathname === item.href && 'bg-muted font-medium'
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                      {item.badge && (
                        <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-1">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
