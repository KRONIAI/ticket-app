import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Configurazione Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variabili di ambiente Supabase mancanti')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seed() {
  console.log('🌱 Inizializzazione seed database...')

  try {
    // 1. Crea Super Admin
    console.log('👤 Creazione Super Admin...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'superadmin@ticketapp.com',
      password: 'SuperAdmin123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Super Amministratore'
      }
    })

    if (authError) {
      console.error('Errore creazione Super Admin:', authError)
      throw authError
    }

    const superAdminProfile = {
      id: uuidv4(),
      user_id: authUser.user.id,
      full_name: 'Super Amministratore',
      email: 'superadmin@ticketapp.com'
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert(superAdminProfile)

    if (profileError) {
      console.error('Errore creazione profilo Super Admin:', profileError)
      throw profileError
    }

    // 2. Crea organizzazioni demo
    console.log('🏢 Creazione organizzazioni demo...')
    const organizations = [
      {
        id: uuidv4(),
        name: 'Acme Corporation',
        slug: 'acme-corp',
        is_active: true,
        config: {
          description: 'Azienda leader nel settore tecnologico',
          settings: {
            sla_enabled: true,
            notifications_enabled: true
          }
        }
      },
      {
        id: uuidv4(),
        name: 'TechStart Solutions',
        slug: 'techstart',
        is_active: true,
        config: {
          description: 'Startup innovativa nel campo IT',
          settings: {
            sla_enabled: true,
            notifications_enabled: false
          }
        }
      }
    ]

    const { error: orgError } = await supabase
      .from('organizations')
      .insert(organizations)

    if (orgError) {
      console.error('Errore creazione organizzazioni:', orgError)
      throw orgError
    }

    // 3. Crea membership Super Admin
    const { error: superAdminMembershipError } = await supabase
      .from('memberships')
      .insert({
        id: uuidv4(),
        user_id: superAdminProfile.id,
        org_id: organizations[0].id, // Associa alla prima org per test
        role: 'SUPER_ADMIN',
        is_active: true
      })

    if (superAdminMembershipError) {
      console.error('Errore membership Super Admin:', superAdminMembershipError)
      throw superAdminMembershipError
    }

    // 4. Crea admin aziendali
    console.log('👥 Creazione admin aziendali...')
    const adminUsers = []
    
    for (let i = 0; i < organizations.length; i++) {
      const org = organizations[i]
      const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
        email: `admin@${org.slug}.com`,
        password: 'Admin123!',
        email_confirm: true,
        user_metadata: {
          full_name: `Admin ${org.name}`
        }
      })

      if (adminAuthError) {
        console.error(`Errore creazione admin ${org.name}:`, adminAuthError)
        continue
      }

      const adminProfile = {
        id: uuidv4(),
        user_id: adminAuth.user.id,
        full_name: `Admin ${org.name}`,
        email: `admin@${org.slug}.com`
      }

      const { error: adminProfileError } = await supabase
        .from('profiles')
        .insert(adminProfile)

      if (adminProfileError) {
        console.error('Errore profilo admin:', adminProfileError)
        continue
      }

      // Membership admin
      const { error: adminMembershipError } = await supabase
        .from('memberships')
        .insert({
          id: uuidv4(),
          user_id: adminProfile.id,
          org_id: org.id,
          role: 'ADMIN_AZIENDA',
          is_active: true
        })

      if (adminMembershipError) {
        console.error('Errore membership admin:', adminMembershipError)
        continue
      }

      adminUsers.push(adminProfile)
    }

    // 5. Crea utenti demo
    console.log('👤 Creazione utenti demo...')
    const demoUsers = []
    const userNames = [
      { name: 'Mario Rossi', email: 'mario.rossi' },
      { name: 'Giulia Bianchi', email: 'giulia.bianchi' },
      { name: 'Luca Verdi', email: 'luca.verdi' },
      { name: 'Anna Neri', email: 'anna.neri' },
      { name: 'Paolo Ferrari', email: 'paolo.ferrari' }
    ]

    for (const org of organizations) {
      for (const userData of userNames.slice(0, 3)) { // 3 utenti per org
        const { data: userAuth, error: userAuthError } = await supabase.auth.admin.createUser({
          email: `${userData.email}@${org.slug}.com`,
          password: 'User123!',
          email_confirm: true,
          user_metadata: {
            full_name: userData.name
          }
        })

        if (userAuthError) {
          console.error(`Errore creazione utente ${userData.name}:`, userAuthError)
          continue
        }

        const userProfile = {
          id: uuidv4(),
          user_id: userAuth.user.id,
          full_name: userData.name,
          email: `${userData.email}@${org.slug}.com`
        }

        const { error: userProfileError } = await supabase
          .from('profiles')
          .insert(userProfile)

        if (userProfileError) {
          console.error('Errore profilo utente:', userProfileError)
          continue
        }

        // Membership utente
        const { error: userMembershipError } = await supabase
          .from('memberships')
          .insert({
            id: uuidv4(),
            user_id: userProfile.id,
            org_id: org.id,
            role: 'UTENTE',
            is_active: true
          })

        if (userMembershipError) {
          console.error('Errore membership utente:', userMembershipError)
          continue
        }

        demoUsers.push({ ...userProfile, org_id: org.id })
      }
    }

    // 6. Crea servizi globali
    console.log('🛠️ Creazione servizi globali...')
    const services = [
      {
        id: uuidv4(),
        key: 'noleggio-lungo-termine',
        name: 'Richiesta Noleggio Lungo Termine',
        description: 'Gestione richieste per noleggio veicoli a lungo termine',
        is_active: true,
        form_schema: {
          type: 'object',
          properties: {
            tipo_veicolo: {
              type: 'string',
              title: 'Tipo di Veicolo',
              enum: ['Auto', 'Furgone', 'Moto', 'Altro'],
              description: 'Seleziona il tipo di veicolo richiesto'
            },
            durata_noleggio: {
              type: 'string',
              title: 'Durata Noleggio',
              enum: ['12 mesi', '24 mesi', '36 mesi', '48 mesi'],
              description: 'Durata prevista del contratto'
            },
            budget_mensile: {
              type: 'number',
              title: 'Budget Mensile (€)',
              minimum: 100,
              maximum: 2000,
              description: 'Budget massimo mensile disponibile'
            },
            note_aggiuntive: {
              type: 'string',
              title: 'Note Aggiuntive',
              description: 'Eventuali specifiche o richieste particolari'
            }
          },
          required: ['tipo_veicolo', 'durata_noleggio']
        },
        ui_schema: {
          properties: {
            note_aggiuntive: {
              widget: 'textarea'
            }
          }
        }
      },
      {
        id: uuidv4(),
        key: 'richiesta-telepass',
        name: 'Richiesta Telepass',
        description: 'Richieste per dispositivi Telepass aziendali',
        is_active: true,
        form_schema: {
          type: 'object',
          properties: {
            tipo_dispositivo: {
              type: 'string',
              title: 'Tipo Dispositivo',
              enum: ['Telepass Base', 'Telepass Plus', 'Telepass Pay'],
              description: 'Tipo di dispositivo Telepass richiesto'
            },
            targa_veicolo: {
              type: 'string',
              title: 'Targa Veicolo',
              description: 'Targa del veicolo su cui installare il dispositivo'
            },
            urgenza: {
              type: 'boolean',
              title: 'Richiesta Urgente',
              description: 'Spunta se la richiesta è urgente'
            }
          },
          required: ['tipo_dispositivo', 'targa_veicolo']
        },
        ui_schema: {}
      },
      {
        id: uuidv4(),
        key: 'richiesta-carburante',
        name: 'Richiesta Carburante',
        description: 'Gestione richieste per carte carburante',
        is_active: true,
        form_schema: {
          type: 'object',
          properties: {
            tipo_carta: {
              type: 'string',
              title: 'Tipo Carta Carburante',
              enum: ['Eni', 'Agip', 'Q8', 'Tamoil', 'Universale'],
              description: 'Tipo di carta carburante richiesta'
            },
            limite_mensile: {
              type: 'number',
              title: 'Limite Mensile (€)',
              minimum: 50,
              maximum: 1000,
              description: 'Limite di spesa mensile richiesto'
            },
            giustificazione: {
              type: 'string',
              title: 'Giustificazione',
              description: 'Motivo della richiesta e utilizzo previsto'
            }
          },
          required: ['tipo_carta', 'limite_mensile', 'giustificazione']
        },
        ui_schema: {
          properties: {
            giustificazione: {
              widget: 'textarea'
            }
          }
        }
      }
    ]

    const { error: servicesError } = await supabase
      .from('services')
      .insert(services)

    if (servicesError) {
      console.error('Errore creazione servizi:', servicesError)
      throw servicesError
    }

    // 7. Attiva servizi per le organizzazioni
    console.log('🔗 Attivazione servizi per organizzazioni...')
    const orgServices = []
    for (const org of organizations) {
      for (const service of services) {
        orgServices.push({
          id: uuidv4(),
          org_id: org.id,
          service_id: service.id,
          is_active: true,
          config: {
            custom_settings: {},
            notifications_enabled: true
          }
        })
      }
    }

    const { error: orgServicesError } = await supabase
      .from('org_services')
      .insert(orgServices)

    if (orgServicesError) {
      console.error('Errore attivazione servizi:', orgServicesError)
      throw orgServicesError
    }

    // 8. Crea ticket demo
    console.log('🎫 Creazione ticket demo...')
    const tickets = []
    const ticketTitles = [
      'Problema con il login al sistema',
      'Richiesta nuovo computer portatile',
      'Malfunzionamento stampante ufficio',
      'Accesso negato alla cartella condivisa',
      'Installazione software contabilità',
      'Riparazione aria condizionata',
      'Richiesta badge di accesso',
      'Problema connessione internet',
      'Aggiornamento sistema operativo',
      'Configurazione email aziendale'
    ]

    const statuses = ['aperto', 'in_lavorazione', 'in_attesa', 'risolto', 'chiuso']
    const priorities = ['bassa', 'media', 'alta', 'critica']

    for (let i = 0; i < 10; i++) {
      const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)]
      const randomService = services[Math.floor(Math.random() * services.length)]
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      const randomPriority = priorities[Math.floor(Math.random() * priorities.length)]
      
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30)) // Ultimi 30 giorni

      tickets.push({
        id: uuidv4(),
        org_id: randomUser.org_id,
        created_by: randomUser.id,
        service_id: randomService.id,
        title: ticketTitles[i],
        description: `Descrizione dettagliata per: ${ticketTitles[i]}. Questo è un ticket demo creato durante il seed del database.`,
        status: randomStatus,
        priority: randomPriority,
        tags: ['demo', 'test'],
        form_data: {
          campo_esempio: 'Valore demo',
          numero_esempio: 42
        },
        sla_due_at: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(), // +24h
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString()
      })
    }

    const { error: ticketsError } = await supabase
      .from('tickets')
      .insert(tickets)

    if (ticketsError) {
      console.error('Errore creazione ticket:', ticketsError)
      throw ticketsError
    }

    // 9. Crea messaggi demo per alcuni ticket
    console.log('💬 Creazione messaggi demo...')
    const messages = []
    for (let i = 0; i < 5; i++) { // Solo per i primi 5 ticket
      const ticket = tickets[i]
      const randomUser = demoUsers.find(u => u.org_id === ticket.org_id)
      
      if (randomUser) {
        messages.push({
          id: uuidv4(),
          ticket_id: ticket.id,
          org_id: ticket.org_id,
          author_id: randomUser.id,
          body: `Messaggio demo per il ticket: ${ticket.title}. Questo è un messaggio di esempio creato durante il seed.`,
          is_internal: false,
          created_at: new Date(ticket.created_at).toISOString()
        })
      }
    }

    const { error: messagesError } = await supabase
      .from('ticket_messages')
      .insert(messages)

    if (messagesError) {
      console.error('Errore creazione messaggi:', messagesError)
      throw messagesError
    }

    // 10. Crea turni demo
    console.log('⏰ Creazione turni demo...')
    const shifts = []
    const today = new Date()
    
    for (let i = 0; i < 3; i++) {
      const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)]
      const startTime = new Date(today)
      startTime.setHours(8 + i, 0, 0, 0) // 8:00, 9:00, 10:00
      
      const endTime = new Date(startTime)
      endTime.setHours(startTime.getHours() + 8) // 8 ore di lavoro
      
      shifts.push({
        id: uuidv4(),
        org_id: randomUser.org_id,
        user_id: randomUser.id,
        employee_name: randomUser.full_name,
        start_at: startTime.toISOString(),
        end_at: i < 2 ? endTime.toISOString() : null, // Ultimo turno ancora aperto
        start_geo: {
          lat: 45.4642 + (Math.random() - 0.5) * 0.01, // Milano con variazione
          lon: 9.1900 + (Math.random() - 0.5) * 0.01,
          accuracy: 10,
          captured_at: startTime.toISOString()
        },
        end_geo: i < 2 ? {
          lat: 45.4642 + (Math.random() - 0.5) * 0.01,
          lon: 9.1900 + (Math.random() - 0.5) * 0.01,
          accuracy: 12,
          captured_at: endTime.toISOString()
        } : null,
        status: i < 2 ? 'chiuso' : 'aperto',
        created_at: startTime.toISOString()
      })
    }

    const { error: shiftsError } = await supabase
      .from('shifts')
      .insert(shifts)

    if (shiftsError) {
      console.error('Errore creazione turni:', shiftsError)
      throw shiftsError
    }

    console.log('✅ Seed completato con successo!')
    console.log('\n📋 Credenziali create:')
    console.log('Super Admin: superadmin@ticketapp.com / SuperAdmin123!')
    console.log('Admin Acme: admin@acme-corp.com / Admin123!')
    console.log('Admin TechStart: admin@techstart.com / Admin123!')
    console.log('Utenti demo: mario.rossi@acme-corp.com / User123! (e altri)')
    console.log('\n🎯 Dati creati:')
    console.log(`- ${organizations.length} organizzazioni`)
    console.log(`- ${services.length} servizi globali`)
    console.log(`- ${demoUsers.length + adminUsers.length + 1} utenti totali`)
    console.log(`- ${tickets.length} ticket demo`)
    console.log(`- ${messages.length} messaggi demo`)
    console.log(`- ${shifts.length} turni demo`)

  } catch (error) {
    console.error('❌ Errore durante il seed:', error)
    process.exit(1)
  }
}

// Esegui il seed
seed().then(() => {
  console.log('🏁 Seed terminato')
  process.exit(0)
})
