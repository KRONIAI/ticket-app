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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Users, Settings } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default async function OrganizationsPage() {
  const supabase = await createClient()

  // Ottieni tutte le organizzazioni con statistiche
  const { data: organizations } = await supabase
    .from('organizations')
    .select(`
      *,
      memberships(count),
      tickets(count)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Organizzazioni</h1>
          <p className="text-muted-foreground">
            Gestisci tutte le aziende registrate nel sistema
          </p>
        </div>
        <Button asChild>
          <Link href="/superadmin/organizations/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Organizzazione
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tutte le Organizzazioni</CardTitle>
          <CardDescription>
            Elenco completo delle aziende registrate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barra di ricerca */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca organizzazioni..."
                className="pl-8"
              />
            </div>
          </div>

          {/* Tabella organizzazioni */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Utenti</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Creata il</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations?.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        /{org.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.is_active ? 'default' : 'secondary'}>
                        {org.is_active ? 'Attiva' : 'Inattiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{org.memberships?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <span>{org.tickets?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(org.created_at), 'dd MMM yyyy', { locale: it })}
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
                            <Link href={`/superadmin/organizations/${org.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifica
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/superadmin/organizations/${org.id}/users`}>
                              <Users className="mr-2 h-4 w-4" />
                              Gestisci Utenti
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/superadmin/organizations/${org.id}/services`}>
                              <Settings className="mr-2 h-4 w-4" />
                              Servizi
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

          {!organizations?.length && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nessuna organizzazione trovata
              </p>
              <Button asChild className="mt-4">
                <Link href="/superadmin/organizations/new">
                  Crea la prima organizzazione
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
