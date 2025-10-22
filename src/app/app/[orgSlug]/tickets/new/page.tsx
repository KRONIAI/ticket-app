'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { calculateSLADueDate } from '@/lib/sla'

interface Service {
  id: string
  name: string
  description: string | null
  form_schema: any
  ui_schema: any
}

interface NewTicketPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function NewTicketPage({ params }: NewTicketPageProps) {
  const { orgSlug } = await params
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'media' as 'bassa' | 'media' | 'alta' | 'critica',
    service_id: '',
    form_data: {} as Record<string, any>
  })

  // Carica i servizi disponibili
  useEffect(() => {
    const loadServices = async () => {
      const { data: orgServices } = await supabase
        .from('org_services')
        .select(`
          service:services(*)
        `)
        .eq('org_id', orgSlug) // Assumendo che orgSlug sia l'ID per semplicità
        .eq('is_active', true)

      if (orgServices) {
        const servicesList = orgServices.map(os => os.service).filter(Boolean)
        setServices(servicesList)

        // Se c'è un servizio preselezionato nei query params
        const preselectedServiceId = searchParams.get('service')
        if (preselectedServiceId) {
          const preselected = servicesList.find(s => s.id === preselectedServiceId)
          if (preselected) {
            setSelectedService(preselected)
            setFormData(prev => ({ ...prev, service_id: preselected.id }))
          }
        }
      }
    }

    loadServices()
  }, [orgSlug, searchParams, supabase])

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    setSelectedService(service || null)
    setFormData(prev => ({ 
      ...prev, 
      service_id: serviceId,
      form_data: {} // Reset form data quando cambia servizio
    }))
  }

  const handleDynamicFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      form_data: {
        ...prev.form_data,
        [fieldName]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Ottieni l'utente corrente
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utente non autenticato')

      // Ottieni il profilo
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!profile) throw new Error('Profilo non trovato')

      // Ottieni l'organizzazione
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single()

      if (!org) throw new Error('Organizzazione non trovata')

      // Calcola la scadenza SLA
      const slaDate = calculateSLADueDate(
        new Date(),
        formData.priority,
        'resolution'
      )

      // Crea il ticket
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          org_id: org.id,
          created_by: profile.id,
          service_id: formData.service_id || null,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          form_data: formData.form_data,
          sla_due_at: slaDate.toISOString(),
          status: 'aperto'
        })
        .select()
        .single()

      if (error) throw error

      // Reindirizza al ticket creato
      router.push(`/app/${orgSlug}/tickets/${ticket.id}`)
    } catch (error) {
      console.error('Errore nella creazione del ticket:', error)
      // TODO: Mostra errore all'utente
    } finally {
      setLoading(false)
    }
  }

  const renderDynamicFields = () => {
    if (!selectedService?.form_schema) return null

    const schema = selectedService.form_schema as any
    const uiSchema = selectedService.ui_schema as any

    if (!schema.properties) return null

    return Object.entries(schema.properties).map(([fieldName, fieldSchema]: [string, any]) => {
      const fieldValue = formData.form_data[fieldName] || ''
      const fieldUI = uiSchema?.properties?.[fieldName] || {}

      switch (fieldSchema.type) {
        case 'string':
          if (fieldSchema.enum) {
            return (
              <div key={fieldName} className="space-y-2">
                <Label htmlFor={fieldName}>
                  {fieldSchema.title || fieldName}
                  {schema.required?.includes(fieldName) && ' *'}
                </Label>
                <Select
                  value={fieldValue}
                  onValueChange={(value) => handleDynamicFieldChange(fieldName, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldSchema.enum.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldSchema.description && (
                  <p className="text-sm text-muted-foreground">
                    {fieldSchema.description}
                  </p>
                )}
              </div>
            )
          } else if (fieldUI.widget === 'textarea') {
            return (
              <div key={fieldName} className="space-y-2">
                <Label htmlFor={fieldName}>
                  {fieldSchema.title || fieldName}
                  {schema.required?.includes(fieldName) && ' *'}
                </Label>
                <Textarea
                  id={fieldName}
                  value={fieldValue}
                  onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
                  placeholder={fieldSchema.description}
                  required={schema.required?.includes(fieldName)}
                />
              </div>
            )
          } else {
            return (
              <div key={fieldName} className="space-y-2">
                <Label htmlFor={fieldName}>
                  {fieldSchema.title || fieldName}
                  {schema.required?.includes(fieldName) && ' *'}
                </Label>
                <Input
                  id={fieldName}
                  type={fieldUI.inputType || 'text'}
                  value={fieldValue}
                  onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
                  placeholder={fieldSchema.description}
                  required={schema.required?.includes(fieldName)}
                />
              </div>
            )
          }

        case 'number':
          return (
            <div key={fieldName} className="space-y-2">
              <Label htmlFor={fieldName}>
                {fieldSchema.title || fieldName}
                {schema.required?.includes(fieldName) && ' *'}
              </Label>
              <Input
                id={fieldName}
                type="number"
                value={fieldValue}
                onChange={(e) => handleDynamicFieldChange(fieldName, parseFloat(e.target.value) || '')}
                placeholder={fieldSchema.description}
                required={schema.required?.includes(fieldName)}
                min={fieldSchema.minimum}
                max={fieldSchema.maximum}
              />
            </div>
          )

        case 'boolean':
          return (
            <div key={fieldName} className="flex items-center space-x-2">
              <input
                id={fieldName}
                type="checkbox"
                checked={fieldValue || false}
                onChange={(e) => handleDynamicFieldChange(fieldName, e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor={fieldName}>
                {fieldSchema.title || fieldName}
              </Label>
            </div>
          )

        default:
          return null
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/app/${orgSlug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Dashboard
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuova Richiesta</h1>
        <p className="text-muted-foreground">
          Crea una nuova richiesta di assistenza
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli Richiesta</CardTitle>
          <CardDescription>
            Compila tutti i campi richiesti per creare la tua richiesta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selezione servizio */}
            <div className="space-y-2">
              <Label htmlFor="service">Tipo di Servizio *</Label>
              <Select
                value={formData.service_id}
                onValueChange={handleServiceChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un servizio..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campi base */}
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Breve descrizione del problema o richiesta"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrivi in dettaglio la tua richiesta..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorità *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bassa">Bassa - Non urgente</SelectItem>
                  <SelectItem value="media">Media - Normale</SelectItem>
                  <SelectItem value="alta">Alta - Urgente</SelectItem>
                  <SelectItem value="critica">Critica - Blocca il lavoro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campi dinamici del servizio */}
            {selectedService && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">Informazioni Aggiuntive</h3>
                {renderDynamicFields()}
              </div>
            )}

            {/* Azioni */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href={`/app/${orgSlug}`}>
                  Annulla
                </Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Crea Richiesta
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
