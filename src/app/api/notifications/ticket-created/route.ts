import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getNewTicketEmailTemplate } from '@/lib/email'
import { sendWebhook, sendTelegramNotification, getTelegramTicketMessage } from '@/lib/webhooks'

export async function POST(request: NextRequest) {
  try {
    const { ticketId } = await request.json()

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId richiesto' }, { status: 400 })
    }

    const supabase = await createClient()

    // Ottieni i dettagli del ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        organization:organizations(*),
        created_by:profiles!tickets_created_by_fkey(*),
        service:services(name)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket non trovato' }, { status: 404 })
    }

    // Ottieni gli admin dell'organizzazione per le notifiche
    const { data: admins } = await supabase
      .from('memberships')
      .select(`
        profile:profiles(*)
      `)
      .eq('org_id', ticket.org_id)
      .eq('role', 'ADMIN_AZIENDA')
      .eq('is_active', true)

    const ticketUrl = `${process.env.NEXTAUTH_URL}/admin/${ticket.organization.slug}/tickets/${ticket.id}`

    // Prepara i dati per i template
    const ticketData = {
      title: ticket.title,
      description: ticket.description || '',
      priority: ticket.priority,
      createdBy: ticket.created_by?.full_name || ticket.created_by?.email || 'Utente',
      organizationName: ticket.organization.name,
      ticketUrl
    }

    // Invia email agli admin
    if (admins) {
      const emailTemplate = getNewTicketEmailTemplate(ticketData)
      
      for (const admin of admins) {
        if (admin.profile?.email) {
          await sendEmail({
            to: admin.profile.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          })
        }
      }
    }

    // Invia webhook se configurato
    const orgConfig = ticket.organization.config as any
    if (orgConfig?.webhook?.enabled) {
      await sendWebhook(orgConfig.webhook, {
        type: 'ticket.created',
        data: {
          ticket: {
            id: ticket.id,
            title: ticket.title,
            priority: ticket.priority,
            status: ticket.status,
            created_by: ticket.created_by?.email,
            organization: ticket.organization.name
          }
        },
        timestamp: new Date().toISOString(),
        organization_id: ticket.org_id
      })
    }

    // Invia notifica Telegram se configurato
    if (orgConfig?.telegram?.enabled && orgConfig.telegram.bot_token && orgConfig.telegram.chat_id) {
      const telegramMessage = getTelegramTicketMessage(ticketData)
      await sendTelegramNotification(
        orgConfig.telegram.bot_token,
        orgConfig.telegram.chat_id,
        telegramMessage
      )
    }

    // Log dell'evento
    await supabase
      .from('audit_logs')
      .insert({
        org_id: ticket.org_id,
        actor_id: ticket.created_by,
        entity_type: 'ticket',
        entity_id: ticket.id,
        action: 'notification_sent',
        meta: {
          notification_type: 'ticket_created',
          recipients: admins?.length || 0
        }
      })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Errore invio notifiche ticket:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
