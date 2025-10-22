# TicketApp - Sistema di Ticketing Multi-Tenant

Un sistema completo di gestione ticket multi-tenant costruito con Next.js, TypeScript, Supabase e ShadCN/UI.

## 🚀 Caratteristiche Principali

### Multi-Tenant & Ruoli
- **SUPER_ADMIN**: Gestione completa della piattaforma, CRUD aziende, catalogo servizi globale
- **ADMIN_AZIENDA**: Gestione ticket, utenti del tenant, servizi attivati, SLA e report
- **UTENTE**: Creazione ticket, chat realtime, allegati, visualizzazione stato

### Servizi & Form Dinamici
- Catalogo servizi globale configurabile
- Form builder basato su JSON Schema per campi dinamici
- Attivazione servizi per tenant con configurazioni personalizzate

### Ticket & Chat
- Sistema ticket completo con priorità, stati, SLA e assegnazioni
- Chat realtime con Supabase per comunicazione tra utenti e admin
- Messaggi pubblici e note interne (solo admin)
- Sistema di allegati con Supabase Storage

### SLA Avanzati
- Configurazione SLA per priorità (Critica: 1h risposta, 8h risoluzione)
- Calcolo automatico con orari lavorativi configurabili
- Badge colorati per stato SLA (verde/giallo/rosso)
- Notifiche per scadenze imminenti

### Turni con Geolocalizzazione
- Comandi chat per registrare inizio/fine giornata: `/inizio_giornata Nome Cognome`, `/fine_giornata`
- Tracciamento geolocalizzazione con consenso utente
- Dashboard admin per monitoraggio turni in tempo reale
- Calcolo automatico durate e distanze

### Notifiche & Integrazioni
- Email via Resend/SMTP per eventi chiave
- Webhook configurabili per tenant
- Integrazione Telegram opzionale

## 🛠️ Stack Tecnologico

- **Frontend**: Next.js 15 (App Router), TypeScript, ShadCN/UI, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Database**: PostgreSQL con Row Level Security (RLS)
- **Autenticazione**: Supabase Auth (Magic Link/OTP)
- **Email**: Resend o SMTP configurabile
- **Deploy**: Vercel

## 📋 Prerequisiti

- Node.js 18+ 
- Account Supabase
- Account Resend (opzionale, per email)

## 🚀 Setup Locale

### 1. Clona il Repository

```bash
git clone <repository-url>
cd ticket-app
npm install
```

### 2. Configurazione Supabase

