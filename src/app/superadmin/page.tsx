import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { Building2, Users, Ticket, TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function SuperAdminDashboard() {
  const supabase = await createClient()

  // Statistiche generali
  const [
    { count: totalOrgs },
    { count: totalUsers },
    { count: totalTickets },
    { count: activeTickets }
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('tickets').select('*', { count: 'exact', head: true }),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).neq('status', 'chiuso')
  ])

  // Organizzazioni recenti
  const { data: recentOrgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  // Ticket recenti
  const { data: recentTickets } = await supabase
    .from('tickets')
    .select(`
      *,
      organization:organizations(name, slug),
      created_by:profiles!tickets_created_by_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = [
    {
      title: 'Organizzazioni Totali',
      value: totalOrgs || 0,
      description: 'Aziende registrate',
      icon: Building2,
      color: 'text-blue-600'
    },
    {
      title: 'Utenti Totali',
      value: totalUsers || 0,
      description: 'Utenti registrati',
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'Ticket Totali',
      value: totalTickets || 0,
      description: 'Ticket creati',
      icon: Ticket,
      color: 'text-purple-600'
    },
    {
      title: 'Ticket Attivi',
      value: activeTickets || 0,
      description: 'Ticket non chiusi',
      icon: TrendingUp,
      color: 'text-orange-600'
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Super Admin</h1>
          <p className="text-muted-foreground">
            Panoramica generale del sistema di ticketing
          </p>
        </div>
        <Button asChild>
          <Link href="/superadmin/organizations/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Organizzazione
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
        {/* Organizzazioni Recenti */}
        <Card>
          <CardHeader>
            <CardTitle>Organizzazioni Recenti</CardTitle>
            <CardDescription>
              Ultime aziende registrate nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrgs?.map((org) => (
                <div key={org.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">/{org.slug}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={org.is_active ? 'default' : 'secondary'}>
                      {org.is_active ? 'Attiva' : 'Inattiva'}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/superadmin/organizations/${org.id}`}>
                        Visualizza
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {!recentOrgs?.length && (
                <p className="text-sm text-muted-foreground">
                  Nessuna organizzazione trovata
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ticket Recenti */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Recenti</CardTitle>
            <CardDescription>
              Ultimi ticket creati nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets?.map((ticket) => (
                <div key={ticket.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.organization?.name} • {ticket.created_by?.full_name || ticket.created_by?.email}
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
      </div>
    </div>
  )
}
