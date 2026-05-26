import TeamFlag from '@/components/TeamFlag'
import { formatMatchDatePeru } from '@/lib/matchPrediction'
import {
  getPredictionResultBadgeClass,
  getPredictionResultLabel,
} from '@/lib/cardSummary'
import type { CardPredictionDetail } from '@/lib/types'

type CardSummaryTableProps = {
  rows: CardPredictionDetail[]
}

function formatScore(local: number | null, visitor: number | null): string {
  if (local === null || visitor === null) return '—'
  return `${local} - ${visitor}`
}

export default function CardSummaryTable({ rows }: CardSummaryTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
        <p className="text-emerald-800/80">
          No hay partidos que coincidan con el filtro seleccionado.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-emerald-100 bg-white shadow-sm md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/80">
              <th className="px-4 py-3 font-semibold text-emerald-900">Fecha</th>
              <th className="px-4 py-3 font-semibold text-emerald-900">Local</th>
              <th className="px-4 py-3 font-semibold text-emerald-900">
                Visitante
              </th>
              <th className="px-4 py-3 text-center font-semibold text-emerald-900">
                Pronóstico
              </th>
              <th className="px-4 py-3 text-center font-semibold text-emerald-900">
                Resultado
              </th>
              <th className="px-4 py-3 text-center font-semibold text-emerald-900">
                Puntos
              </th>
              <th className="px-4 py-3 font-semibold text-emerald-900">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {rows.map((row) => (
              <tr key={row.prediction_id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-3 text-emerald-800">
                  <time dateTime={row.match_date}>
                    {formatMatchDatePeru(row.match_date)}
                  </time>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-emerald-950">
                    <TeamFlag
                      team={{
                        name: row.local_team_name,
                        flag_url: row.local_team_flag_url,
                      }}
                    />
                    {row.local_team_name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-emerald-950">
                    <TeamFlag
                      team={{
                        name: row.visitor_team_name,
                        flag_url: row.visitor_team_flag_url,
                      }}
                    />
                    {row.visitor_team_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-emerald-900">
                  {formatScore(
                    row.local_score_predicted,
                    row.visitor_score_predicted
                  )}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-emerald-900">
                  {formatScore(row.local_score_real, row.visitor_score_real)}
                </td>
                <td className="px-4 py-3 text-center font-semibold tabular-nums text-emerald-700">
                  {row.points}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getPredictionResultBadgeClass(row.prediction_result)}`}
                  >
                    {getPredictionResultLabel(row.prediction_result)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={row.prediction_id}
            className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <time
                dateTime={row.match_date}
                className="text-xs text-emerald-700/75"
              >
                {formatMatchDatePeru(row.match_date)}
              </time>
              {row.group_name && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                  Grupo {row.group_name}
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getPredictionResultBadgeClass(row.prediction_result)}`}
              >
                {getPredictionResultLabel(row.prediction_result)}
              </span>
            </div>

            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-2 font-medium text-emerald-950">
                <TeamFlag
                  team={{
                    name: row.local_team_name,
                    flag_url: row.local_team_flag_url,
                  }}
                />
                <span>{row.local_team_name}</span>
              </div>
              <div className="flex items-center gap-2 font-medium text-emerald-950">
                <TeamFlag
                  team={{
                    name: row.visitor_team_name,
                    flag_url: row.visitor_team_flag_url,
                  }}
                />
                <span>{row.visitor_team_name}</span>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-emerald-50/80 p-2">
                <dt className="text-emerald-700/70">Pronóstico</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-emerald-900">
                  {formatScore(
                    row.local_score_predicted,
                    row.visitor_score_predicted
                  )}
                </dd>
              </div>
              <div className="rounded-lg bg-emerald-50/80 p-2">
                <dt className="text-emerald-700/70">Resultado</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-emerald-900">
                  {formatScore(row.local_score_real, row.visitor_score_real)}
                </dd>
              </div>
              <div className="rounded-lg bg-emerald-50/80 p-2">
                <dt className="text-emerald-700/70">Puntos</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-emerald-700">
                  {row.points}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
