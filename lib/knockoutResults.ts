import { isKnockoutMatchTeamsDefined } from '@/lib/knockoutMatches'
import type { KnockoutMatchWithTeams } from '@/lib/types'

export type KnockoutResultInput = {
  localScore: string
  visitorScore: string
  winnerTeamId: string
}

export function validateKnockoutResultSave(
  match: KnockoutMatchWithTeams,
  input: KnockoutResultInput
):
  | {
      ok: true
      matchNumber: number
      local: number
      visitor: number
      winnerTeamId: string
    }
  | { ok: false; error: string } {
  if (!isKnockoutMatchTeamsDefined(match)) {
    return { ok: false, error: 'El partido aún no tiene equipos definidos.' }
  }

  if (match.match_number == null) {
    return { ok: false, error: 'El partido no tiene número de fixture.' }
  }

  const local = Number.parseInt(input.localScore, 10)
  const visitor = Number.parseInt(input.visitorScore, 10)

  if (
    Number.isNaN(local) ||
    Number.isNaN(visitor) ||
    local < 0 ||
    visitor < 0
  ) {
    return {
      ok: false,
      error: 'Ingresa resultados válidos (números enteros ≥ 0).',
    }
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
    matchNumber: match.match_number,
    local,
    visitor,
    winnerTeamId: input.winnerTeamId,
  }
}
