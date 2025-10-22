import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrSuperAdmin, getCurrentOrganization } from '@/lib/auth'
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, MessageSquare, Clock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { getSLAStatus, getSLABadgeColor } from '@/lib/sla'

interface TicketsPageProps {
  params: { orgSlug: string }
  searchParams: { 
    status?: string
    priority?: string
    search?: string
    view?: 'table' | 'kanban'
  }
}

export default async function TicketsPage({ params, searchParams }: TicketsPageProps) {
  const user = await requireAdminOrSuperAdmin()
  const currentOrg = getCurrentOrganization(user, params.orgSlug)
  
  if (!currentOrg) {
    notFound()
  }

  const supabase = await createClient()
  const view = searchParams.view || 'table'

  // Costruisci la query per i ticket
  let query = supabase
    .from('tickets')
    .select(`
      *,
      created_by:profiles!tickets_created_by_fkey(full_name, email),
      assigned_to:profiles!tickets_assigned_to_fkey(full_name, email),
      service:services(name, key)
    `)
    .eq('org_id', currentOrg.org_id)

  // Applica filtri
  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.priority) {
    query = query.eq('priority', searchParams.priority)
  }
  if (searchParams.search) {
    query = query.textSearch('title,description', searchParams.search)
  }

  const { data: tickets } = await query.order('created_at', { ascending: false })

  // Statistiche per i filtri
  const { data: statusCounts } = await supabase
    .from('tickets')
    .select('status')
    .eq('org_id', currentOrg.org_id)

  const statusStats = statusCounts?.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Ticket</h1>
          <p className="text-muted-foreground">
            Gestisci tutti i ticket dell'organizzazione
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/${params.orgSlug}/tickets/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Ticket
          </Link>
        </Button>
      </div>

      {/* Filtri e ricerca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca ticket..."
                  className="pl-8"
                  defaultValue={searchParams.search}
                />
              </div>
            </div>
            <Select defaultValue={searchParams.status}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutti gli stati</SelectItem>
                <SelectItem value="aperto">Aperto ({statusStats.aperto || 0})</SelectItem>
                <SelectItem value="in_lavorazione">In Lavorazione ({statusStats.in_lavorazione || 0})</SelectItem>
                <SelectItem value="in_attesa">In Attesa ({statusStats.in_attesa || 0})</SelectItem>
                <SelectItem value="risolto">Risolto ({statusStats.risolto || 0})</SelectItem>
                <SelectItem value="chiuso">Chiuso ({statusStats.chiuso || 0})</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue={searchParams.priority}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Priorità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutte le priorità</SelectItem>
                <SelectItem value="bassa">Bassa</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Critica</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtri Avanzati
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vista Tabella/Kanban */}
      <Tabs value={view} className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Vista Tabella</TabsTrigger>
          <TabsTrigger value="kanban">Vista Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tutti i Ticket</CardTitle>
              <CardDescription>
                {tickets?.length || 0} ticket trovati
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Priorità</TableHead>
                      <TableHead>Servizio</TableHead>
                      <TableHead>Assegnato a</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Creato il</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets?.map((ticket) => {
                      const slaStatus = ticket.sla_due_at ? getSLAStatus(new Date(ticket.sla_due_at)) : null
                      return (
                        <TableRow key={ticket.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <Link 
                                href={`/admin/${params.orgSlug}/tickets/${ticket.id}`}
                                className="font-medium hover:underline"
                              >
                                {ticket.title}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {ticket.created_by?.full_name || ticket.created_by?.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(ticket.status)}>
                              {getStatusLabel(ticket.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityBadge(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ticket.service?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {ticket.assigned_to?.full_name || ticket.assigned_to?.email || 'Non assegnato'}
                          </TableCell>
                          <TableCell>
                            {slaStatus && (
                              <Badge className={getSLABadgeColor(slaStatus)}>
                                {slaStatus === 'overdue' ? 'Scaduto' : 
                                 slaStatus === 'warning' ? 'In scadenza' : 'Nei tempi'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: it })}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/${params.orgSlug}/tickets/${ticket.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Visualizza
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/${params.orgSlug}/tickets/${ticket.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Modifica
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/${params.orgSlug}/tickets/${ticket.id}#chat`}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Chat
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {!tickets?.length && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nessun ticket trovato con i filtri selezionati
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {['aperto', 'in_lavorazione', 'in_attesa', 'risolto', 'chiuso'].map((status) => {
              const statusTickets = tickets?.filter(t => t.status === status) || []
              return (
                <Card key={status}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {getStatusLabel(status)} ({statusTickets.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {statusTickets.map((ticket) => (
                      <Card key={ticket.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                        <Link href={`/admin/${params.orgSlug}/tickets/${ticket.id}`}>
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">{ticket.title}</h4>
                            <div className="flex items-center justify-between">
                              <Badge className={getPriorityBadge(ticket.priority)} size="sm">
                                {ticket.priority}
                              </Badge>
                              {ticket.sla_due_at && (
                                <Clock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {ticket.assigned_to?.full_name || 'Non assegnato'}
                            </p>
                          </div>
                        </Link>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
