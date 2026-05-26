const MATCH_DATE_PERU_FORMAT = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Lima',
})

/** Compara instantes UTC; válido con match_date timestamptz desde Supabase. */
export function isMatchPredictionClosed(matchDateIso: string): boolean {
  const now = new Date()
  const matchDate = new Date(matchDateIso)
  return now >= matchDate
}

export function formatMatchDatePeru(matchDateIso: string): string {
  return MATCH_DATE_PERU_FORMAT.format(new Date(matchDateIso))
}
