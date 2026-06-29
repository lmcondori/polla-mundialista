import { supabase } from '@/lib/supabaseClient'
import { KNOCKOUT_ROUND_LABELS } from '@/lib/knockoutFixture'
import type { KnockoutRound } from '@/lib/knockoutPreviewTypes'
import type { KnockoutMatchWithTeams, Team } from '@/lib/types'

export const KNOCKOUT_TEAMS_PENDING_LABEL = 'Pendiente de definir equipos'

const KNOCKOUT_PHASE_ORDER: KnockoutRound[] = [
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
]

const KNOCKOUT_MATCHES_SELECT = `
  id,
  phase,
  match_number,
  match_date,
  status,
  local_score_real,
  visitor_score_real,
  local_team_id,
  visitor_team_id,
  local_source_match_number,
  visitor_source_match_number,
  local_source_type,
  visitor_source_type,
  winner_team_id,
  loser_team_id,
  local_team:teams!matches_local_team_id_fkey (
    id,
    name,
    fifa_code,
    flag_url
  ),
  visitor_team:teams!matches_visitor_team_id_fkey (
    id,
    name,
    fifa_code,
    flag_url
  )
`

type TeamRelation = Team | Team[] | null

type SupabaseKnockoutRow = Omit<
  KnockoutMatchWithTeams,
  'local_team' | 'visitor_team'
> & {
  local_team?: TeamRelation
  visitor_team?: TeamRelation
}

function normalizeTeamRelation(team: TeamRelation | undefined): Team | null {
  if (Array.isArray(team)) return team[0] ?? null
  return team ?? null
}

function normalizeKnockoutRow(row: SupabaseKnockoutRow): KnockoutMatchWithTeams {
  return {
    id: row.id,
    phase: row.phase,
    match_number: row.match_number,
    match_date: row.match_date,
    status: row.status,
    local_score_real: row.local_score_real,
    visitor_score_real: row.visitor_score_real,
    local_team_id: row.local_team_id,
    visitor_team_id: row.visitor_team_id,
    local_source_match_number: row.local_source_match_number,
    visitor_source_match_number: row.visitor_source_match_number,
    local_source_type: row.local_source_type,
    visitor_source_type: row.visitor_source_type,
    winner_team_id: row.winner_team_id,
    loser_team_id: row.loser_team_id,
    local_team: normalizeTeamRelation(row.local_team),
    visitor_team: normalizeTeamRelation(row.visitor_team),
  }
}

export function isKnockoutMatchTeamsDefined(match: KnockoutMatchWithTeams): boolean {
  return match.local_team_id !== null && match.visitor_team_id !== null
}

function formatSourceSide(
  matchNumber: number | null,
  sourceType: KnockoutMatchWithTeams['local_source_type']
): string | null {
  if (matchNumber === null || sourceType === null) return null
  const role = sourceType === 'WINNER' ? 'Ganador' : 'Perdedor'
  return `${role} Partido ${matchNumber}`
}

export type KnockoutMatchSide = 'local' | 'visitor'

export function getKnockoutSideTeam(
  match: KnockoutMatchWithTeams,
  side: KnockoutMatchSide
): Team | null {
  return side === 'local' ? match.local_team : match.visitor_team
}

export function isKnockoutSideDefined(
  match: KnockoutMatchWithTeams,
  side: KnockoutMatchSide
): boolean {
  const teamId = side === 'local' ? match.local_team_id : match.visitor_team_id
  return teamId !== null
}

export function formatKnockoutSidePlaceholder(
  match: KnockoutMatchWithTeams,
  side: KnockoutMatchSide
): string {
  if (side === 'local') {
    return (
      formatSourceSide(
        match.local_source_match_number,
        match.local_source_type
      ) ?? KNOCKOUT_TEAMS_PENDING_LABEL
    )
  }
  return (
    formatSourceSide(
      match.visitor_source_match_number,
      match.visitor_source_type
    ) ?? KNOCKOUT_TEAMS_PENDING_LABEL
  )
}

export function getKnockoutSideLabel(
  match: KnockoutMatchWithTeams,
  side: KnockoutMatchSide
): { label: string; flag_url: string | null } {
  const team = getKnockoutSideTeam(match, side)
  if (isKnockoutSideDefined(match, side) && team) {
    return { label: team.name, flag_url: team.flag_url ?? null }
  }
  return { label: formatKnockoutSidePlaceholder(match, side), flag_url: null }
}

export function formatKnockoutMatchOrigin(match: KnockoutMatchWithTeams): string | null {
  const localLabel = isKnockoutSideDefined(match, 'local')
    ? match.local_team?.name ?? null
    : formatKnockoutSidePlaceholder(match, 'local')
  const visitorLabel = isKnockoutSideDefined(match, 'visitor')
    ? match.visitor_team?.name ?? null
    : formatKnockoutSidePlaceholder(match, 'visitor')

  if (localLabel && visitorLabel) return `${localLabel} vs ${visitorLabel}`
  if (localLabel) return localLabel
  if (visitorLabel) return visitorLabel
  return null
}

export function getKnockoutPhaseLabel(phase: string): string {
  if (phase in KNOCKOUT_ROUND_LABELS) {
    return KNOCKOUT_ROUND_LABELS[phase as KnockoutRound]
  }
  return phase
}

export function sortKnockoutMatchesByPhaseAndDate(
  matches: KnockoutMatchWithTeams[]
): KnockoutMatchWithTeams[] {
  return [...matches].sort((a, b) => {
    const phaseIndexA = KNOCKOUT_PHASE_ORDER.indexOf(a.phase as KnockoutRound)
    const phaseIndexB = KNOCKOUT_PHASE_ORDER.indexOf(b.phase as KnockoutRound)
    const orderA = phaseIndexA === -1 ? KNOCKOUT_PHASE_ORDER.length : phaseIndexA
    const orderB = phaseIndexB === -1 ? KNOCKOUT_PHASE_ORDER.length : phaseIndexB

    if (orderA !== orderB) return orderA - orderB

    const dateDiff =
      new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    if (dateDiff !== 0) return dateDiff

    return (a.match_number ?? 0) - (b.match_number ?? 0)
  })
}

export async function fetchKnockoutMatchesWithTeams(): Promise<{
  data: KnockoutMatchWithTeams[]
  error: string | null
}> {
  const { data, error } = await supabase
    .from('matches')
    .select(KNOCKOUT_MATCHES_SELECT)
    .neq('phase', 'GROUP_STAGE')
    .order('match_date', { ascending: true })

  if (error) {
    return { data: [], error: error.message }
  }

  const rows = (data ?? []).map((row) =>
    normalizeKnockoutRow(row as SupabaseKnockoutRow)
  )

  return { data: sortKnockoutMatchesByPhaseAndDate(rows), error: null }
}

export { KNOCKOUT_PHASE_ORDER }