1. Crea un nuovo progetto su [Supabase](https://supabase.com)
2. Copia le credenziali dal dashboard Supabase
3. Crea il file `.env.local`:

```bash
cp env.example .env.local
```

Compila le variabili in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database
DATABASE_URL=your_supabase_database_url

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com

# SMTP (alternativo a Resend)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Webhook/Telegram (opzionale)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
WEBHOOK_SECRET=your_webhook_secret

# App
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Setup Database

Installa Supabase CLI:

```bash
npm install -g supabase
```

Esegui le migrazioni:

```bash
# Applica lo schema del database
supabase db push --db-url "your_database_url"

# Oppure esegui manualmente gli script SQL
# 1. Esegui db/migrations/001_initial_schema.sql
# 2. Esegui db/policies/001_rls_policies.sql
```

### 4. Popola con Dati Demo

```bash
npm run seed
```

Questo creerà:
- 1 Super Admin: `superadmin@ticketapp.com` / `SuperAdmin123!`
- 2 Aziende demo con admin: `admin@acme-corp.com` / `Admin123!`
- Utenti demo: `mario.rossi@acme-corp.com` / `User123!`
- 3 Servizi globali (Noleggio, Telepass, Carburante)
- 10 Ticket demo con messaggi
- 3 Turni demo con geolocalizzazione

### 5. Avvia l'Applicazione

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

## 🏗️ Struttura del Progetto

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Gruppo route autenticazione
│   ├── superadmin/               # Dashboard Super Admin
│   ├── admin/[orgSlug]/          # Dashboard Admin Azienda
│   ├── app/[orgSlug]/            # Webapp Utente
│   └── api/                      # API Routes
├── components/                   # Componenti React
│   ├── ui/                       # Componenti ShadCN/UI
│   ├── layout/                   # Layout e navigazione
│   ├── tickets/                  # Componenti ticket
│   ├── chat/                     # Componenti chat
│   └── shifts/                   # Componenti turni
├── lib/                          # Utilità e configurazioni
│   ├── supabase/                 # Client Supabase
│   ├── auth.ts                   # Gestione autenticazione
│   ├── sla.ts                    # Calcoli SLA
│   └── chat-commands.ts          # Parser comandi chat
db/
├── migrations/                   # Migrazioni SQL
└── policies/                     # Policy RLS
scripts/
└── seed.ts                       # Script popolamento dati
```

## 🔐 Sicurezza & RLS

Il sistema implementa Row Level Security (RLS) completo:

- **Isolamento tenant**: Ogni utente vede solo i dati della propria organizzazione
- **Controllo ruoli**: Policy specifiche per SUPER_ADMIN, ADMIN_AZIENDA, UTENTE
- **Messaggi interni**: Visibili solo agli admin della stessa organizzazione
- **Turni**: Modificabili solo dal proprietario o admin del tenant
- **Audit log**: Tracciamento azioni sensibili

## 📱 Funzionalità Chat & Turni

### Comandi Chat Disponibili

```bash
/inizio_giornata Mario Rossi
# Registra inizio turno con geolocalizzazione

/fine_giornata  
# Termina turno e calcola durata

/help
# Mostra tutti i comandi disponibili
```

### Geolocalizzazione

- Richiesta consenso utente per accesso GPS
- Salvataggio coordinate con accuracy e timestamp
- Visualizzazione su mappa per admin
- Privacy: dati visibili solo all'interno del tenant

## 🎯 SLA & Priorità

### Configurazione Default

- **Critica**: Risposta 1h, Risoluzione 8h (24/7)
- **Alta**: Risposta 4h, Risoluzione 24h (Lun-Ven 9-18)
- **Media**: Risposta 8h, Risoluzione 48h (Lun-Ven 9-18)  
- **Bassa**: Risposta 24h, Risoluzione 5 giorni (Lun-Ven 9-18)

### Calcolo Orari Lavorativi

Il sistema supporta:
- Orari lavorativi configurabili (es. 9-18)
- Giorni lavorativi (es. Lun-Ven)
- Esclusione weekend e festivi dal calcolo SLA

## 📊 Report & Analytics

Dashboard Admin include:
- Tempo medio prima risposta e risoluzione
- % ticket risolti entro SLA
- Volumi per servizio/priorità
- Tasso chiusura al primo contatto
- Top tag/problemi ricorrenti
- CSAT opzionale (1-5 stelle)

## 🚀 Deploy su Vercel

### 1. Preparazione

```bash
npm run build
```

### 2. Deploy

1. Connetti il repository a Vercel
2. Configura le variabili d'ambiente nel dashboard Vercel
3. Deploy automatico ad ogni push

### 3. Configurazione Domini

Per multi-tenant con subdomini:
- Configura domini personalizzati in Vercel
- Aggiorna middleware per gestione subdomini
- Configura DNS per wildcard (*.yourdomain.com)

## 🔧 Configurazioni Avanzate

### Email Provider

**Resend (Raccomandato)**:
```env
RESEND_API_KEY=re_xxxx
FROM_EMAIL=noreply@yourdomain.com
```

**SMTP Generico**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Webhook & Telegram

```env
TELEGRAM_BOT_TOKEN=your_bot_token
WEBHOOK_SECRET=your_webhook_secret
```

### Storage Supabase

Configura bucket `attachments` con policy:
- Lettura: utenti del ticket
- Scrittura: creatori del ticket
- Eliminazione: admin organizzazione

## 🧪 Testing

```bash
# Test unitari
npm run test

# Test E2E (da implementare)
npm run test:e2e

# Linting
npm run lint
```

## 📈 Monitoraggio

- **Logs**: Pino per logging strutturato
- **Errori**: Error boundaries React
- **Performance**: Next.js Analytics
- **Uptime**: Vercel monitoring

## 🤝 Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit modifiche (`git commit -m 'Add AmazingFeature'`)
4. Push branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per dettagli.

## 🆘 Supporto

Per supporto e domande:
- Apri un issue su GitHub
- Consulta la documentazione Supabase
- Verifica i log dell'applicazione

## 🔄 Roadmap

- [ ] Integrazione SSO (SAML/OAuth)
- [ ] App mobile React Native
- [ ] API pubbliche con rate limiting
- [ ] Dashboard analytics avanzate
- [ ] Automazioni workflow
- [ ] Integrazione CRM
- [ ] Multi-lingua i18n
