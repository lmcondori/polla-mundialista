import {
  getKnockoutPhaseLabel,
  getKnockoutSideLabel,
  isKnockoutOfficialRankingPhase,
  sortKnockoutMatchesByPhaseAndDate,
} from '@/lib/knockoutMatches'
import type { KnockoutMatchWithTeams, Team } from '@/lib/types'

export type KnockoutPredictionRow = {
  id: string
  card_id: string
  match_id: string
  local_score_predicted: number
  visitor_score_predicted: number
  predicted_winner_team_id: string | null
  points: number
}

export type KnockoutPredictionResultType =
  | 'KNOCKOUT_EXACT_AND_CLASSIFIER'
  | 'KNOCKOUT_EXACT_SCORE'
  | 'RESULTADO_ACERTADO'
  | 'NO_ACERTADO'
  | 'PENDIENTE_RESULTADO'

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
  predicted_winner_team_id: string | null
  predicted_winner_label: string
  predicted_winner_flag_url: string | null
  local_score_real: number | null
  visitor_score_real: number | null
  winner_team_id: string | null
  winner_label: string | null
  winner_flag_url: string | null
  points: number
  prediction_result: KnockoutPredictionResultType
  counts_for_official_ranking: boolean
  match_date: string
}

export type KnockoutResultFilter = 'ALL' | KnockoutPredictionResultType

export const KNOCKOUT_OFFICIAL_SCORING_NOTE =
  'El puntaje oficial de llaves se calcula desde octavos de final hasta la final. Los 16avos se muestran como referencia y no suman al ranking oficial.'

export const KNOCKOUT_SUMMARY_LABELS = {
  totalPoints: 'Puntos oficiales',
  exactScores: 'Marcadores exactos',
  resultHits: 'Clasificados acertados',
  totalPredictions: 'Pronósticos oficiales',
} as const

export function getKnockoutSummaryStatLabelProps() {
  return {
    exactScoresLabel: KNOCKOUT_SUMMARY_LABELS.exactScores,
    resultHitsLabel: KNOCKOUT_SUMMARY_LABELS.resultHits,
    totalPointsLabel: KNOCKOUT_SUMMARY_LABELS.totalPoints,
    totalPredictionsLabel: KNOCKOUT_SUMMARY_LABELS.totalPredictions,
  }
}

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
  return getKnockoutSideLabel(match, side)
}

export function hasKnockoutMatchResult(
  match: Pick<KnockoutMatchWithTeams, 'local_score_real' | 'visitor_score_real'>
): boolean {
  return match.local_score_real !== null && match.visitor_score_real !== null
}

/** Estado de llaves según points ya calculados en BD (regla compuesta 3+2). */
export function getKnockoutPredictionResultFromPoints(
  points: number,
  hasResult: boolean
): KnockoutPredictionResultType {
  if (!hasResult) return 'PENDIENTE_RESULTADO'
  if (points === 5) return 'KNOCKOUT_EXACT_AND_CLASSIFIER'
  if (points === 3) return 'KNOCKOUT_EXACT_SCORE'
  if (points === 2) return 'RESULTADO_ACERTADO'
  return 'NO_ACERTADO'
}

export function getKnockoutPredictionResult(
  match: Pick<KnockoutMatchWithTeams, 'local_score_real' | 'visitor_score_real'>,
  points: number
): KnockoutPredictionResultType {
  return getKnockoutPredictionResultFromPoints(
    points,
    hasKnockoutMatchResult(match)
  )
}

export function getKnockoutPredictionResultLabel(result: string): string {
  if (result === 'KNOCKOUT_EXACT_AND_CLASSIFIER') {
    return 'Marcador exacto + clasificado'
  }
  if (result === 'KNOCKOUT_EXACT_SCORE') return 'Marcador exacto'
  if (result === 'RESULTADO_ACERTADO') return 'Clasificado acertado'
  if (result === 'NO_ACERTADO') return 'No acertado'
  if (result === 'PENDIENTE_RESULTADO') return 'Pendiente de resultado'
  if (result === 'SCORE_EXACTO') return 'Marcador exacto'
  if (result === 'SIN_CALCULAR') return 'Pendiente de resultado'
  return result
}

