import { getKnockoutPhaseLabel, getKnockoutSideLabel } from '@/lib/knockoutMatches'
import { supabase } from '@/lib/supabaseClient'
import type { KnockoutMatchWithTeams, Team } from '@/lib/types'

export type HomeTodayMatch = {
  id: string
  phase: string
  group_name: string | null
  match_number: number | null
  match_date: string
  status: string
  local_score_real: number | null
  visitor_score_real: number | null
  local_label: string
  local_flag_url: string | null
  visitor_label: string
  visitor_flag_url: string | null
}

const HOME_TODAY_MATCHES_SELECT = `
  id,
  phase,
  group_name,
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

type SupabaseHomeMatchRow = {
  id: string
  phase: string
  group_name: string | null
  match_number: number | null
  match_date: string
  status: string
  local_score_real: number | null
  visitor_score_real: number | null
  local_team_id: string | null
  visitor_team_id: string | null
  local_source_match_number: number | null
  visitor_source_match_number: number | null
  local_source_type: KnockoutMatchWithTeams['local_source_type']
  visitor_source_type: KnockoutMatchWithTeams['visitor_source_type']
  local_team?: TeamRelation
  visitor_team?: TeamRelation
}

function normalizeTeamRelation(team: TeamRelation | undefined): Team | null {
  if (Array.isArray(team)) return team[0] ?? null
  return team ?? null
}

function toKnockoutShape(row: SupabaseHomeMatchRow): KnockoutMatchWithTeams {
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
    winner_team_id: null,
    loser_team_id: null,
    local_team: normalizeTeamRelation(row.local_team),
    visitor_team: normalizeTeamRelation(row.visitor_team),
  }
}

function mapHomeTodayMatch(row: SupabaseHomeMatchRow): HomeTodayMatch {
  if (row.phase === 'GROUP_STAGE') {
    const localTeam = normalizeTeamRelation(row.local_team)
    const visitorTeam = normalizeTeamRelation(row.visitor_team)
    return {
      id: row.id,
      phase: row.phase,
      group_name: row.group_name,
      match_number: row.match_number,
      match_date: row.match_date,
      status: row.status,
      local_score_real: row.local_score_real,
      visitor_score_real: row.visitor_score_real,
      local_label: localTeam?.name ?? 'Por confirmar',
      local_flag_url: localTeam?.flag_url ?? null,
      visitor_label: visitorTeam?.name ?? 'Por confirmar',
      visitor_flag_url: visitorTeam?.flag_url ?? null,
    }
  }

  const knockoutMatch = toKnockoutShape(row)
  const local = getKnockoutSideLabel(knockoutMatch, 'local')
  const visitor = getKnockoutSideLabel(knockoutMatch, 'visitor')

  return {
    id: row.id,
    phase: row.phase,
    group_name: row.group_name,
    match_number: row.match_number,
    match_date: row.match_date,
    status: row.status,
    local_score_real: row.local_score_real,
    visitor_score_real: row.visitor_score_real,
    local_label: local.label,
    local_flag_url: local.flag_url,
    visitor_label: visitor.label,
    visitor_flag_url: visitor.flag_url,
  }
}

export function getHomeTodayMatchPhaseLabel(match: HomeTodayMatch): string | null {
  if (match.group_name) return `Grupo ${match.group_name}`
  if (match.phase !== 'GROUP_STAGE') return getKnockoutPhaseLabel(match.phase)
  return null
}

export async function fetchHomeTodayMatches(): Promise<{
  data: HomeTodayMatch[]
  error: string | null
}> {
  const { data, error } = await supabase
    .from('matches')
    .select(HOME_TODAY_MATCHES_SELECT)
    .order('match_date', { ascending: true })

  if (error) {
    return { data: [], error: error.message }
  }

  const rows = (data ?? []) as SupabaseHomeMatchRow[]
  return { data: rows.map(mapHomeTodayMatch), error: null }
}
