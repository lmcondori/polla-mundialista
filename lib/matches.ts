import { supabase } from '@/lib/supabaseClient'
import type { Match, MatchWithTeams, Team } from '@/lib/types'

const GROUP_STAGE_PHASE = 'GROUP_STAGE'

const MATCHES_JOIN_SELECT = `
  id,
  phase,
  group_name,
  match_date,
  status,
  local_score_real,
  visitor_score_real,
  local_team_id,
  visitor_team_id,
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

export type MatchJoinRow = Match & {
  local_team: Team | null
  visitor_team: Team | null
}

type SupabaseMatchJoinRow = Omit<MatchJoinRow, 'local_team' | 'visitor_team'> & {
  local_team?: TeamRelation
  visitor_team?: TeamRelation
}

function normalizeTeamRelation(team: TeamRelation | undefined): Team | null {
  if (Array.isArray(team)) return team[0] ?? null
  return team ?? null
}

function normalizeJoinRow(row: SupabaseMatchJoinRow): MatchJoinRow {
  return {
    id: row.id,
    phase: row.phase,
    group_name: row.group_name,
    match_date: row.match_date,
    status: row.status,
    local_score_real: row.local_score_real,
    visitor_score_real: row.visitor_score_real,
    local_team_id: row.local_team_id,
    visitor_team_id: row.visitor_team_id,
    local_team: normalizeTeamRelation(row.local_team),
    visitor_team: normalizeTeamRelation(row.visitor_team),
  }
}

function normalizeJoinRows(data: unknown): MatchJoinRow[] {
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeJoinRow(row as SupabaseMatchJoinRow))
}

function mapJoinRows(rows: MatchJoinRow[]): MatchWithTeams[] {
  return rows
    .filter((row) => row.local_team && row.visitor_team)
    .map((row) => ({
      id: row.id,
      phase: row.phase,
      group_name: row.group_name,
      match_date: row.match_date,
      local_score_real: row.local_score_real,
      visitor_score_real: row.visitor_score_real,
      status: row.status,
      local_team_id: row.local_team_id,
      visitor_team_id: row.visitor_team_id,
      local_team: row.local_team!,
      visitor_team: row.visitor_team!,
    }))
}

async function fetchMatchesWithTeamsJoin(): Promise<{
  data: MatchWithTeams[] | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('matches')
    .select(MATCHES_JOIN_SELECT)
    .eq('phase', GROUP_STAGE_PHASE)
    .order('match_date', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const rows = normalizeJoinRows(data)
  return { data: mapJoinRows(rows), error: null }
}

async function fetchMatchesWithTeamsSeparate(): Promise<{
  data: MatchWithTeams[] | null
  error: Error | null
}> {
  const { data: matchesData, error: matchesError } = await supabase
    .from('matches')
    .select(
      'id, phase, group_name, match_date, status, local_score_real, visitor_score_real, local_team_id, visitor_team_id'
    )
    .eq('phase', GROUP_STAGE_PHASE)
    .order('match_date', { ascending: true })

  if (matchesError) {
    return { data: null, error: new Error(matchesError.message) }
  }

  const rawMatches = matchesData ?? []
  const teamIds = [
    ...new Set(
      rawMatches.flatMap((m) => [m.local_team_id, m.visitor_team_id])
    ),
  ]

  let teamsMap = new Map<string, Team>()

  if (teamIds.length > 0) {
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, fifa_code, flag_url')
      .in('id', teamIds)

    if (teamsError) {
      return { data: null, error: new Error(teamsError.message) }
    }

    teamsMap = new Map((teamsData ?? []).map((t) => [t.id, t]))
  }

  const matchesWithTeams: MatchWithTeams[] = rawMatches
    .map((m) => {
      const local_team = teamsMap.get(m.local_team_id)
      const visitor_team = teamsMap.get(m.visitor_team_id)
      if (!local_team || !visitor_team) return null
      return { ...m, local_team, visitor_team }
    })
    .filter((m): m is MatchWithTeams => m !== null)

  return { data: matchesWithTeams, error: null }
}

export async function fetchMatchesWithTeams(): Promise<{
  data: MatchWithTeams[]
  error: string | null
}> {
  const joinResult = await fetchMatchesWithTeamsJoin()

  if (!joinResult.error) {
    return { data: joinResult.data ?? [], error: null }
  }

  const separate = await fetchMatchesWithTeamsSeparate()

  return {
    data: separate.data ?? [],
    error: separate.error?.message ?? null,
  }
}
