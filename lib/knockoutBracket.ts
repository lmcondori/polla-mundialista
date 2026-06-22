import type { GroupStandingRow, GroupLetter } from '@/lib/knockoutPreviewTypes'
import type {
  KnockoutSlot,
  ResolvedKnockoutMatch,
  ResolvedSide,
} from '@/lib/knockoutPreviewTypes'
import {
  KNOCKOUT_FIXTURE,
  KNOCKOUT_ROUND_LABELS,
} from '@/lib/knockoutFixture'

function rankLabel(rank: 1 | 2 | 3, group: string): string {
  return `${rank}º Grupo ${group}`
}

function resolvePositionSlot(
  group: string,
  rank: 1 | 2 | 3,
  standingsByGroup: Record<GroupLetter, GroupStandingRow[]>
): ResolvedSide {
  const groupKey = group.toUpperCase() as GroupLetter
  const standings = standingsByGroup[groupKey] ?? []
  const row = standings[rank - 1]

  if (row) {
    return {
      label: rankLabel(rank, group),
      team: row.team,
      isPlaceholder: false,
    }
  }

  return {
    label: rankLabel(rank, group),
    team: null,
    isPlaceholder: true,
  }
}

function resolveThirdPoolSlot(groups: string[]): ResolvedSide {
  return {
    label: `3º Grupo ${groups.join('/')}`,
    team: null,
    isPlaceholder: true,
  }
}

function resolveSlot(
  slot: KnockoutSlot,
  standingsByGroup: Record<GroupLetter, GroupStandingRow[]>
): ResolvedSide {
  switch (slot.type) {
    case 'position':
      return resolvePositionSlot(slot.group, slot.rank, standingsByGroup)
    case 'third_pool':
      return resolveThirdPoolSlot(slot.groups)
    case 'winner':
      return {
        label: `Ganador Partido ${slot.matchNumber}`,
        team: null,
        isPlaceholder: true,
      }
    case 'loser':
      return {
        label: `Perdedor Partido ${slot.matchNumber}`,
        team: null,
        isPlaceholder: true,
      }
  }
}

export function resolveKnockoutBracket(
  standingsByGroup: Record<GroupLetter, GroupStandingRow[]>
): ResolvedKnockoutMatch[] {
  return KNOCKOUT_FIXTURE.map((match) => ({
    matchNumber: match.matchNumber,
    round: match.round,
    roundLabel: KNOCKOUT_ROUND_LABELS[match.round],
    home: resolveSlot(match.home, standingsByGroup),
    away: resolveSlot(match.away, standingsByGroup),
  }))
}

export function groupResolvedMatchesByRound(
  matches: ResolvedKnockoutMatch[]
): { round: ResolvedKnockoutMatch['round']; label: string; matches: ResolvedKnockoutMatch[] }[] {
  const order: ResolvedKnockoutMatch['round'][] = [
    'ROUND_OF_32',
    'ROUND_OF_16',
    'QUARTER_FINAL',
    'SEMI_FINAL',
    'THIRD_PLACE',
    'FINAL',
  ]

  return order.map((round) => ({
    round,
    label: KNOCKOUT_ROUND_LABELS[round],
    matches: matches.filter((match) => match.round === round),
  }))
}
