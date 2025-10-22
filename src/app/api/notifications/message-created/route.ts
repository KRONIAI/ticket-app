import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getNewMessageEmailTemplate } from '@/lib/email'
import { sendWebhook } from '@/lib/webhooks'

export async function POST(request: NextRequest) {
  try {
    const { messageId } = await request.json()

    if (!messageId) {
      return NextResponse.json({ error: 'messageId richiesto' }, { status: 400 })
    }

    const supabase = await createClient()

    // Ottieni i dettagli del messaggio
    const { data: message, error: messageError } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        ticket:tickets(*),
        organization:organizations(*),
        author:profiles(*)
      `)
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      return NextResponse.json({ error: 'Messaggio non trovato' }, { status: 404 })
    }

    // Ottieni i partecipanti al ticket (creatore + assegnatario + admin)
    const participants = new Set<string>()

    // Aggiungi il creatore del ticket
    if (message.ticket.created_by) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', message.ticket.created_by)
        .single()
      
      if (creator?.email && creator.email !== message.author?.email) {
        participants.add(creator.email)
      }
    }

    // Aggiungi l'assegnatario se presente
    if (message.ticket.assigned_to) {
      const { data: assignee } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', message.ticket.assigned_to)
        .single()
      
      if (assignee?.email && assignee.email !== message.author?.email) {
        participants.add(assignee.email)
      }
    }

    // Aggiungi gli admin se il messaggio non è interno o se è interno
    const { data: admins } = await supabase
      .from('memberships')
      .select(`
        profile:profiles(email)
      `)
      .eq('org_id', message.org_id)
      .eq('role', 'ADMIN_AZIENDA')
      .eq('is_active', true)

    if (admins) {
      for (const admin of admins) {
        if (admin.profile?.email && admin.profile.email !== message.author?.email) {
          // Se il messaggio è interno, notifica solo gli admin
          if (message.is_internal) {
            participants.add(admin.profile.email)
          } else {
            // Se non è interno, notifica comunque gli admin
            participants.add(admin.profile.email)
          }
        }
      }
    }

    const ticketUrl = `${process.env.NEXTAUTH_URL}/admin/${message.organization.slug}/tickets/${message.ticket.id}#chat`

    // Prepara i dati per il template
    const messageData = {
      ticketTitle: message.ticket.title,
      messageBody: message.body,
      authorName: message.author?.full_name || message.author?.email || 'Utente',
      organizationName: message.organization.name,
      ticketUrl,
      isInternal: message.is_internal
    }

    // Invia email ai partecipanti
    if (participants.size > 0) {
      const emailTemplate = getNewMessageEmailTemplate(messageData)
      
      for (const email of participants) {
        await sendEmail({
          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        })
      }
    }

    // Invia webhook se configurato (solo per messaggi non interni)
    if (!message.is_internal) {
      const orgConfig = message.organization.config as any
      if (orgConfig?.webhook?.enabled) {
        await sendWebhook(orgConfig.webhook, {
          type: 'ticket.message.created',
          data: {
            message: {
              id: message.id,
              body: message.body,
              author: message.author?.email,
              ticket_id: message.ticket.id,
              ticket_title: message.ticket.title
            }
          },
          timestamp: new Date().toISOString(),
          organization_id: message.org_id
        })
      }
    }

    // Log dell'evento
    await supabase
      .from('audit_logs')
      .insert({
        org_id: message.org_id,
        actor_id: message.author_id,
        entity_type: 'ticket_message',
        entity_id: message.id,
        action: 'notification_sent',
        meta: {
          notification_type: 'message_created',
          recipients: participants.size,
          is_internal: message.is_internal
        }
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Errore invio notifiche messaggio:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
