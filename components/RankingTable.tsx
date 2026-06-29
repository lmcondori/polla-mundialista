import Link from 'next/link'
import type { RankingEntry } from '@/lib/types'

type RankingTableProps = {
  entries: RankingEntry[]
  resultHitsLabel?: string
}

export default function RankingTable({
  entries,
  resultHitsLabel = 'Aciertos',
}: RankingTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
        <p className="text-emerald-800/80">
          Aún no hay cartillas en el ranking.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white shadow-sm">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-emerald-100 bg-emerald-50/80">
            <th className="px-4 py-3 font-semibold text-emerald-900">#</th>
            <th className="px-4 py-3 font-semibold text-emerald-900">Cartilla</th>
            <th className="px-4 py-3 font-semibold text-emerald-900">
              Participante
            </th>
            <th className="px-4 py-3 text-right font-semibold text-emerald-900">
              Puntos
            </th>
            <th className="px-4 py-3 text-right font-semibold text-emerald-900">
              Exactos
            </th>
            <th className="px-4 py-3 text-right font-semibold text-emerald-900">
              {resultHitsLabel}
            </th>
            <th className="px-4 py-3 text-right font-semibold text-emerald-900">
              Pronósticos
            </th>
            <th className="px-4 py-3 text-right font-semibold text-emerald-900">
              Detalle
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-50">
          {entries.map((entry, index) => (
            <tr key={entry.card_id} className="hover:bg-emerald-50/40">
              <td className="px-4 py-3 font-medium text-emerald-800">
                {index + 1}
              </td>
              <td className="px-4 py-3 font-medium text-emerald-950">
                {entry.card_name}
              </td>
              <td className="px-4 py-3 text-emerald-800">{entry.full_name}</td>
              <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                {entry.total_points}
              </td>
              <td className="px-4 py-3 text-right text-emerald-800">
                {entry.exact_scores}
              </td>
              <td className="px-4 py-3 text-right text-emerald-800">
                {entry.result_hits}
              </td>
              <td className="px-4 py-3 text-right text-emerald-800">
                {entry.total_predictions}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/cards-public/${entry.card_id}`}
                  className="inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
