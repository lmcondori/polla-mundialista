type CardPredictionsSummaryProps = {
  total: number
  predicted: number
  pending: number
  closed: number
}

const ITEMS = [
  { key: 'total', label: 'Total de partidos' },
  { key: 'predicted', label: 'Pronosticados' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'closed', label: 'Cerrados' },
] as const

export default function CardPredictionsSummary({
  total,
  predicted,
  pending,
  closed,
}: CardPredictionsSummaryProps) {
  const values = { total, predicted, pending, closed }

  return (
    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {ITEMS.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-emerald-700/70 sm:text-sm">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800 sm:text-3xl">
            {values[item.key]}
          </p>
        </div>
      ))}
    </section>
  )
}
