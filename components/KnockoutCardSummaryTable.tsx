import TeamFlag from '@/components/TeamFlag'
import {
  getKnockoutPredictionResultBadgeClass,
  getKnockoutPredictionResultLabel,
  type KnockoutCardSummaryRow,
} from '@/lib/knockoutCardSummary'

type KnockoutCardSummaryTableProps = {
  rows: KnockoutCardSummaryRow[]
  publicView?: boolean
  emptyMessage?: string
}

const HIDDEN_PREDICTION_TEXT =
  'Pronóstico oculto hasta el inicio del partido'

function isMatchStarted(matchDateIso: string): boolean {
  return new Date(matchDateIso) <= new Date()
}

function formatScore(local: number | null, visitor: number | null): string {
  if (local === null || visitor === null) return 'Pendiente de resultado'
  return `${local} - ${visitor}`
}

function renderPredictedScore(
  row: KnockoutCardSummaryRow,
  publicView: boolean
): string {
  if (publicView && !isMatchStarted(row.match_date)) {
    return HIDDEN_PREDICTION_TEXT
  }
  return formatScore(row.local_score_predicted, row.visitor_score_predicted)
}

function renderPredictedWinner(
  row: KnockoutCardSummaryRow,
  publicView: boolean
): string {
  if (publicView && !isMatchStarted(row.match_date)) {
    return HIDDEN_PREDICTION_TEXT
  }
  return row.predicted_winner_label
}

function renderPoints(row: KnockoutCardSummaryRow, publicView: boolean) {
  if (publicView && !isMatchStarted(row.match_date)) {
    return <span className="text-emerald-800/50">—</span>
  }
  if (!row.counts_for_official_ranking) {
    return (
      <span
        className="font-normal text-emerald-800/50"
        title="Fuera del puntaje oficial (16avos)"
      >
        —
      </span>
    )
  }
  return row.points
}

function TeamCell({
  label,
  flagUrl,
}: {
  label: string
  flagUrl: string | null
}) {
  return (
    <span className="inline-flex items-center gap-2 font-medium text-emerald-950">
      {flagUrl !== null ? (
        <TeamFlag team={{ name: label, flag_url: flagUrl }} />
      ) : null}
      <span>{label}</span>
    </span>
  )
}

export default function KnockoutCardSummaryTable({
  rows,
  publicView = false,
  emptyMessage = 'No hay partidos que coincidan con el filtro seleccionado.',
}: KnockoutCardSummaryTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
        <p className="text-emerald-800/80">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-emerald-100 bg-white shadow-sm lg:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/80">
              <th className="px-4 py-3 font-semibold text-emerald-900">Fase</th>
              <th className="px-4 py-3 font-semibold text-emerald-900">N.º</th>
              <th className="px-4 py-3 font-semibold text-emerald-900">Local</th>
              <th className="px-4 py-3 font-semibold text-emerald-900">
                Visitante
              </th>
              <th className="px-4 py-3 text-center font-semibold text-emerald-900">
                Pronóstico
              </th>
              <th className="px-4 py-3 font-semibold text-emerald-900">
                Clasificado pronosticado
              </th>
              <th className="px-4 py-3 text-center font-semibold text-emerald-900">
                Resultado
              </th>
              <th className="px-4 py-3 font-semibold text-emerald-900">
                Clasificado real
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
                <td className="px-4 py-3 text-emerald-800">{row.phase_label}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-800">
                  {row.match_number ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <TeamCell label={row.local_label} flagUrl={row.local_flag_url} />
                </td>
                <td className="px-4 py-3">
                  <TeamCell
                    label={row.visitor_label}
                    flagUrl={row.visitor_flag_url}
                  />
                </td>
                <td className="px-4 py-3 text-center text-emerald-900">
                  {publicView && !isMatchStarted(row.match_date) ? (
                    <span className="text-xs italic text-emerald-700/70">
                      {HIDDEN_PREDICTION_TEXT}
                    </span>
                  ) : (
                    <span className="tabular-nums">
                      {formatScore(
                        row.local_score_predicted,
                        row.visitor_score_predicted
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {publicView &&
                  !isMatchStarted(row.match_date) ? (
                    <span className="text-xs italic text-emerald-700/70">
                      {HIDDEN_PREDICTION_TEXT}
                    </span>
                  ) : (
                    <TeamCell
                      label={row.predicted_winner_label}
                      flagUrl={row.predicted_winner_flag_url}
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-emerald-900">
                  {formatScore(row.local_score_real, row.visitor_score_real)}
                </td>
                <td className="px-4 py-3">
                  {row.winner_label ? (
                    <TeamCell
                      label={row.winner_label}
                      flagUrl={row.winner_flag_url}
                    />
                  ) : (
                    <span className="text-emerald-800/70">Pendiente de resultado</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center font-semibold tabular-nums text-emerald-700">
                  {renderPoints(row, publicView)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getKnockoutPredictionResultBadgeClass(row.prediction_result)}`}
                    >
                      {getKnockoutPredictionResultLabel(row.prediction_result)}
                    </span>
                    {!row.counts_for_official_ranking && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        Fuera del puntaje oficial
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <li
            key={row.prediction_id}
            className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                {row.phase_label}
              </span>
              {row.match_number !== null && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                  Partido {row.match_number}
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getKnockoutPredictionResultBadgeClass(row.prediction_result)}`}
              >
                {getKnockoutPredictionResultLabel(row.prediction_result)}
              </span>
              {!row.counts_for_official_ranking && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  Fuera del puntaje oficial
                </span>
              )}
            </div>

            <div className="mb-3 space-y-2">
              <TeamCell label={row.local_label} flagUrl={row.local_flag_url} />
              <TeamCell
                label={row.visitor_label}
                flagUrl={row.visitor_flag_url}
              />
            </div>

            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-emerald-50/80 p-2">
                <dt className="text-emerald-700/70">Pronóstico</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-emerald-900">
                  {renderPredictedScore(row, publicView)}
                </dd>
              </div>
              <div className="rounded-lg bg-emerald-50/80 p-2">
                <dt className="text-emerald-700/70">Clasificado pronosticado</dt>
                <dd className="mt-0.5 font-medium text-emerald-900">
                  {renderPredictedWinner(row, publicView)}
                </dd>
              </div>
              <div className="rounded-lg bg-emerald-50/80 p-2">
                <dt className="text-emerald-700/70">Resultado</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-emerald-900">
                  {formatScore(row.local_score_real, row.visitor_score_real)}
                </dd>
              </div>
              <div className="rounded-lg bg-emerald-50/80 p-2">
                <dt className="text-emerald-700/70">Clasificado real</dt>
                <dd className="mt-0.5 font-medium text-emerald-900">
                  {row.winner_label ?? 'Pendiente de resultado'}
                </dd>
              </div>
              <div className="col-span-2 rounded-lg bg-emerald-50/80 p-2 text-center">
                <dt className="text-emerald-700/70">Puntos</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-700">
                  {renderPoints(row, publicView)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
