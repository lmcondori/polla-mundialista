import TeamFlag from '@/components/TeamFlag'
import type { ThirdPlaceRow } from '@/lib/knockoutPreviewTypes'

type BestThirdsTabProps = {
  thirds: ThirdPlaceRow[]
}

export default function BestThirdsTab({ thirds }: BestThirdsTabProps) {
  if (thirds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
        <p className="text-emerald-800/80">
          Aún no hay terceros puestos calculables con resultados registrados.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/80">
              <th className="px-4 py-3 font-semibold text-emerald-900">#</th>
              <th className="px-4 py-3 font-semibold text-emerald-900">Grupo</th>
              <th className="px-4 py-3 font-semibold text-emerald-900">Equipo</th>
              <th className="px-4 py-3 text-right font-semibold text-emerald-900">
                PTS
              </th>
              <th className="px-4 py-3 text-right font-semibold text-emerald-900">
                DG
              </th>
              <th className="px-4 py-3 text-right font-semibold text-emerald-900">
                GF
              </th>
              <th className="px-4 py-3 text-right font-semibold text-emerald-900">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {thirds.map((row, index) => (
              <tr
                key={row.team.id}
                className={row.qualifies ? 'bg-amber-50/60' : ''}
              >
                <td className="px-4 py-3 font-medium text-emerald-800">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-medium text-emerald-900">
                  {row.group}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TeamFlag team={row.team} className="h-4 w-5" />
                    <span className="font-medium text-emerald-950">
                      {row.team.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                  {row.points}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.goalsFor}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.qualifies
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {row.qualifies ? 'Clasifica' : 'Eliminado'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
