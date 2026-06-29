import {
  formatKnockoutSidePlaceholder,
  getKnockoutPhaseLabel,
  isKnockoutSideDefined,
  sortKnockoutMatchesByPhaseAndDate,
} from '@/lib/knockoutMatches'
import type {
  KnockoutMatchWithTeams,
  PredictionResultType,
  Team,
} from '@/lib/types'

export type KnockoutPredictionRow = {
  id: string
  card_id: string
  match_id: string
  local_score_predicted: number
  visitor_score_predicted: number
  predicted_winner_team_id: string | null
  points: number
}

export type KnockoutCardSummaryRow = {
  prediction_id: string
  match_id: string
  phase: string
  phase_label: string
  match_number: number | null
  local_label: string
  local_flag_url: string | null
  visitor_label: string
  visitor_flag_url: string | null
  local_score_predicted: number
  visitor_score_predicted: number
  predicted_winner_label: string
  predicted_winner_flag_url: string | null
  local_score_real: number | null
  visitor_score_real: number | null
  winner_label: string | null
  winner_flag_url: string | null
  points: number
  prediction_result: PredictionResultType
}

export type KnockoutResultFilter = 'ALL' | PredictionResultType

function resolveTeamById(
  match: KnockoutMatchWithTeams,
  teamId: string | null | undefined
): Team | null {
  if (!teamId) return null
  if (teamId === match.local_team_id) return match.local_team
  if (teamId === match.visitor_team_id) return match.visitor_team
  return null
}

function getSideDisplay(
  match: KnockoutMatchWithTeams,
  side: 'local' | 'visitor'
): { label: string; flag_url: string | null } {
  const team = side === 'local' ? match.local_team : match.visitor_team
  if (isKnockoutSideDefined(match, side) && team) {
    return { label: team.name, flag_url: team.flag_url ?? null }
  }
  return {
    label: formatKnockoutSidePlaceholder(match, side) ?? 'Por definir',
    flag_url: null,
  }
}

export function getKnockoutPredictionResult(
  match: KnockoutMatchWithTeams,
  points: number
): PredictionResultType {
  const hasResult =
    match.local_score_real !== null &&
    match.visitor_score_real !== null &&
    match.winner_team_id !== null

  if (!hasResult) return 'PENDIENTE_RESULTADO'
  if (points === 5) return 'SCORE_EXACTO'
  if (points === 3) return 'RESULTADO_ACERTADO'
  return 'NO_ACERTADO'
}

export function getKnockoutPredictionResultLabel(result: string): string {
  if (result === 'SCORE_EXACTO') return 'Score exacto'
  if (result === 'RESULTADO_ACERTADO') return 'Clasificado acertado'
  if (result === 'NO_ACERTADO') return 'No acertado'
  if (result === 'PENDIENTE_RESULTADO') return 'Pendiente de resultado'
  return result
}

export function getKnockoutPredictionResultBadgeClass(result: string): string {
  if (result === 'SCORE_EXACTO') return 'bg-amber-100 text-amber-800'
  if (result === 'RESULTADO_ACERTADO') return 'bg-emerald-100 text-emerald-800'
  if (result === 'NO_ACERTADO') return 'bg-red-100 text-red-800'
  if (result === 'PENDIENTE_RESULTADO') return 'bg-slate-100 text-slate-700'
  return 'bg-emerald-50 text-emerald-800'
}

export function buildKnockoutCardSummaryRows(
  predictions: KnockoutPredictionRow[],
  matches: KnockoutMatchWithTeams[]
): KnockoutCardSummaryRow[] {
  const matchesById = new Map(matches.map((match) => [match.id, match]))
  const orderedMatches = sortKnockoutMatchesByPhaseAndDate(
    predictions
      .map((prediction) => matchesById.get(prediction.match_id))
      .filter((match): match is KnockoutMatchWithTeams => match !== undefined)
  )
  const orderIndex = new Map(orderedMatches.map((match, index) => [match.id, index]))

  return [...predictions]
    .sort((a, b) => {
      const orderA = orderIndex.get(a.match_id) ?? Number.MAX_SAFE_INTEGER
      const orderB = orderIndex.get(b.match_id) ?? Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })
    .flatMap((prediction) => {
      const match = matchesById.get(prediction.match_id)
      if (!match) return []

      const local = getSideDisplay(match, 'local')
      const visitor = getSideDisplay(match, 'visitor')
      const predictedWinner = resolveTeamById(
        match,
        prediction.predicted_winner_team_id
      )
      const realWinner = resolveTeamById(match, match.winner_team_id)
      const predictionResult = getKnockoutPredictionResult(match, prediction.points)

      return [
        {
          prediction_id: prediction.id,
          match_id: prediction.match_id,
          phase: match.phase,
          phase_label: getKnockoutPhaseLabel(match.phase),
          match_number: match.match_number,
          local_label: local.label,
          local_flag_url: local.flag_url,
          visitor_label: visitor.label,
          visitor_flag_url: visitor.flag_url,
          local_score_predicted: prediction.local_score_predicted,
          visitor_score_predicted: prediction.visitor_score_predicted,
          predicted_winner_label: predictedWinner?.name ?? '—',
          predicted_winner_flag_url: predictedWinner?.flag_url ?? null,
          local_score_real: match.local_score_real,
          visitor_score_real: match.visitor_score_real,
          winner_label: realWinner?.name ?? null,
          winner_flag_url: realWinner?.flag_url ?? null,
          points: prediction.points,
          prediction_result: predictionResult,
        },
      ]
    })
}

export function buildKnockoutCardSummaryStats(rows: KnockoutCardSummaryRow[]) {
  return {
    totalPoints: rows.reduce((sum, row) => sum + (row.points ?? 0), 0),
    exactScores: rows.filter((row) => row.prediction_result === 'SCORE_EXACTO')
      .length,
    resultHits: rows.filter(
      (row) => row.prediction_result === 'RESULTADO_ACERTADO'
    ).length,
    missed: rows.filter((row) => row.prediction_result === 'NO_ACERTADO').length,
    pending: rows.filter(
      (row) => row.prediction_result === 'PENDIENTE_RESULTADO'
    ).length,
    totalPredictions: rows.length,
  }
}

export const KNOCKOUT_PREDICTION_RESULT_FILTERS: {
  value: KnockoutResultFilter
  label: string
}[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'SCORE_EXACTO', label: 'Score exacto' },
  { value: 'RESULTADO_ACERTADO', label: 'Clasificado acertado' },
  { value: 'NO_ACERTADO', label: 'No acertado' },
  { value: 'PENDIENTE_RESULTADO', label: 'Pendiente de resultado' },
]
