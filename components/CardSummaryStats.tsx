type CardSummaryStatsProps = {
  totalPoints: number
  exactScores: number
  resultHits: number
  missed: number
  pending: number
  totalPredictions: number
  resultHitsLabel?: string
}

const BASE_ITEMS = [
  { key: 'totalPoints', label: 'Puntos totales' },
  { key: 'exactScores', label: 'Scores exactos' },
  { key: 'resultHits', label: 'Aciertos de resultado' },
  { key: 'missed', label: 'No acertados' },
  { key: 'pending', label: 'Pendientes de resultado' },
  { key: 'totalPredictions', label: 'Total de pronósticos' },
] as const

export default function CardSummaryStats({
  totalPoints,
  exactScores,
  resultHits,
  missed,
  pending,
  totalPredictions,
  resultHitsLabel,
}: CardSummaryStatsProps) {
  const items = BASE_ITEMS.map((item) =>
    item.key === 'resultHits' && resultHitsLabel
      ? { ...item, label: resultHitsLabel }
      : item
  )
  const values = {
    totalPoints,
    exactScores,
    resultHits,
    missed,
    pending,
    totalPredictions,
  }

  return (
    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-emerald-700/70">{item.label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">
            {values[item.key]}
          </p>
        </div>
      ))}
    </section>
  )
}
