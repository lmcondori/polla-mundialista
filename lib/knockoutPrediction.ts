import { isKnockoutMatchTeamsDefined } from '@/lib/knockoutMatches'
import { isMatchPredictionClosed } from '@/lib/matchPrediction'
import type { KnockoutMatchWithTeams, KnockoutPredictionPick } from '@/lib/types'

export type KnockoutPredictionInput = {
  localScore: string
  visitorScore: string
  winnerTeamId: string
}

export function canEditKnockoutPrediction(
  match: KnockoutMatchWithTeams
): boolean {
  return (
    isKnockoutMatchTeamsDefined(match) &&
    !isMatchPredictionClosed(match.match_date)
  )
}

export function isKnockoutPredictionComplete(
  prediction: KnockoutPredictionPick | undefined
): boolean {
  if (!prediction) return false
  return prediction.predicted_winner_team_id != null
}

export function validateKnockoutPredictionSave(
  match: KnockoutMatchWithTeams,
  input: KnockoutPredictionInput
):
  | { ok: true; local: number; visitor: number; winnerTeamId: string }
  | { ok: false; error: string } {
  if (!isKnockoutMatchTeamsDefined(match)) {
    return { ok: false, error: 'El partido aún no tiene equipos definidos.' }
  }

  if (isMatchPredictionClosed(match.match_date)) {
    return { ok: false, error: 'El pronóstico está cerrado.' }
  }

  const local = Number.parseInt(input.localScore, 10)
  const visitor = Number.parseInt(input.visitorScore, 10)

  if (
    Number.isNaN(local) ||
    Number.isNaN(visitor) ||
    local < 0 ||
    visitor < 0
  ) {
    return { ok: false, error: 'Ingresa goles válidos (números enteros ≥ 0).' }
  }

  if (!input.winnerTeamId) {
    return { ok: false, error: 'Selecciona el equipo clasificado.' }
  }

  if (
    input.winnerTeamId !== match.local_team_id &&
    input.winnerTeamId !== match.visitor_team_id
  ) {
    return {
      ok: false,
      error: 'El equipo clasificado debe ser local o visitante del partido.',
    }
  }

  return {
    ok: true,
    local,
    visitor,
    winnerTeamId: input.winnerTeamId,
  }
}
