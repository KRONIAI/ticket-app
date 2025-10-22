import { createClient } from '@/lib/supabase/server'
import { Database } from './database.types'
import { redirect } from 'next/navigation'

export type UserRole = Database['public']['Enums']['membership_role']
export type TicketStatus = Database['public']['Enums']['ticket_status']
export type TicketPriority = Database['public']['Enums']['ticket_priority']

export interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

export interface UserMembership {
  id: string
  org_id: string
  role: UserRole
  is_active: boolean
  organization: {
    id: string
    name: string
    slug: string
    is_active: boolean
  }
}

export interface AuthUser {
  profile: UserProfile
  memberships: UserMembership[]
  currentOrg?: UserMembership
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return null
  }

  // Ottieni il profilo utente
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return null
  }

  // Ottieni le membership dell'utente
  const { data: memberships } = await supabase
    .from('memberships')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('user_id', profile.id)
    .eq('is_active', true)

  return {
    profile,
    memberships: memberships || [],
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireRole(
  requiredRoles: UserRole[],
  orgId?: string
): Promise<AuthUser> {
  const user = await requireAuth()
  
  // Super admin può accedere a tutto
  const isSuperAdmin = user.memberships.some(
    m => m.role === 'SUPER_ADMIN' && m.is_active
  )
  
  if (isSuperAdmin) {
    return user
  }
  
  // Controlla il ruolo per l'organizzazione specifica
  if (orgId) {
    const hasRole = user.memberships.some(
      m => m.org_id === orgId && requiredRoles.includes(m.role) && m.is_active
    )
    
    if (!hasRole) {
      redirect('/unauthorized')
    }
  } else {
    // Controlla se ha il ruolo in almeno una organizzazione
    const hasRole = user.memberships.some(
      m => requiredRoles.includes(m.role) && m.is_active
    )
    
    if (!hasRole) {
      redirect('/unauthorized')
    }
  }
  
  return user
}

export async function requireSuperAdmin(): Promise<AuthUser> {
  return requireRole(['SUPER_ADMIN'])
}

export async function requireAdminOrSuperAdmin(orgId?: string): Promise<AuthUser> {
  return requireRole(['ADMIN_AZIENDA', 'SUPER_ADMIN'], orgId)
}

export function hasRole(user: AuthUser, roles: UserRole[], orgId?: string): boolean {
  // Super admin può accedere a tutto
  const isSuperAdmin = user.memberships.some(
    m => m.role === 'SUPER_ADMIN' && m.is_active
  )
  
  if (isSuperAdmin) {
    return true
  }
  
  if (orgId) {
    return user.memberships.some(
      m => m.org_id === orgId && roles.includes(m.role) && m.is_active
    )
  }
  
  return user.memberships.some(
    m => roles.includes(m.role) && m.is_active
  )
}

export function isSuperAdmin(user: AuthUser): boolean {
  return hasRole(user, ['SUPER_ADMIN'])
}

export function isAdminOrSuperAdmin(user: AuthUser, orgId?: string): boolean {
  return hasRole(user, ['ADMIN_AZIENDA', 'SUPER_ADMIN'], orgId)
}

export function getUserOrganizations(user: AuthUser): UserMembership[] {
  return user.memberships.filter(m => m.is_active)
}

export function getCurrentOrganization(user: AuthUser, orgSlug?: string): UserMembership | null {
  if (!orgSlug) {
    return user.memberships.find(m => m.is_active) || null
  }
  
  return user.memberships.find(
    m => m.organization.slug === orgSlug && m.is_active
  ) || null
}
