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
import { createClient } from '@/lib/supabase/server'
import { requireAdminOrSuperAdmin, getCurrentOrganization } from '@/lib/auth'
import { Clock, MapPin, Search, Calendar, Download, User, Timer } from 'lucide-react'
import { notFound } from 'next/navigation'
import { format, startOfDay, endOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { formatShiftDuration } from '@/lib/chat-commands'

interface ShiftsPageProps {
  params: { orgSlug: string }
  searchParams: { 
    date?: string
    user?: string
    status?: string
  }
}

export default async function ShiftsPage({ params, searchParams }: ShiftsPageProps) {
  const user = await requireAdminOrSuperAdmin()
  const currentOrg = getCurrentOrganization(user, params.orgSlug)
  
  if (!currentOrg) {
    notFound()
  }

  const supabase = await createClient()
  const selectedDate = searchParams.date ? new Date(searchParams.date) : new Date()

  // Costruisci la query per i turni
  let query = supabase
    .from('shifts')
    .select(`
      *,
      user:profiles(full_name, email, avatar_url)
    `)
    .eq('org_id', currentOrg.org_id)

  // Filtri
  if (searchParams.date) {
    const startDate = startOfDay(selectedDate).toISOString()
    const endDate = endOfDay(selectedDate).toISOString()
    query = query.gte('start_at', startDate).lte('start_at', endDate)
  } else {
    // Default: turni di oggi
    const startDate = startOfDay(new Date()).toISOString()
    const endDate = endOfDay(new Date()).toISOString()
    query = query.gte('start_at', startDate).lte('start_at', endDate)
  }

  if (searchParams.user) {
    query = query.eq('user_id', searchParams.user)
  }

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: shifts } = await query.order('start_at', { ascending: false })

  // Ottieni lista utenti per il filtro
  const { data: users } = await supabase
    .from('memberships')
    .select(`
      user_id,
      profile:profiles(id, full_name, email)
    `)
    .eq('org_id', currentOrg.org_id)
    .eq('is_active', true)

  // Statistiche del giorno
  const todayShifts = shifts || []
  const activeShifts = todayShifts.filter(s => s.status === 'aperto')
  const completedShifts = todayShifts.filter(s => s.status === 'chiuso')
  const totalHours = completedShifts.reduce((acc, shift) => {
    return acc + (shift.duration_minutes || 0)
  }, 0)

  const getStatusBadge = (status: string) => {
    return status === 'aperto' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    return status === 'aperto' ? 'In corso' : 'Completato'
  }

  const formatGeolocation = (geo: any) => {
    if (!geo || !geo.lat || !geo.lon) return 'N/A'
    return `${geo.lat.toFixed(6)}, ${geo.lon.toFixed(6)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Turni</h1>
          <p className="text-muted-foreground">
            Monitora i turni di lavoro dei dipendenti
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Esporta CSV
        </Button>
      </div>

      {/* Statistiche del giorno */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turni Oggi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayShifts.length}</div>
            <p className="text-xs text-muted-foreground">
              Turni registrati oggi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Corso</CardTitle>
            <User className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeShifts.length}</div>
            <p className="text-xs text-muted-foreground">
              Dipendenti in servizio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completati</CardTitle>
            <Timer className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedShifts.length}</div>
            <p className="text-xs text-muted-foreground">
              Turni terminati
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ore Totali</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalHours / 60)}h</div>
            <p className="text-xs text-muted-foreground">
              Ore lavorate oggi
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
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-8"
                  defaultValue={format(selectedDate, 'yyyy-MM-dd')}
                />
              </div>
            </div>
            <Select defaultValue={searchParams.user}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tutti i dipendenti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutti i dipendenti</SelectItem>
                {users?.map((membership) => (
                  <SelectItem key={membership.user_id} value={membership.user_id}>
                    {membership.profile?.full_name || membership.profile?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue={searchParams.status}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tutti gli stati" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutti gli stati</SelectItem>
                <SelectItem value="aperto">In corso</SelectItem>
                <SelectItem value="chiuso">Completato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabella turni */}
      <Card>
        <CardHeader>
          <CardTitle>Turni del {format(selectedDate, 'dd MMMM yyyy', { locale: it })}</CardTitle>
          <CardDescription>
            {shifts?.length || 0} turni trovati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dipendente</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Inizio</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead>Durata</TableHead>
                  <TableHead>Posizione Inizio</TableHead>
                  <TableHead>Posizione Fine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts?.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{shift.employee_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {shift.user?.full_name || shift.user?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(shift.status)}>
                        {getStatusLabel(shift.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(shift.start_at), 'HH:mm', { locale: it })}
                    </TableCell>
                    <TableCell>
                      {shift.end_at 
                        ? format(new Date(shift.end_at), 'HH:mm', { locale: it })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {shift.duration_minutes 
                        ? formatShiftDuration(shift.duration_minutes)
                        : shift.status === 'aperto' 
                          ? 'In corso...'
                          : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-mono">
                          {formatGeolocation(shift.start_geo)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.end_geo ? (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-mono">
                            {formatGeolocation(shift.end_geo)}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!shifts?.length && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nessun turno trovato per la data selezionata
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Turni attivi in tempo reale */}
      {activeShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Turni Attivi in Tempo Reale</CardTitle>
            <CardDescription>
              Dipendenti attualmente in servizio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeShifts.map((shift) => {
                const startTime = new Date(shift.start_at)
                const currentDuration = Math.round((new Date().getTime() - startTime.getTime()) / (1000 * 60))
                
                return (
                  <Card key={shift.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{shift.employee_name}</h4>
                        <Badge className="bg-green-100 text-green-800">
                          🟢 In servizio
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Inizio: {format(startTime, 'HH:mm', { locale: it })}</p>
                        <p>Durata: {formatShiftDuration(currentDuration)}</p>
                        {shift.start_geo && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs">
                              Posizione registrata
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
