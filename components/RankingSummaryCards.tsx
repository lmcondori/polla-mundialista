import type { RankingEntry } from '@/lib/types'

type RankingSummaryCardsProps = {
  entries: RankingEntry[]
}

function buildSummary(entries: RankingEntry[]) {
  const uniqueParticipants = new Set(entries.map((e) => e.user_id)).size
  const totalPredictions = entries.reduce(
    (sum, e) => sum + (e.total_predictions ?? 0),
    0
  )
  const maxScore =
    entries.length > 0
      ? Math.max(...entries.map((e) => e.total_points ?? 0))
      : 0

  return {
    totalCards: entries.length,
    uniqueParticipants,
    totalPredictions,
    maxScore,
  }
}

const SUMMARY_ITEMS = [
  {
    key: 'totalCards',
    label: 'Total de cartillas',
    getValue: (s: ReturnType<typeof buildSummary>) => s.totalCards,
  },
  {
    key: 'uniqueParticipants',
    label: 'Participantes únicos',
    getValue: (s: ReturnType<typeof buildSummary>) => s.uniqueParticipants,
  },
  {
    key: 'totalPredictions',
    label: 'Pronósticos registrados',
    getValue: (s: ReturnType<typeof buildSummary>) => s.totalPredictions,
  },
  {
    key: 'maxScore',
    label: 'Mayor puntaje',
    getValue: (s: ReturnType<typeof buildSummary>) => s.maxScore,
  },
] as const

export default function RankingSummaryCards({ entries }: RankingSummaryCardsProps) {
  const summary = buildSummary(entries)

  return (
    <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {SUMMARY_ITEMS.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-emerald-700/70 sm:text-sm">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800 sm:text-3xl">
            {item.getValue(summary)}
          </p>
        </div>
      ))}
    </section>
  )
}
