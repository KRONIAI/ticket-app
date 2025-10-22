import { TicketPriority } from './auth'
import { addHours, addDays, isWeekend, addBusinessDays, differenceInMinutes } from 'date-fns'

export interface SLAConfig {
  responseHours: number
  resolutionHours: number
  workingHoursOnly: boolean
  workingHours: {
    start: number // 0-23
    end: number   // 0-23
  }
  workingDays: number[] // 1-7 (Monday-Sunday)
}

export const DEFAULT_SLA_CONFIG: Record<TicketPriority, SLAConfig> = {
  critica: {
    responseHours: 1,
    resolutionHours: 8,
    workingHoursOnly: false,
    workingHours: { start: 0, end: 23 },
    workingDays: [1, 2, 3, 4, 5, 6, 7]
  },
  alta: {
    responseHours: 4,
    resolutionHours: 24,
    workingHoursOnly: true,
    workingHours: { start: 9, end: 18 },
    workingDays: [1, 2, 3, 4, 5]
  },
  media: {
    responseHours: 8,
    resolutionHours: 48,
    workingHoursOnly: true,
    workingHours: { start: 9, end: 18 },
    workingDays: [1, 2, 3, 4, 5]
  },
  bassa: {
    responseHours: 24,
    resolutionHours: 120, // 5 giorni
    workingHoursOnly: true,
    workingHours: { start: 9, end: 18 },
    workingDays: [1, 2, 3, 4, 5]
  }
}

export function calculateSLADueDate(
  createdAt: Date,
  priority: TicketPriority,
  type: 'response' | 'resolution',
  customConfig?: Partial<SLAConfig>
): Date {
  const config = { ...DEFAULT_SLA_CONFIG[priority], ...customConfig }
  const hours = type === 'response' ? config.responseHours : config.resolutionHours

  if (!config.workingHoursOnly) {
    return addHours(createdAt, hours)
  }

  // Calcolo per orari lavorativi
  let currentDate = new Date(createdAt)
  let remainingHours = hours
  
  while (remainingHours > 0) {
    const dayOfWeek = currentDate.getDay() || 7 // Convert Sunday (0) to 7
    
    // Se è un giorno lavorativo
    if (config.workingDays.includes(dayOfWeek)) {
      const currentHour = currentDate.getHours()
      
      // Se siamo in orario lavorativo
      if (currentHour >= config.workingHours.start && currentHour < config.workingHours.end) {
        const hoursUntilEndOfDay = config.workingHours.end - currentHour
        const hoursToAdd = Math.min(remainingHours, hoursUntilEndOfDay)
        
        currentDate = addHours(currentDate, hoursToAdd)
        remainingHours -= hoursToAdd
      } else if (currentHour < config.workingHours.start) {
        // Prima dell'orario lavorativo, vai all'inizio
        currentDate.setHours(config.workingHours.start, 0, 0, 0)
      } else {
        // Dopo l'orario lavorativo, vai al giorno successivo
        currentDate = addDays(currentDate, 1)
        currentDate.setHours(config.workingHours.start, 0, 0, 0)
      }
    } else {
      // Non è un giorno lavorativo, vai al prossimo giorno lavorativo
      currentDate = addDays(currentDate, 1)
      currentDate.setHours(config.workingHours.start, 0, 0, 0)
    }
  }
  
  return currentDate
}

export function getSLAStatus(
  dueDate: Date,
  completedAt?: Date
): 'on-time' | 'warning' | 'overdue' {
  const now = completedAt || new Date()
  const minutesUntilDue = differenceInMinutes(dueDate, now)
  
  if (minutesUntilDue < 0) {
    return 'overdue'
  } else if (minutesUntilDue < 60) { // Warning se manca meno di 1 ora
    return 'warning'
  } else {
    return 'on-time'
  }
}

export function getSLABadgeColor(status: 'on-time' | 'warning' | 'overdue'): string {
  switch (status) {
    case 'on-time':
      return 'bg-green-100 text-green-800'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800'
    case 'overdue':
      return 'bg-red-100 text-red-800'
  }
}

export function formatSLATime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  } else {
    const days = Math.floor(minutes / 1440)
    const remainingHours = Math.floor((minutes % 1440) / 60)
    return remainingHours > 0 ? `${days}g ${remainingHours}h` : `${days}g`
  }
}
