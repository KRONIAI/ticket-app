# 🚀 Guida al Deployment - TicketApp

## ✅ Checklist Pre-Deploy

### 1. Configurazione Supabase
- [ ] Progetto Supabase creato
- [ ] Database configurato con migrazioni SQL
- [ ] RLS policies applicate
- [ ] Bucket storage `attachments` creato
- [ ] Variabili d'ambiente copiate

### 2. Configurazione Email
- [ ] Account Resend configurato OPPURE
- [ ] Credenziali SMTP configurate
- [ ] Template email testati

### 3. Configurazione Vercel
- [ ] Repository connesso a Vercel
- [ ] Variabili d'ambiente configurate
- [ ] Cron jobs abilitati

## 🔧 Setup Supabase Dettagliato

### 1. Crea Progetto
```bash
# Vai su https://supabase.com
# Crea nuovo progetto
# Copia URL e chiavi
```

### 2. Applica Schema Database
```sql
-- Esegui in ordine:
-- 1. db/migrations/001_initial_schema.sql
-- 2. db/policies/001_rls_policies.sql
```

### 3. Configura Storage
```sql
-- Crea bucket per allegati
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', false);

-- Policy per lettura allegati
CREATE POLICY "Utenti possono vedere allegati propri ticket" ON storage.objects
FOR SELECT USING (
  bucket_id = 'attachments' AND
  auth.uid() IN (
    SELECT p.user_id FROM profiles p
    JOIN tickets t ON t.created_by = p.id OR t.assigned_to = p.id
    WHERE t.id::text = (storage.foldername(name))[1]
  )
);

-- Policy per upload allegati
CREATE POLICY "Utenti possono caricare allegati" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'attachments' AND
  auth.uid() IS NOT NULL
);
```

## 🌱 Popolamento Dati Demo

```bash
# Dopo aver configurato le variabili d'ambiente
npm run seed
```

Questo creerà:
- **1 Super Admin**: `superadmin@ticketapp.com` / `SuperAdmin123!`
- **2 Organizzazioni**: Acme Corp e TechStart
- **Admin Aziendali**: `admin@acme-corp.com` / `Admin123!`
- **Utenti Demo**: `mario.rossi@acme-corp.com` / `User123!`
- **3 Servizi**: Noleggio, Telepass, Carburante
- **10 Ticket Demo** con messaggi
- **3 Turni Demo** con geolocalizzazione

## 🔐 Variabili d'Ambiente Vercel

### Essenziali
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXTAUTH_SECRET=your-secret-key-min-32-chars
NEXTAUTH_URL=https://your-app.vercel.app
CRON_SECRET=your-cron-secret-for-sla-checks
```

### Email (Scegli uno)
```env
# Opzione 1: Resend (Raccomandato)
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# Opzione 2: SMTP Generico
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourdomain.com
```

### Opzionali
```env
# Telegram (per notifiche)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
WEBHOOK_SECRET=your-webhook-secret

# Database URL (per migrazioni)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

## 📋 Configurazione Domini

### Subdomini Multi-Tenant (Opzionale)
```bash
# Configura DNS wildcard
*.yourdomain.com -> your-app.vercel.app

# Aggiorna middleware per gestire subdomini
# src/middleware.ts - aggiungi logica subdomain
```

### Domini Personalizzati
```bash
# In Vercel Dashboard:
# Settings > Domains > Add Domain
# yourdomain.com
# admin.yourdomain.com (opzionale)
```

## 🔄 Cron Jobs Automatici

Il sistema include un cron job per controllo SLA:
- **Frequenza**: Ogni 2 ore (`0 */2 * * *`)
- **Endpoint**: `/api/cron/sla-check`
- **Funzione**: Notifica ticket in scadenza SLA

## 🧪 Test Post-Deploy

### 1. Test Autenticazione
```bash
# Vai su https://your-app.vercel.app/login
# Testa magic link con email demo
```

### 2. Test Funzionalità Core
- [ ] Login Super Admin
- [ ] Creazione organizzazione
- [ ] Invito admin azienda
- [ ] Creazione ticket
- [ ] Chat realtime
- [ ] Comandi turni (`/inizio_giornata`, `/fine_giornata`)
- [ ] Notifiche email
- [ ] SLA tracking

### 3. Test Performance
```bash
# Lighthouse audit
# Core Web Vitals
# Database query performance
```

## 🚨 Troubleshooting Comune

### Errore RLS
```sql
-- Verifica policies attive
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Errore Email
```bash
# Verifica configurazione
curl -X POST https://your-app.vercel.app/api/notifications/test-email
```

### Errore Realtime
```javascript
// Verifica connessione Supabase
const { data, error } = await supabase
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()
```

## 📊 Monitoraggio Post-Deploy

### Metriche da Monitorare
- **Uptime**: Vercel Analytics
- **Performance**: Core Web Vitals
- **Errori**: Vercel Functions logs
- **Database**: Supabase Dashboard
- **Email**: Resend Dashboard

### Log Importanti
```bash
# Vercel Function Logs
vercel logs your-app-name

# Supabase Logs
# Dashboard > Logs > API/Database
```

## 🔄 Aggiornamenti Futuri

### Schema Database
```sql
-- Crea nuova migrazione
-- db/migrations/002_new_feature.sql
-- Applica via Supabase Dashboard
```

### Nuove Features
```bash
# Deploy automatico su push
git push origin main
# Vercel auto-deploy
```

## 📞 Supporto

### Risorse Utili
- [Documentazione Supabase](https://supabase.com/docs)
- [Documentazione Vercel](https://vercel.com/docs)
- [ShadCN/UI Components](https://ui.shadcn.com)
- [Next.js App Router](https://nextjs.org/docs/app)

### Contatti
- **Issues**: GitHub Repository
- **Documentazione**: README.md
- **Community**: Supabase Discord

---

## ✅ Checklist Finale

- [ ] Database configurato e popolato
- [ ] Variabili d'ambiente impostate
- [ ] Deploy Vercel completato
- [ ] Domini configurati (se necessario)
- [ ] Email provider testato
- [ ] Cron jobs attivi
- [ ] Test funzionalità completati
- [ ] Monitoraggio configurato
- [ ] Backup strategy definita
- [ ] Documentazione aggiornata

**🎉 Il tuo TicketApp è pronto per la produzione!**
