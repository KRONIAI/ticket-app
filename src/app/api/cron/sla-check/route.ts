import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getSLAWarningEmailTemplate } from '@/lib/email'
import { sendTelegramNotification, getTelegramSLAWarningMessage } from '@/lib/webhooks'

export async function GET(request: NextRequest) {
  try {
    // Verifica che la richiesta provenga da Vercel Cron o abbia il token corretto
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const supabase = await createClient()

    // Trova ticket con SLA in scadenza (prossime 2 ore)
    const twoHoursFromNow = new Date()
    twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2)

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        *,
        organization:organizations(*),
        created_by:profiles!tickets_created_by_fkey(*),
        assigned_to:profiles!tickets_assigned_to_fkey(*)
      `)
      .not('status', 'in', '(risolto,chiuso)')
      .not('sla_due_at', 'is', null)
      .lte('sla_due_at', twoHoursFromNow.toISOString())
      .gte('sla_due_at', new Date().toISOString()) // Solo quelli non ancora scaduti

    if (error) {
      console.error('Errore query SLA:', error)
      return NextResponse.json({ error: 'Errore query' }, { status: 500 })
    }

    let notificationsSent = 0

    for (const ticket of tickets || []) {
      try {
        // Calcola ore rimanenti
        const hoursRemaining = Math.max(0, Math.floor(
          (new Date(ticket.sla_due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60)
        ))

        // Ottieni gli admin dell'organizzazione
        const { data: admins } = await supabase
          .from('memberships')
          .select(`
            profile:profiles(*)
          `)
          .eq('org_id', ticket.org_id)
          .eq('role', 'ADMIN_AZIENDA')
          .eq('is_active', true)

        const ticketUrl = `${process.env.NEXTAUTH_URL}/admin/${ticket.organization.slug}/tickets/${ticket.id}`

        const slaData = {
          ticketTitle: ticket.title,
          priority: ticket.priority,
          dueAt: new Date(ticket.sla_due_at).toLocaleString('it-IT'),
          organizationName: ticket.organization.name,
          ticketUrl,
          hoursRemaining
        }

        // Invia email agli admin
        if (admins && admins.length > 0) {
          const emailTemplate = getSLAWarningEmailTemplate(slaData)
          
          for (const admin of admins) {
            if (admin.profile?.email) {
              const sent = await sendEmail({
                to: admin.profile.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
              })
              
              if (sent) notificationsSent++
            }
          }
        }

        // Invia notifica Telegram se configurato
        const orgConfig = ticket.organization.config as any
        if (orgConfig?.telegram?.enabled && orgConfig.telegram.bot_token && orgConfig.telegram.chat_id) {
          const telegramMessage = getTelegramSLAWarningMessage(slaData)
          await sendTelegramNotification(
            orgConfig.telegram.bot_token,
            orgConfig.telegram.chat_id,
            telegramMessage
          )
        }

        // Aggiorna il ticket per evitare notifiche duplicate
        await supabase
          .from('tickets')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', ticket.id)

        // Log dell'evento
        await supabase
          .from('audit_logs')
          .insert({
            org_id: ticket.org_id,
            entity_type: 'ticket',
            entity_id: ticket.id,
            action: 'sla_warning_sent',
            meta: {
              hours_remaining: hoursRemaining,
              due_at: ticket.sla_due_at,
              recipients: admins?.length || 0
            }
          })

      } catch (ticketError) {
        console.error(`Errore processamento ticket ${ticket.id}:`, ticketError)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      tickets_processed: tickets?.length || 0,
      notifications_sent: notificationsSent
    })

  } catch (error) {
    console.error('Errore controllo SLA:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// Endpoint per test manuale (solo in development)
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Disponibile solo in development' }, { status: 403 })
  }

  // Simula la richiesta GET per test
  const mockRequest = new NextRequest(request.url, {
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`
    }
  })

  return GET(mockRequest)
}
