import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowLeft, Home, Mail } from 'lucide-react'
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <AlertTriangle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Accesso Negato</h1>
          <p className="text-lg text-gray-600">
            Non hai i permessi necessari per accedere a questa risorsa.
          </p>
        </div>

        {/* Dettagli Errore */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Autorizzazione Richiesta</CardTitle>
            <CardDescription>
              La pagina che stai cercando di visualizzare richiede permessi specifici
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-2">Possibili cause:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Non sei membro dell'organizzazione richiesta</li>
                <li>• Il tuo ruolo non ha i permessi necessari</li>
                <li>• Il tuo account è stato disattivato</li>
                <li>• Stai tentando di accedere a dati di un'altra organizzazione</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">Cosa puoi fare:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Contatta l'amministratore della tua organizzazione</li>
                <li>• Verifica di essere loggato con l'account corretto</li>
                <li>• Richiedi i permessi necessari per questa funzione</li>
                <li>• Torna alla dashboard principale</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Azioni */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link href="javascript:history.back()">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna Indietro
            </Link>
          </Button>
          
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Vai alla Dashboard
            </Link>
          </Button>
        </div>

        {/* Supporto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Hai bisogno di aiuto?</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Se ritieni che questo sia un errore o hai bisogno di accesso a questa funzione, 
              contatta l'amministratore della tua organizzazione.
            </p>
            <div className="text-sm text-gray-500">
              <p className="mb-2">Quando contatti il supporto, fornisci:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>L'URL della pagina che stavi cercando di visitare</li>
                <li>La tua email di accesso</li>
                <li>Il motivo per cui hai bisogno di questo accesso</li>
                <li>L'orario in cui si è verificato l'errore</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Errore 403 - Accesso Negato | TicketApp
          </p>
        </div>
      </div>
    </div>
  )
}
