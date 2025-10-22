import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAuthUser } from '@/lib/auth'
import { Ticket, Mail, Users, Building2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function WelcomePage() {
  const user = await getAuthUser()
  
  if (!user) {
    redirect('/login')
  }

  // Se l'utente ha già delle membership, reindirizza
  if (user.memberships.length > 0) {
    const superAdmin = user.memberships.find(m => m.role === 'SUPER_ADMIN' && m.is_active)
    const adminMembership = user.memberships.find(m => m.role === 'ADMIN_AZIENDA' && m.is_active)
    const userMembership = user.memberships.find(m => m.role === 'UTENTE' && m.is_active)

    if (superAdmin) {
      redirect('/superadmin')
    } else if (adminMembership) {
      redirect(`/admin/${adminMembership.organization.slug}`)
    } else if (userMembership) {
      redirect(`/app/${userMembership.organization.slug}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center space-x-3">
              <Ticket className="h-12 w-12 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">TicketApp</h1>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700">
            Benvenuto, {user.profile.full_name || 'Utente'}!
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Il tuo account è stato creato con successo. Per iniziare a utilizzare TicketApp, 
            devi essere invitato a un'organizzazione da un amministratore.
          </p>
        </div>

        {/* Stato Account */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Stato del tuo Account</span>
            </CardTitle>
            <CardDescription>
              Informazioni sul tuo accesso alle organizzazioni
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div>
                  <p className="font-medium text-yellow-800">In attesa di invito</p>
                  <p className="text-sm text-yellow-600">
                    Non sei ancora membro di nessuna organizzazione
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">I tuoi dati:</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nome:</span>
                  <span className="font-medium">{user.profile.full_name || 'Non specificato'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{user.profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account creato:</span>
                  <span className="font-medium">
                    {new Date(user.profile.created_at).toLocaleDateString('it-IT')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prossimi Passi */}
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <span>Attendi l'Invito</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Un amministratore della tua organizzazione ti inviterà via email. 
                Controlla la tua casella di posta elettronica.
              </p>
              <div className="text-sm text-gray-500">
                <p>L'invito conterrà:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Link per accedere all'organizzazione</li>
                  <li>Il tuo ruolo assegnato</li>
                  <li>Istruzioni per iniziare</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-green-600" />
                <span>Contatta l'Amministratore</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Se conosci l'amministratore della tua organizzazione, 
                contattalo direttamente per richiedere l'accesso.
              </p>
              <div className="text-sm text-gray-500">
                <p>Fornisci queste informazioni:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>La tua email: <code className="bg-gray-100 px-1 rounded">{user.profile.email}</code></li>
                  <li>Il ruolo che ti serve</li>
                  <li>Il motivo dell'accesso</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informazioni su TicketApp */}
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Cosa puoi fare con TicketApp</CardTitle>
            <CardDescription>
              Una volta invitato a un'organizzazione, avrai accesso a:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Come Utente:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Creare richieste di assistenza</li>
                  <li>• Chattare in tempo reale</li>
                  <li>• Allegare file e documenti</li>
                  <li>• Monitorare lo stato delle richieste</li>
                  <li>• Registrare turni di lavoro</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Come Amministratore:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Gestire tutti i ticket</li>
                  <li>• Assegnare richieste al team</li>
                  <li>• Monitorare SLA e performance</li>
                  <li>• Visualizzare report e analytics</li>
                  <li>• Gestire utenti e permessi</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-4">
          <Button variant="outline" asChild>
            <Link href="/login">
              Torna al Login
            </Link>
          </Button>
          <p className="text-sm text-gray-500">
            Hai bisogno di aiuto? Contatta il supporto tecnico della tua organizzazione.
          </p>
        </div>
      </div>
    </div>
  )
}
