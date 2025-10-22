import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, getCurrentOrganization } from '@/lib/auth'
import { Plus, Ticket, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface UserDashboardProps {
  params: Promise<{ orgSlug: string }>
}

export default async function UserDashboard({ params }: UserDashboardProps) {
  const user = await requireAuth()
  const { orgSlug } = await params
  const currentOrg = getCurrentOrganization(user, orgSlug)
  
  if (!currentOrg) {
    notFound()
  }

  const supabase = await createClient()

  // Ottieni i servizi attivi per l'organizzazione
  const { data: orgServices } = await supabase
    .from('org_services')
    .select(`
      *,
      service:services(*)
    `)
    .eq('org_id', currentOrg.org_id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  // Ottieni i ticket dell'utente
  const { data: userTickets } = await supabase
    .from('tickets')
    .select(`
      *,
      service:services(name),
      assigned_to:profiles!tickets_assigned_to_fkey(full_name, email)
    `)
    .eq('org_id', currentOrg.org_id)
    .eq('created_by', user.profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Statistiche utente
  const { count: totalTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', currentOrg.org_id)
    .eq('created_by', user.profile.id)

  const { count: openTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', currentOrg.org_id)
    .eq('created_by', user.profile.id)
    .neq('status', 'chiuso')

  const { count: resolvedTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', currentOrg.org_id)
    .eq('created_by', user.profile.id)
    .eq('status', 'risolto')

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

  const getStatusLabel = (status: string) => {
    const labels = {
      aperto: 'Aperto',
      in_lavorazione: 'In Lavorazione',
      in_attesa: 'In Attesa',
      risolto: 'Risolto',
      chiuso: 'Chiuso'
    }
    return labels[status as keyof typeof labels] || status
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
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Benvenuto, {user.profile.full_name || 'Utente'}
        </h1>
        <p className="text-xl text-muted-foreground">
          Gestisci le tue richieste in {currentOrg.organization.name}
        </p>
      </div>

      {/* Statistiche rapide */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Totali</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Richieste create
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Corso</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Da completare
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risolti</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completati
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Servizi disponibili */}
      <Card>
        <CardHeader>
          <CardTitle>Servizi Disponibili</CardTitle>
          <CardDescription>
            Seleziona un servizio per creare una nuova richiesta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgServices?.map((orgService) => (
              <Card key={orgService.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{orgService.service.name}</h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {orgService.service.description && (
                      <p className="text-sm text-muted-foreground">
                        {orgService.service.description}
                      </p>
                    )}
                    <Button asChild className="w-full">
                      <Link href={`/app/${orgSlug}/tickets/new?service=${orgService.service.id}`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Crea Richiesta
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!orgServices?.length && (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nessun servizio disponibile</h3>
              <p className="text-muted-foreground">
                Contatta l'amministratore per attivare i servizi per la tua organizzazione.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* I miei ticket recenti */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Le Mie Richieste</CardTitle>
              <CardDescription>
                Ultime richieste create
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/app/${orgSlug}/tickets`}>
                Vedi Tutte
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userTickets?.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Link 
                    href={`/app/${orgSlug}/tickets/${ticket.id}`}
                    className="font-medium hover:underline"
                  >
                    {ticket.title}
                  </Link>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>{ticket.service?.name || 'Servizio generico'}</span>
                    <span>•</span>
                    <span>{format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: it })}</span>
                    {ticket.assigned_to && (
                      <>
                        <span>•</span>
                        <span>Assegnato a {ticket.assigned_to.full_name || ticket.assigned_to.email}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getPriorityBadge(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                  <Badge className={getStatusBadge(ticket.status)}>
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {!userTickets?.length && (
            <div className="text-center py-8">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nessuna richiesta ancora</h3>
              <p className="text-muted-foreground mb-4">
                Inizia creando la tua prima richiesta utilizzando uno dei servizi disponibili.
              </p>
              <Button asChild>
                <Link href={`/app/${orgSlug}/tickets/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crea Prima Richiesta
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
