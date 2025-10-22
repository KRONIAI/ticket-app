import crypto from 'crypto'

export interface WebhookEvent {
  type: 'ticket.created' | 'ticket.updated' | 'ticket.message.created' | 'shift.started' | 'shift.ended'
  data: any
  timestamp: string
  organization_id: string
}

export interface WebhookConfig {
  url: string
  secret?: string
  events: string[]
  enabled: boolean
}

export async function sendWebhook(
  config: WebhookConfig,
  event: WebhookEvent
): Promise<boolean> {
  if (!config.enabled || !config.events.includes(event.type)) {
    return false
  }

  try {
    const payload = JSON.stringify(event)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'TicketApp-Webhook/1.0',
      'X-Webhook-Event': event.type,
      'X-Webhook-Timestamp': event.timestamp,
    }

    // Aggiungi signature se c'è un secret
    if (config.secret) {
      const signature = crypto
        .createHmac('sha256', config.secret)
        .update(payload)
        .digest('hex')
      headers['X-Webhook-Signature'] = `sha256=${signature}`
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: payload,
    })

    return response.ok
  } catch (error) {
    console.error('Errore invio webhook:', error)
    return false
  }
}

// Funzione per inviare notifica Telegram
export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Errore invio Telegram:', error)
    return false
  }
}

// Template messaggi Telegram
export function getTelegramTicketMessage(ticketData: {
  title: string
  priority: string
  createdBy: string
  organizationName: string
  ticketUrl: string
}): string {
  const priorityEmoji = {
    bassa: '🟢',
    media: '🟡',
    alta: '🟠',
    critica: '🔴'
  }

  return `
🎫 *Nuovo Ticket*

${priorityEmoji[ticketData.priority as keyof typeof priorityEmoji]} *${ticketData.title}*

👤 Creato da: ${ticketData.createdBy}
🏢 Organizzazione: ${ticketData.organizationName}
⚡ Priorità: ${ticketData.priority.toUpperCase()}

[Visualizza Ticket](${ticketData.ticketUrl})
  `.trim()
}

export function getTelegramShiftMessage(shiftData: {
  employeeName: string
  action: 'started' | 'ended'
  organizationName: string
  duration?: string
}): string {
  const actionEmoji = shiftData.action === 'started' ? '🟢' : '🔴'
  const actionText = shiftData.action === 'started' ? 'Turno Iniziato' : 'Turno Terminato'

  let message = `
${actionEmoji} *${actionText}*

👤 Dipendente: ${shiftData.employeeName}
🏢 Organizzazione: ${shiftData.organizationName}
🕐 Orario: ${new Date().toLocaleString('it-IT')}
  `.trim()

  if (shiftData.duration && shiftData.action === 'ended') {
    message += `\n⏱️ Durata: ${shiftData.duration}`
  }

  return message
}

export function getTelegramSLAWarningMessage(slaData: {
  ticketTitle: string
  priority: string
  hoursRemaining: number
  organizationName: string
  ticketUrl: string
}): string {
  return `
⚠️ *SLA in Scadenza*

🎫 ${slaData.ticketTitle}
🏢 ${slaData.organizationName}
⚡ Priorità: ${slaData.priority.toUpperCase()}
⏰ Tempo rimanente: ${slaData.hoursRemaining > 0 ? `${slaData.hoursRemaining}h` : 'SCADUTO'}

[Gestisci Ticket](${slaData.ticketUrl})
  `.trim()
}
