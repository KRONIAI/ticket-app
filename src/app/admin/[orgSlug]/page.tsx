import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrSuperAdmin, getCurrentOrganization } from '@/lib/auth'
import { Ticket, Users, Clock, TrendingUp, Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSLAStatus, getSLABadgeColor } from '@/lib/sla'

interface AdminDashboardProps {
  params: Promise<{ orgSlug: string }>
}

export default async function AdminDashboard({ params }: AdminDashboardProps) {
  const user = await requireAdminOrSuperAdmin()
  const { orgSlug } = await params
  const currentOrg = getCurrentOrganization(user, orgSlug)
  
  if (!currentOrg) {
    notFound()
  }

  const supabase = await createClient()

  // Statistiche dell'organizzazione
  const [
    { count: totalTickets },
    { count: openTickets },
    { count: totalUsers },
    { count: todayShifts }
  ] = await Promise.all([
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('org_id', currentOrg.org_id),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('org_id', currentOrg.org_id).neq('status', 'chiuso'),
    supabase.from('memberships').select('*', { count: 'exact', head: true }).eq('org_id', currentOrg.org_id).eq('is_active', true),
    supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('org_id', currentOrg.org_id).gte('created_at', new Date().toISOString().split('T')[0])
  ])

  // Ticket recenti
  const { data: recentTickets } = await supabase
    .from('tickets')
    .select(`
      *,
      created_by:profiles!tickets_created_by_fkey(full_name, email),
      assigned_to:profiles!tickets_assigned_to_fkey(full_name, email)
    `)
    .eq('org_id', currentOrg.org_id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Ticket in scadenza SLA
  const { data: slaTickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('org_id', currentOrg.org_id)
    .not('status', 'in', '(risolto,chiuso)')
    .not('sla_due_at', 'is', null)
    .order('sla_due_at', { ascending: true })
    .limit(5)

  // Turni attivi oggi
  const { data: activeShifts } = await supabase
    .from('shifts')
    .select(`
      *,
      user:profiles(full_name, email)
    `)
    .eq('org_id', currentOrg.org_id)
    .eq('status', 'aperto')
    .gte('start_at', new Date().toISOString().split('T')[0])

  const stats = [
    {
      title: 'Ticket Totali',
      value: totalTickets || 0,
      description: 'Tutti i ticket',
      icon: Ticket,
      color: 'text-blue-600'
    },
    {
      title: 'Ticket Aperti',
      value: openTickets || 0,
      description: 'Da gestire',
      icon: AlertTriangle,
      color: 'text-orange-600'
    },
    {
      title: 'Utenti Attivi',
      value: totalUsers || 0,
      description: 'Membri del team',
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'Turni Oggi',
      value: todayShifts || 0,
      description: 'Turni registrati',
      icon: Clock,
      color: 'text-purple-600'
    }
  ]

  const getStatusBadge = (status: string) => {
    const colors = {
      aperto: 'bg-blue-100 text-blue-800',
      in_lavorazione: 'bg-yellow-100 text-yellow-800',
      in_attesa: 'bg-orange-100 text-orange-800',
      risolto: 'bg-green-100 text-green-800',
      chiuso: 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      bassa: 'bg-gray-100 text-gray-800',
      media: 'bg-blue-100 text-blue-800',
      alta: 'bg-orange-100 text-orange-800',
      critica: 'bg-red-100 text-red-800'
    }
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard {currentOrg.organization.name}</h1>
          <p className="text-muted-foreground">
            Panoramica dell'attività dell'organizzazione
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/${orgSlug}/tickets/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Ticket
          </Link>
        </Button>
      </div>

      {/* Statistiche */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Ticket Recenti */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Recenti</CardTitle>
            <CardDescription>
              Ultimi ticket creati nell'organizzazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets?.map((ticket) => (
                <div key={ticket.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Link 
                        href={`/admin/${orgSlug}/tickets/${ticket.id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {ticket.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {ticket.created_by?.full_name || ticket.created_by?.email}
                        {ticket.assigned_to && ` → ${ticket.assigned_to.full_name || ticket.assigned_to.email}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge className={getStatusBadge(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityBadge(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {!recentTickets?.length && (
                <p className="text-sm text-muted-foreground">
                  Nessun ticket trovato
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SLA in Scadenza */}
        <Card>
          <CardHeader>
            <CardTitle>SLA in Scadenza</CardTitle>
            <CardDescription>
              Ticket che richiedono attenzione urgente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slaTickets?.map((ticket) => {
                const slaStatus = getSLAStatus(new Date(ticket.sla_due_at!))
                return (
                  <div key={ticket.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <Link 
                          href={`/admin/${orgSlug}/tickets/${ticket.id}`}
                          className="font-medium text-sm hover:underline"
                        >
                          {ticket.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Scadenza: {new Date(ticket.sla_due_at!).toLocaleString('it-IT')}
                        </p>
                      </div>
                      <Badge className={getSLABadgeColor(slaStatus)}>
                        {slaStatus === 'overdue' ? 'Scaduto' : 
                         slaStatus === 'warning' ? 'In scadenza' : 'Nei tempi'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
              {!slaTickets?.length && (
                <p className="text-sm text-muted-foreground">
                  Nessun ticket in scadenza
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turni Attivi */}
      {activeShifts && activeShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Turni Attivi Oggi</CardTitle>
            <CardDescription>
              Dipendenti attualmente in servizio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeShifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{shift.employee_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Inizio: {new Date(shift.start_at).toLocaleTimeString('it-IT', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    In servizio
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
