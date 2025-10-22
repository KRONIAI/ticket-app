import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, getCurrentOrganization } from '@/lib/auth'
import { Plus, Search, MessageSquare, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { getSLAStatus, getSLABadgeColor } from '@/lib/sla'

interface UserTicketsPageProps {
  params: { orgSlug: string }
  searchParams: { 
    status?: string
    search?: string
  }
}

export default async function UserTicketsPage({ params, searchParams }: UserTicketsPageProps) {
  const user = await requireAuth()
  const currentOrg = getCurrentOrganization(user, params.orgSlug)
  
  if (!currentOrg) {
    notFound()
  }

  const supabase = await createClient()

  // Costruisci la query per i ticket dell'utente
  let query = supabase
    .from('tickets')
    .select(`
      *,
      service:services(name),
      assigned_to:profiles!tickets_assigned_to_fkey(full_name, email)
    `)
    .eq('org_id', currentOrg.org_id)
    .eq('created_by', user.profile.id)

  // Applica filtri
  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.search) {
    query = query.textSearch('title,description', searchParams.search)
  }

  const { data: tickets } = await query.order('created_at', { ascending: false })

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Le Mie Richieste</h1>
          <p className="text-muted-foreground">
            Gestisci tutte le tue richieste di assistenza
          </p>
        </div>
        <Button asChild>
          <Link href={`/app/${params.orgSlug}/tickets/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova Richiesta
          </Link>
        </Button>
      </div>

      {/* Statistiche rapide */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totali</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Risolte</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca nelle tue richieste..."
                  className="pl-8"
                  defaultValue={searchParams.search}
                />
              </div>
            </div>
            <Select defaultValue={searchParams.status}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tutti gli stati" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutti gli stati</SelectItem>
                <SelectItem value="aperto">Aperto</SelectItem>
                <SelectItem value="in_lavorazione">In Lavorazione</SelectItem>
                <SelectItem value="in_attesa">In Attesa</SelectItem>
                <SelectItem value="risolto">Risolto</SelectItem>
                <SelectItem value="chiuso">Chiuso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista ticket */}
      <div className="space-y-4">
        {tickets?.map((ticket) => {
          const slaStatus = ticket.sla_due_at ? getSLAStatus(new Date(ticket.sla_due_at)) : null
          return (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start justify-between">
                      <Link 
                        href={`/app/${params.orgSlug}/tickets/${ticket.id}`}
                        className="text-lg font-semibold hover:underline"
                      >
                        {ticket.title}
                      </Link>
                      <div className="flex items-center space-x-2 ml-4">
                        <Badge className={getPriorityBadge(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Badge className={getStatusBadge(ticket.status)}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                        {slaStatus && (
                          <Badge className={getSLABadgeColor(slaStatus)}>
                            {slaStatus === 'overdue' ? 'SLA Scaduto' : 
                             slaStatus === 'warning' ? 'SLA in Scadenza' : 'SLA OK'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {ticket.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {ticket.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {ticket.service && (
                        <>
                          <span>{ticket.service.name}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>Creato {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: it })}</span>
                      {ticket.assigned_to && (
                        <>
                          <span>•</span>
                          <span>Assegnato a {ticket.assigned_to.full_name || ticket.assigned_to.email}</span>
                        </>
                      )}
                      {ticket.sla_due_at && (
                        <>
                          <span>•</span>
                          <span>Scadenza SLA: {format(new Date(ticket.sla_due_at), 'dd MMM HH:mm', { locale: it })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>Ultimo aggiornamento: {format(new Date(ticket.updated_at), 'dd MMM HH:mm', { locale: it })}</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/app/${params.orgSlug}/tickets/${ticket.id}`}>
                      Visualizza
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!tickets?.length && (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessuna richiesta trovata</h3>
            <p className="text-muted-foreground mb-4">
              {searchParams.status || searchParams.search 
                ? 'Nessuna richiesta corrisponde ai filtri selezionati.'
                : 'Non hai ancora creato nessuna richiesta.'
              }
            </p>
            <Button asChild>
              <Link href={`/app/${params.orgSlug}/tickets/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Crea la tua prima richiesta
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
