export interface ChatCommand {
  command: string
  args: string[]
  originalText: string
}

export interface GeolocationData {
  lat: number
  lon: number
  accuracy: number
  captured_at: string
}

export interface ShiftStartCommand {
  type: 'shift_start'
  employeeName: string
  firstName: string
  lastName: string
}

export interface ShiftEndCommand {
  type: 'shift_end'
}

export type ParsedCommand = ShiftStartCommand | ShiftEndCommand | null

const COMMAND_PATTERNS = {
  SHIFT_START: /^\/inizio_giornata\s+(.+)$/i,
  SHIFT_END: /^\/fine_giornata$/i,
}

export function parseCommand(text: string): ParsedCommand {
  const trimmedText = text.trim()
  
  // Comando inizio giornata
  const startMatch = trimmedText.match(COMMAND_PATTERNS.SHIFT_START)
  if (startMatch) {
    const fullName = startMatch[1].trim()
    const nameParts = fullName.split(/\s+/)
    
    if (nameParts.length < 2) {
      throw new Error('Formato comando non valido. Usa: /inizio_giornata Nome Cognome')
    }
    
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')
    
    return {
      type: 'shift_start',
      employeeName: fullName,
      firstName,
      lastName
    }
  }
  
  // Comando fine giornata
  const endMatch = trimmedText.match(COMMAND_PATTERNS.SHIFT_END)
  if (endMatch) {
    return {
      type: 'shift_end'
    }
  }
  
  return null
}

export function isCommand(text: string): boolean {
  return text.trim().startsWith('/')
}

export function getCommandHelp(): string {
  return `
**Comandi disponibili:**

\`/inizio_giornata Nome Cognome\`
- Registra l'inizio del turno di lavoro
- Richiede geolocalizzazione per tracciare la posizione
- Esempio: \`/inizio_giornata Mario Rossi\`

\`/fine_giornata\`
- Registra la fine del turno di lavoro
- Calcola automaticamente la durata del turno
- Richiede geolocalizzazione per tracciare la posizione

**Note:**
- I comandi richiedono l'accesso alla geolocalizzazione
- È possibile avere solo un turno aperto alla volta
- I dati di geolocalizzazione sono visibili solo agli amministratori della tua organizzazione
  `.trim()
}

export async function getCurrentPosition(): Promise<GeolocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalizzazione non supportata dal browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          captured_at: new Date().toISOString()
        })
      },
      (error) => {
        let message = 'Errore nella geolocalizzazione'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Accesso alla geolocalizzazione negato'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Posizione non disponibile'
            break
          case error.TIMEOUT:
            message = 'Timeout nella richiesta di geolocalizzazione'
            break
        }
        reject(new Error(message))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  })
}

export function formatShiftDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  
  if (hours === 0) {
    return `${remainingMinutes} minuti`
  } else if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'ora' : 'ore'}`
  } else {
    return `${hours} ${hours === 1 ? 'ora' : 'ore'} e ${remainingMinutes} minuti`
  }
}

export function formatGeolocation(geo: GeolocationData): string {
  return `📍 Lat: ${geo.lat.toFixed(6)}, Lon: ${geo.lon.toFixed(6)} (±${Math.round(geo.accuracy)}m)`
}
