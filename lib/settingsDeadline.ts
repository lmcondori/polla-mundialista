import { formatMatchDatePeru } from '@/lib/matchPrediction'

const PERU_INPUT_PARTS_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatDeadlineDisplayPeru(isoValue: string): string {
  return formatMatchDatePeru(isoValue)
}

export function parseDeadlineToInputs(isoValue: string): {
  date: string
  time: string
} {
  const parts = PERU_INPUT_PARTS_FORMAT.formatToParts(new Date(isoValue))

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
  }
}

/** Construye ISO con offset fijo de Perú (-05:00). */
export function buildPeruDeadlineIso(date: string, time: string): string {
  const [hours, minutes] = time.split(':')
  const hh = (hours ?? '00').padStart(2, '0')
  const mm = (minutes ?? '00').padStart(2, '0')
  return `${date}T${hh}:${mm}:00-05:00`
}
