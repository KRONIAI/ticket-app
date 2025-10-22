import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Settings, Building2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default async function ServicesPage() {
  const supabase = await createClient()

  // Ottieni tutti i servizi con statistiche di utilizzo
  const { data: services } = await supabase
    .from('services')
    .select(`
      *,
      org_services(
        count,
        organization:organizations(name)
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catalogo Servizi Globale</h1>
          <p className="text-muted-foreground">
            Gestisci i servizi disponibili per tutte le organizzazioni
          </p>
        </div>
        <Button asChild>
          <Link href="/superadmin/services/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Servizio
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tutti i Servizi</CardTitle>
          <CardDescription>
            Elenco completo dei servizi disponibili nel sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barra di ricerca */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca servizi..."
                className="pl-8"
              />
            </div>
          </div>

          {/* Tabella servizi */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Chiave</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Organizzazioni</TableHead>
                  <TableHead>Creato il</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {service.key}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {service.description || 'Nessuna descrizione'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? 'default' : 'secondary'}>
                        {service.is_active ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{service.org_services?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(service.created_at), 'dd MMM yyyy', { locale: it })}
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
                            <Link href={`/superadmin/services/${service.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifica
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/superadmin/services/${service.id}/form-builder`}>
                              <Settings className="mr-2 h-4 w-4" />
                              Form Builder
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/superadmin/services/${service.id}/organizations`}>
                              <Building2 className="mr-2 h-4 w-4" />
                              Organizzazioni
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!services?.length && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nessun servizio trovato
              </p>
              <Button asChild className="mt-4">
                <Link href="/superadmin/services/new">
                  Crea il primo servizio
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Servizi predefiniti suggeriti */}
      <Card>
        <CardHeader>
          <CardTitle>Servizi Predefiniti Suggeriti</CardTitle>
          <CardDescription>
            Servizi comuni che puoi aggiungere rapidamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: 'Richiesta Noleggio Lungo Termine',
                key: 'noleggio-lungo-termine',
                description: 'Gestione richieste per noleggio veicoli a lungo termine'
              },
              {
                name: 'Richiesta Telepass',
                key: 'richiesta-telepass',
                description: 'Richieste per dispositivi Telepass aziendali'
              },
              {
                name: 'Richiesta Carburante',
                key: 'richiesta-carburante',
                description: 'Gestione richieste per carte carburante'
              },
              {
                name: 'Supporto IT',
                key: 'supporto-it',
                description: 'Assistenza tecnica e supporto informatico'
              },
              {
                name: 'Richiesta Ferie',
                key: 'richiesta-ferie',
                description: 'Gestione richieste di permessi e ferie'
              },
              {
                name: 'Manutenzione Ufficio',
                key: 'manutenzione-ufficio',
                description: 'Segnalazioni per manutenzione e facility management'
              }
            ].map((template) => (
              <Card key={template.key} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">{template.name}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Aggiungi Servizio
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
