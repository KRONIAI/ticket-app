import { Resend } from 'resend'
import nodemailer from 'nodemailer'

// Configurazione Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Configurazione SMTP
const smtpTransporter = process.env.SMTP_HOST ? nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null

export interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    // Prova prima con Resend
    if (resend) {
      const result = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@ticketapp.com',
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      })
      
      if (result.error) {
        console.error('Errore Resend:', result.error)
        return false
      }
      
      return true
    }
    
    // Fallback su SMTP
    if (smtpTransporter) {
      await smtpTransporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@ticketapp.com',
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      })
      
      return true
    }
    
    console.warn('Nessun provider email configurato')
    return false
    
  } catch (error) {
    console.error('Errore invio email:', error)
    return false
  }
}

// Template email per nuovo ticket
export function getNewTicketEmailTemplate(ticketData: {
  title: string
  description: string
  priority: string
  createdBy: string
  organizationName: string
  ticketUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `Nuovo Ticket: ${ticketData.title}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .priority { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .priority-bassa { background: #f8f9fa; color: #6c757d; }
        .priority-media { background: #e3f2fd; color: #1976d2; }
        .priority-alta { background: #fff3e0; color: #f57c00; }
        .priority-critica { background: #ffebee; color: #d32f2f; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nuovo Ticket Creato</h1>
          <p>È stato creato un nuovo ticket in <strong>${ticketData.organizationName}</strong></p>
        </div>
        
        <h2>${ticketData.title}</h2>
        
        <p><strong>Priorità:</strong> <span class="priority priority-${ticketData.priority}">${ticketData.priority.toUpperCase()}</span></p>
        <p><strong>Creato da:</strong> ${ticketData.createdBy}</p>
        
        <h3>Descrizione:</h3>
        <p>${ticketData.description || 'Nessuna descrizione fornita'}</p>
        
        <a href="${ticketData.ticketUrl}" class="button">Visualizza Ticket</a>
        
        <div class="footer">
          <p>Questa è una notifica automatica del sistema TicketApp.</p>
          <p>Non rispondere a questa email.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
Nuovo Ticket Creato

Titolo: ${ticketData.title}
Priorità: ${ticketData.priority.toUpperCase()}
Creato da: ${ticketData.createdBy}
Organizzazione: ${ticketData.organizationName}

Descrizione:
${ticketData.description || 'Nessuna descrizione fornita'}

Visualizza il ticket: ${ticketData.ticketUrl}

---
Questa è una notifica automatica del sistema TicketApp.
  `
  
  return { subject, html, text }
}

// Template email per nuovo messaggio
export function getNewMessageEmailTemplate(messageData: {
  ticketTitle: string
  messageBody: string
  authorName: string
  organizationName: string
  ticketUrl: string
  isInternal: boolean
}): { subject: string; html: string; text: string } {
  const subject = `${messageData.isInternal ? '[INTERNO] ' : ''}Nuovo messaggio: ${messageData.ticketTitle}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .message { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
        .internal { border-left-color: #ffc107; background: #fff8e1; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${messageData.isInternal ? 'Nuovo Messaggio Interno' : 'Nuovo Messaggio'}</h1>
          <p>È stato aggiunto un nuovo messaggio al ticket in <strong>${messageData.organizationName}</strong></p>
        </div>
        
        <h2>${messageData.ticketTitle}</h2>
        
        <div class="message ${messageData.isInternal ? 'internal' : ''}">
          <p><strong>Da:</strong> ${messageData.authorName}</p>
          <p>${messageData.messageBody}</p>
        </div>
        
        <a href="${messageData.ticketUrl}" class="button">Visualizza Conversazione</a>
        
        <div class="footer">
          <p>Questa è una notifica automatica del sistema TicketApp.</p>
          <p>Non rispondere a questa email.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
${messageData.isInternal ? 'Nuovo Messaggio Interno' : 'Nuovo Messaggio'}

Ticket: ${messageData.ticketTitle}
Da: ${messageData.authorName}
Organizzazione: ${messageData.organizationName}

Messaggio:
${messageData.messageBody}

Visualizza la conversazione: ${messageData.ticketUrl}

---
Questa è una notifica automatica del sistema TicketApp.
  `
  
  return { subject, html, text }
}

// Template email per scadenza SLA
export function getSLAWarningEmailTemplate(slaData: {
  ticketTitle: string
  priority: string
  dueAt: string
  organizationName: string
  ticketUrl: string
  hoursRemaining: number
}): { subject: string; html: string; text: string } {
  const subject = `⚠️ SLA in Scadenza: ${slaData.ticketTitle}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeaa7; }
        .warning { background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
        .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Attenzione: SLA in Scadenza</h1>
          <p>Un ticket in <strong>${slaData.organizationName}</strong> sta per superare il tempo limite SLA</p>
        </div>
        
        <h2>${slaData.ticketTitle}</h2>
        
        <div class="warning">
          <p><strong>Priorità:</strong> ${slaData.priority.toUpperCase()}</p>
          <p><strong>Scadenza SLA:</strong> ${slaData.dueAt}</p>
          <p><strong>Tempo rimanente:</strong> ${slaData.hoursRemaining > 0 ? `${slaData.hoursRemaining} ore` : 'SCADUTO'}</p>
        </div>
        
        <p>È necessario intervenire immediatamente per rispettare gli accordi di servizio.</p>
        
        <a href="${slaData.ticketUrl}" class="button">Gestisci Ticket</a>
        
        <div class="footer">
          <p>Questa è una notifica automatica del sistema TicketApp.</p>
          <p>Non rispondere a questa email.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
⚠️ ATTENZIONE: SLA in Scadenza

Ticket: ${slaData.ticketTitle}
Priorità: ${slaData.priority.toUpperCase()}
Scadenza SLA: ${slaData.dueAt}
Tempo rimanente: ${slaData.hoursRemaining > 0 ? `${slaData.hoursRemaining} ore` : 'SCADUTO'}
Organizzazione: ${slaData.organizationName}

È necessario intervenire immediatamente per rispettare gli accordi di servizio.

Gestisci il ticket: ${slaData.ticketUrl}

---
Questa è una notifica automatica del sistema TicketApp.
  `
  
  return { subject, html, text }
}
