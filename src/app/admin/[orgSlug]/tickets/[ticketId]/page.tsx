import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrSuperAdmin, getCurrentOrganization } from '@/lib/auth'
import { ArrowLeft, Edit, Clock, User, Calendar, Tag, Paperclip } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { getSLAStatus, getSLABadgeColor } from '@/lib/sla'
import { TicketChat } from '@/components/tickets/ticket-chat'

interface TicketDetailProps {
  params: { 
    orgSlug: string
    ticketId: string 
  }
}

export default async function TicketDetail({ params }: TicketDetailProps) {
  const user = await requireAdminOrSuperAdmin()
  const currentOrg = getCurrentOrganization(user, params.orgSlug)
  
  if (!currentOrg) {
    notFound()
  }

  const supabase = await createClient()

  // Ottieni il ticket con tutti i dettagli
  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      *,
      created_by:profiles!tickets_created_by_fkey(full_name, email, avatar_url),
      assigned_to:profiles!tickets_assigned_to_fkey(full_name, email, avatar_url),
      service:services(name, key, description),
      attachments(*)
    `)
    .eq('id', params.ticketId)
    .eq('org_id', currentOrg.org_id)
    .single()

  if (!ticket) {
    notFound()
  }

  // Ottieni i messaggi del ticket
  const { data: messages } = await supabase
    .from('ticket_messages')
    .select(`
      *,
      author:profiles(full_name, email, avatar_url)
    `)
    .eq('ticket_id', params.ticketId)
    .order('created_at', { ascending: true })

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

  const slaStatus = ticket.sla_due_at ? getSLAStatus(new Date(ticket.sla_due_at)) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/${params.orgSlug}/tickets`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna ai Ticket
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{ticket.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>#{ticket.id.slice(0, 8)}</span>
            <span>•</span>
            <span>Creato {format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: it })}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/${params.orgSlug}/tickets/${ticket.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Modifica
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contenuto principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dettagli ticket */}
          <Card>
            <CardHeader>
              <CardTitle>Dettagli Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.description && (
                <div>
                  <h4 className="font-medium mb-2">Descrizione</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
              )}

              {ticket.form_data && Object.keys(ticket.form_data as object).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Dati Aggiuntivi</h4>
                  <div className="space-y-2">
                    {Object.entries(ticket.form_data as object).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tag</h4>
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Allegati</h4>
                  <div className="space-y-2">
                    {ticket.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span>{attachment.file_name}</span>
                        <span className="text-muted-foreground">
                          ({Math.round((attachment.file_size || 0) / 1024)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat */}
          <Card id="chat">
            <CardHeader>
              <CardTitle>Conversazione</CardTitle>
              <CardDescription>
                Comunica con il richiedente e il team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketChat 
                ticketId={ticket.id}
                orgId={currentOrg.org_id}
                currentUser={user}
                initialMessages={messages || []}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stato e priorità */}
          <Card>
            <CardHeader>
              <CardTitle>Stato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Stato attuale</span>
                <Badge className={getStatusBadge(ticket.status)}>
                  {getStatusLabel(ticket.status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Priorità</span>
                <Badge className={getPriorityBadge(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>
              {slaStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SLA</span>
                  <Badge className={getSLABadgeColor(slaStatus)}>
                    {slaStatus === 'overdue' ? 'Scaduto' : 
                     slaStatus === 'warning' ? 'In scadenza' : 'Nei tempi'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Persone */}
          <Card>
            <CardHeader>
              <CardTitle>Persone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Richiedente</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.created_by?.full_name || ticket.created_by?.email}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Assegnato a</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.assigned_to?.full_name || ticket.assigned_to?.email || 'Non assegnato'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informazioni */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.service && (
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Servizio</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.service.name}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Creato il</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: it })}
                  </p>
                </div>
              </div>
              {ticket.sla_due_at && (
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Scadenza SLA</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(ticket.sla_due_at), 'dd MMM yyyy HH:mm', { locale: it })}
                    </p>
                  </div>
                </div>
              )}
              {ticket.resolved_at && (
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Risolto il</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(ticket.resolved_at), 'dd MMM yyyy HH:mm', { locale: it })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