export function getKnockoutPredictionResultBadgeClass(result: string): string {
  if (result === 'KNOCKOUT_EXACT_AND_CLASSIFIER') {
    return 'bg-violet-100 text-violet-900'
  }
  if (result === 'KNOCKOUT_EXACT_SCORE' || result === 'SCORE_EXACTO') {
    return 'bg-amber-100 text-amber-800'
  }
  if (result === 'RESULTADO_ACERTADO') {
    return 'bg-emerald-100 text-emerald-800'
  }
  if (result === 'NO_ACERTADO') return 'bg-red-100 text-red-800'
  if (result === 'PENDIENTE_RESULTADO' || result === 'SIN_CALCULAR') {
    return 'bg-slate-100 text-slate-700'
  }
  return 'bg-emerald-50 text-emerald-800'
}

export function resolveKnockoutRowResultDisplay(row: KnockoutCardSummaryRow): {
  result: KnockoutPredictionResultType
  label: string
  badgeClass: string
} {
  const result = getKnockoutPredictionResultFromPoints(
    row.points,
    hasKnockoutMatchResult(row)
  )

  return {
    result,
    label: getKnockoutPredictionResultLabel(result),
    badgeClass: getKnockoutPredictionResultBadgeClass(result),
  }
}

export function isKnockoutExactScore(row: KnockoutCardSummaryRow): boolean {
  if (!hasKnockoutMatchResult(row)) return false
  return (
    row.local_score_predicted === row.local_score_real &&
    row.visitor_score_predicted === row.visitor_score_real
  )
}

export function isKnockoutClassifierHit(row: KnockoutCardSummaryRow): boolean {
  if (!hasKnockoutMatchResult(row)) return false
  if (row.predicted_winner_team_id && row.winner_team_id) {
    return row.predicted_winner_team_id === row.winner_team_id
  }
  return row.points === 2 || row.points === 5
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
      const predictionResult = getKnockoutPredictionResult(
        match,
        prediction.points
      )

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
          predicted_winner_team_id: prediction.predicted_winner_team_id,
          predicted_winner_label: predictedWinner?.name ?? 'Sin clasificado',
          predicted_winner_flag_url: predictedWinner?.flag_url ?? null,
          local_score_real: match.local_score_real,
          visitor_score_real: match.visitor_score_real,
          winner_team_id: match.winner_team_id,
          winner_label: realWinner?.name ?? null,
          winner_flag_url: realWinner?.flag_url ?? null,
          points: prediction.points,
          prediction_result: predictionResult,
          counts_for_official_ranking: isKnockoutOfficialRankingPhase(match.phase),
          match_date: match.match_date,
        },
      ]
    })
}

export function getKnockoutOfficialSummaryRows(
  rows: KnockoutCardSummaryRow[]
): KnockoutCardSummaryRow[] {
  return rows.filter((row) => row.counts_for_official_ranking)
}

export function buildKnockoutCardSummaryStats(rows: KnockoutCardSummaryRow[]) {
  const officialRows = getKnockoutOfficialSummaryRows(rows)

  return {
    totalPoints: officialRows.reduce((sum, row) => sum + (row.points ?? 0), 0),
    exactScores: officialRows.filter(isKnockoutExactScore).length,
    resultHits: officialRows.filter(isKnockoutClassifierHit).length,
    missed: officialRows.filter(
      (row) =>
        hasKnockoutMatchResult(row) &&
        getKnockoutPredictionResultFromPoints(row.points, true) === 'NO_ACERTADO'
    ).length,
    pending: officialRows.filter((row) => !hasKnockoutMatchResult(row)).length,
    totalPredictions: officialRows.length,
  }
}

export const KNOCKOUT_PREDICTION_RESULT_FILTERS: {
  value: KnockoutResultFilter
  label: string
}[] = [
  { value: 'ALL', label: 'Todos' },
  {
    value: 'KNOCKOUT_EXACT_AND_CLASSIFIER',
    label: 'Marcador exacto + clasificado',
  },
  { value: 'KNOCKOUT_EXACT_SCORE', label: 'Marcador exacto' },
  { value: 'RESULTADO_ACERTADO', label: 'Clasificado acertado' },
  { value: 'NO_ACERTADO', label: 'No acertado' },
  { value: 'PENDIENTE_RESULTADO', label: 'Pendiente de resultado' },
]
