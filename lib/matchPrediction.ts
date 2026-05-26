const MATCH_DATE_PERU_FORMAT = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Lima',
})

const PERU_DATE_LABEL_LONG_FORMAT = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Lima',
})

function getPeruDateParts(dateIso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(dateIso))

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'

  return { year, month, day }
}

/** Compara instantes UTC; válido con match_date timestamptz desde Supabase. */
export function isMatchPredictionClosed(matchDateIso: string): boolean {
  const now = new Date()
  const matchDate = new Date(matchDateIso)
  return now >= matchDate
}

export function formatMatchDatePeru(matchDateIso: string): string {
  return MATCH_DATE_PERU_FORMAT.format(new Date(matchDateIso))
}

export function getPeruDateKey(dateIso: string): string {
  const { year, month, day } = getPeruDateParts(dateIso)
  return `${year}-${month}-${day}`
}

export function getPeruDateLabelLong(dateIso: string): string {
  return PERU_DATE_LABEL_LONG_FORMAT.format(new Date(dateIso))
}

export function sortMatchesByDateAsc<T extends { match_date: string }>(
  matches: T[]
): T[] {
  return [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )
}
