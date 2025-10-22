'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { AuthUser } from '@/lib/auth'
import { Send, Loader2, Eye, EyeOff, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { parseCommand, isCommand, getCommandHelp, getCurrentPosition, formatShiftDuration, formatGeolocation } from '@/lib/chat-commands'

interface Message {
  id: string
  body: string
  is_internal: boolean
  created_at: string
  author: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface TicketChatProps {
  ticketId: string
  orgId: string
  currentUser: AuthUser
  initialMessages: Message[]
}

export function TicketChat({ ticketId, orgId, currentUser, initialMessages }: TicketChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Realtime subscription per i nuovi messaggi
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        async (payload) => {
          // Ottieni i dettagli dell'autore
          const { data: author } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('id', payload.new.author_id)
            .single()

          const newMessage: Message = {
            id: payload.new.id,
            body: payload.new.body,
            is_internal: payload.new.is_internal,
            created_at: payload.new.created_at,
            author
          }

          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, supabase])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || loading) return

    setLoading(true)

    try {
      // Controlla se è un comando
      if (isCommand(newMessage)) {
        await handleCommand(newMessage)
      } else {
        await sendRegularMessage(newMessage)
      }
      
      setNewMessage('')
    } catch (error) {
      console.error('Errore nell\'invio del messaggio:', error)
      // TODO: Mostra errore all'utente
    } finally {
      setLoading(false)
    }
  }

  const sendRegularMessage = async (message: string) => {
    const { error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        org_id: orgId,
        author_id: currentUser.profile.id,
        body: message,
        is_internal: isInternal
      })

    if (error) throw error
  }

  const handleCommand = async (commandText: string) => {
    try {
      const command = parseCommand(commandText)
      
      if (!command) {
        throw new Error('Comando non riconosciuto')
      }

      if (command.type === 'shift_start') {
        // Controlla se c'è già un turno aperto
        const { data: openShift } = await supabase
          .from('shifts')
          .select('*')
          .eq('org_id', orgId)
          .eq('user_id', currentUser.profile.id)
          .eq('status', 'aperto')
          .single()

        if (openShift) {
          throw new Error('Hai già un turno aperto. Chiudi il turno corrente prima di iniziarne uno nuovo.')
        }

        // Ottieni geolocalizzazione
        const geo = await getCurrentPosition()
        
        // Crea il turno
        const { error } = await supabase
          .from('shifts')
          .insert({
            org_id: orgId,
            user_id: currentUser.profile.id,
            employee_name: command.employeeName,
            start_at: new Date().toISOString(),
            start_geo: geo,
            status: 'aperto'
          })

        if (error) throw error

        // Invia messaggio di conferma
        const confirmMessage = `✅ **Turno iniziato**\n\n` +
          `👤 **Dipendente:** ${command.employeeName}\n` +
          `🕐 **Orario:** ${new Date().toLocaleString('it-IT')}\n` +
          `${formatGeolocation(geo)}\n\n` +
          `Usa \`/fine_giornata\` per terminare il turno.`

        await sendRegularMessage(confirmMessage)

      } else if (command.type === 'shift_end') {
        // Trova il turno aperto
        const { data: openShift } = await supabase
          .from('shifts')
          .select('*')
          .eq('org_id', orgId)
          .eq('user_id', currentUser.profile.id)
          .eq('status', 'aperto')
          .single()

        if (!openShift) {
          throw new Error('Non hai nessun turno aperto da chiudere.')
        }

        // Ottieni geolocalizzazione
        const geo = await getCurrentPosition()
        
        // Chiudi il turno
        const { error } = await supabase
          .from('shifts')
          .update({
            end_at: new Date().toISOString(),
            end_geo: geo,
            status: 'chiuso'
          })
          .eq('id', openShift.id)

        if (error) throw error

        // Calcola durata
        const startTime = new Date(openShift.start_at)
        const endTime = new Date()
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

        // Invia messaggio di conferma
        const confirmMessage = `🏁 **Turno terminato**\n\n` +
          `👤 **Dipendente:** ${openShift.employee_name}\n` +
          `🕐 **Inizio:** ${startTime.toLocaleString('it-IT')}\n` +
          `🕐 **Fine:** ${endTime.toLocaleString('it-IT')}\n` +
          `⏱️ **Durata:** ${formatShiftDuration(durationMinutes)}\n` +
          `${formatGeolocation(geo)}`

        await sendRegularMessage(confirmMessage)
      }

    } catch (error) {
      // Invia messaggio di errore
      const errorMessage = `❌ **Errore comando**\n\n${error instanceof Error ? error.message : 'Errore sconosciuto'}\n\nDigita \`/help\` per vedere i comandi disponibili.`
      await sendRegularMessage(errorMessage)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleHelp = () => {
    setShowHelp(!showHelp)
  }

  return (
    <div className="space-y-4">
      {/* Lista messaggi */}
      <div className="max-h-96 overflow-y-auto space-y-4 p-4 border rounded-lg bg-muted/20">
        {messages.map((message) => (
          <div key={message.id} className="flex space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.author?.avatar_url || ''} />
              <AvatarFallback>
                {message.author?.full_name?.charAt(0) || message.author?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {message.author?.full_name || message.author?.email || 'Utente'}
                </span>
                {message.is_internal && (
                  <Badge variant="secondary" className="text-xs">
                    <EyeOff className="mr-1 h-3 w-3" />
                    Interno
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(message.created_at), 'dd MMM HH:mm', { locale: it })}
                </span>
              </div>
              <div className="text-sm whitespace-pre-wrap bg-background p-3 rounded-lg border">
                {message.body}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Help panel */}
      {showHelp && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium mb-2">Comandi Chat Disponibili</h4>
          <div className="text-sm text-muted-foreground whitespace-pre-line">
            {getCommandHelp()}
          </div>
        </div>
      )}

      {/* Form nuovo messaggio */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="internal"
              checked={isInternal}
              onCheckedChange={setIsInternal}
            />
            <Label htmlFor="internal" className="text-sm">
              <EyeOff className="inline mr-1 h-3 w-3" />
              Messaggio interno
            </Label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleHelp}
            className="text-xs"
          >
            {showHelp ? 'Nascondi' : 'Mostra'} Comandi
          </Button>
        </div>

        <div className="flex space-x-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isCommand(newMessage) ? "Comando rilevato - premi Invio per eseguire" : "Scrivi un messaggio o usa /comando..."}
            className="flex-1 min-h-[80px]"
            disabled={loading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || loading}
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isCommand(newMessage) && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
            💡 Comando rilevato. Questo eseguirà un'azione speciale.
          </div>
        )}

        {isInternal && (
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border">
            👁️ Questo messaggio sarà visibile solo agli amministratori.
          </div>
        )}
      </div>
    </div>
  )
}
