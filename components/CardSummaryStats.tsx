type CardSummaryStatsProps = {
  totalPoints: number
  exactScores: number
  resultHits: number
  missed: number
  pending: number
  totalPredictions: number
  exactScoresLabel?: string
  resultHitsLabel?: string
  totalPointsLabel?: string
  totalPredictionsLabel?: string
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
  exactScoresLabel,
  resultHitsLabel,
  totalPointsLabel,
  totalPredictionsLabel,
}: CardSummaryStatsProps) {
  const items = BASE_ITEMS.map((item) => {
    if (item.key === 'exactScores' && exactScoresLabel) {
      return { ...item, label: exactScoresLabel }
    }
    if (item.key === 'resultHits' && resultHitsLabel) {
      return { ...item, label: resultHitsLabel }
    }
    if (item.key === 'totalPoints' && totalPointsLabel) {
      return { ...item, label: totalPointsLabel }
    }
    if (item.key === 'totalPredictions' && totalPredictionsLabel) {
      return { ...item, label: totalPredictionsLabel }
    }
    return item
  })
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
