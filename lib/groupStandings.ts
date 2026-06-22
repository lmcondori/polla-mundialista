import type { Match } from '@/lib/types'
import type {
  GroupLetter,
  GroupStandingRow,
  TeamWithGroup,
  ThirdPlaceRow,
} from '@/lib/knockoutPreviewTypes'
import { GROUP_LETTERS } from '@/lib/knockoutPreviewTypes'

type StandingsStats = {
  team: TeamWithGroup
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
}

function emptyStats(team: TeamWithGroup): StandingsStats {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  }
}

function toStandingRow(stats: StandingsStats, position: number): GroupStandingRow {
  return {
    position,
    team: stats.team,
    played: stats.played,
    won: stats.won,
    drawn: stats.drawn,
    lost: stats.lost,
    goalsFor: stats.goalsFor,
    goalsAgainst: stats.goalsAgainst,
    goalDiff: stats.goalsFor - stats.goalsAgainst,
    points: stats.won * 3 + stats.drawn,
  }
}

export function compareStandings(a: GroupStandingRow, b: GroupStandingRow): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
  return a.team.name.localeCompare(b.team.name, 'es')
}

function hasResult(match: Match): boolean {
  return (
    match.local_score_real !== null && match.visitor_score_real !== null
  )
}

function buildGroupStats(
  group: GroupLetter,
  teams: TeamWithGroup[],
  matches: Match[]
): Map<string, StandingsStats> {
  const groupTeams = teams.filter(
    (team) => (team.group_name ?? '').toUpperCase() === group
  )
  const statsMap = new Map<string, StandingsStats>()

  for (const team of groupTeams) {
    statsMap.set(team.id, emptyStats(team))
  }

  const groupMatches = matches.filter(
    (match) =>
      (match.group_name ?? '').toUpperCase() === group && hasResult(match)
  )

  for (const match of groupMatches) {
    const local = statsMap.get(match.local_team_id)
    const visitor = statsMap.get(match.visitor_team_id)
    if (!local || !visitor) continue

    const localGoals = match.local_score_real!
    const visitorGoals = match.visitor_score_real!

    local.played += 1
    visitor.played += 1
    local.goalsFor += localGoals
    local.goalsAgainst += visitorGoals
    visitor.goalsFor += visitorGoals
    visitor.goalsAgainst += localGoals

    if (localGoals > visitorGoals) {
      local.won += 1
      visitor.lost += 1
    } else if (localGoals < visitorGoals) {
      visitor.won += 1
      local.lost += 1
    } else {
      local.drawn += 1
      visitor.drawn += 1
    }
  }

  return statsMap
}

export function computeGroupStandings(
  teams: TeamWithGroup[],
  matches: Match[]
): Record<GroupLetter, GroupStandingRow[]> {
  const result = {} as Record<GroupLetter, GroupStandingRow[]>

  for (const group of GROUP_LETTERS) {
    const statsMap = buildGroupStats(group, teams, matches)
    const rows = Array.from(statsMap.values())
      .map((stats) => toStandingRow(stats, 0))
      .sort(compareStandings)
      .map((row, index) => ({ ...row, position: index + 1 }))

    result[group] = rows
  }

  return result
}

export function computeBestThirdPlaces(
  standingsByGroup: Record<GroupLetter, GroupStandingRow[]>
): ThirdPlaceRow[] {
  const thirds: ThirdPlaceRow[] = []

  for (const group of GROUP_LETTERS) {
    const third = standingsByGroup[group][2]
    if (!third) continue

    thirds.push({
      ...third,
      group,
      qualifies: false,
    })
  }

  thirds.sort(compareStandings)

  return thirds.map((row, index) => ({
    ...row,
    qualifies: index < 8,
  }))
}

export function getQualifiedThirdTeamIds(thirds: ThirdPlaceRow[]): Set<string> {
  return new Set(
    thirds.filter((row) => row.qualifies).map((row) => row.team.id)
  )
}
