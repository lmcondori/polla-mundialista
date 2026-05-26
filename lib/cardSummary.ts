import type { CardPredictionDetail, PredictionResultType } from '@/lib/types'

export type PredictionResultFilter = 'ALL' | PredictionResultType

export function getCardStatusLabel(status: string): string {
  if (status === 'ACTIVE') return 'Habilitada'
  if (status === 'INACTIVE') return 'Inhabilitada'
  return status
}

export function getPredictionResultLabel(result: string): string {
  if (result === 'SCORE_EXACTO') return 'Score exacto'
  if (result === 'RESULTADO_ACERTADO') return 'Resultado acertado'
  if (result === 'NO_ACERTADO') return 'No acertado'
  if (result === 'PENDIENTE_RESULTADO') return 'Pendiente de resultado'
  return result
}

export function getPredictionResultBadgeClass(result: string): string {
  if (result === 'SCORE_EXACTO') {
    return 'bg-amber-100 text-amber-800'
  }
  if (result === 'RESULTADO_ACERTADO') {
    return 'bg-emerald-100 text-emerald-800'
  }
  if (result === 'NO_ACERTADO') {
    return 'bg-red-100 text-red-800'
  }
  if (result === 'PENDIENTE_RESULTADO') {
    return 'bg-slate-100 text-slate-700'
  }
  return 'bg-emerald-50 text-emerald-800'
}

export function buildCardSummaryStats(rows: CardPredictionDetail[]) {
  return {
    totalPoints: rows.reduce((sum, row) => sum + (row.points ?? 0), 0),
    exactScores: rows.filter((r) => r.prediction_result === 'SCORE_EXACTO').length,
    resultHits: rows.filter((r) => r.prediction_result === 'RESULTADO_ACERTADO')
      .length,
    missed: rows.filter((r) => r.prediction_result === 'NO_ACERTADO').length,
    pending: rows.filter((r) => r.prediction_result === 'PENDIENTE_RESULTADO')
      .length,
    totalPredictions: rows.length,
  }
}

export const PREDICTION_RESULT_FILTERS: {
  value: PredictionResultFilter
  label: string
}[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'SCORE_EXACTO', label: 'Score exacto' },
  { value: 'RESULTADO_ACERTADO', label: 'Resultado acertado' },
  { value: 'NO_ACERTADO', label: 'No acertado' },
  { value: 'PENDIENTE_RESULTADO', label: 'Pendiente de resultado' },
]
