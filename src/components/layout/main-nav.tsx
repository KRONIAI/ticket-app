'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Ticket, 
  Users, 
  Settings, 
  LogOut,
  ChevronDown,
  Bell
} from 'lucide-react'
import { AuthUser, UserRole } from '@/lib/auth'

interface MainNavProps {
  user: AuthUser
  currentOrgSlug?: string
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const getNavItems = (currentOrgSlug?: string): NavItem[] => [
  {
    title: 'Panoramica',
    href: currentOrgSlug ? `/admin/${currentOrgSlug}` : '/superadmin',
    icon: Building2,
    roles: ['SUPER_ADMIN', 'ADMIN_AZIENDA']
  },
  {
    title: 'Ticket',
    href: currentOrgSlug ? `/admin/${currentOrgSlug}/tickets` : '/superadmin/tickets',
    icon: Ticket,
    roles: ['SUPER_ADMIN', 'ADMIN_AZIENDA']
  },
  {
    title: 'Utenti',
    href: currentOrgSlug ? `/admin/${currentOrgSlug}/users` : '/superadmin/organizations',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN_AZIENDA']
  },
  {
    title: 'Impostazioni',
    href: currentOrgSlug ? `/admin/${currentOrgSlug}/settings` : '/superadmin/settings',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'ADMIN_AZIENDA']
  }
]

export function MainNav({ user, currentOrgSlug }: MainNavProps) {
  const pathname = usePathname()
  const navItems = getNavItems(currentOrgSlug)
  
  const currentRole = currentOrgSlug 
    ? user.memberships.find(m => m.organization.slug === currentOrgSlug)?.role
    : user.memberships.find(m => m.role === 'SUPER_ADMIN')?.role

  const filteredNavItems = navItems.filter(item => 
    currentRole && item.roles.includes(currentRole)
  )

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'ADMIN_AZIENDA':
        return 'bg-blue-100 text-blue-800'
      case 'UTENTE':
        return 'bg-green-100 text-green-800'
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin'
      case 'ADMIN_AZIENDA':
        return 'Admin'
      case 'UTENTE':
        return 'Utente'
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Ticket className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              TicketApp
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname === item.href ? 'text-foreground' : 'text-foreground/60'
                )}
              >
                <div className="flex items-center space-x-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </div>
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Notifiche */}
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
            <Bell className="h-4 w-4" />
          </Button>
          
          {/* Selezione organizzazione per Super Admin */}
          {currentRole === 'SUPER_ADMIN' && user.memberships.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Building2 className="h-4 w-4 mr-2" />
                  {currentOrgSlug 
                    ? user.memberships.find(m => m.organization.slug === currentOrgSlug)?.organization.name
                    : 'Tutte le Organizzazioni'
                  }
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Cambia Organizzazione</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/superadmin">Tutte le Organizzazioni</Link>
                </DropdownMenuItem>
                {user.memberships.map((membership) => (
                  <DropdownMenuItem key={membership.id} asChild>
                    <Link href={`/admin/${membership.organization.slug}`}>
                      {membership.organization.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Menu utente */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profile.avatar_url || ''} alt={user.profile.full_name || ''} />
                  <AvatarFallback>
                    {user.profile.full_name?.charAt(0) || user.profile.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.profile.full_name || 'Utente'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.profile.email}
                  </p>
                  {currentRole && (
                    <Badge className={cn('w-fit text-xs', getRoleBadgeColor(currentRole))}>
                      {getRoleLabel(currentRole)}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profilo</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Impostazioni</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Esci</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
