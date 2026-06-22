import type { Team } from '@/lib/types'

export type TeamWithGroup = Team & {
  group_name: string | null
}

export type GroupStandingRow = {
  position: number
  team: TeamWithGroup
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export type ThirdPlaceRow = GroupStandingRow & {
  group: string
  qualifies: boolean
}

export type KnockoutSlot =
  | { type: 'position'; group: string; rank: 1 | 2 | 3 }
  | { type: 'third_pool'; groups: string[] }
  | { type: 'winner'; matchNumber: number }
  | { type: 'loser'; matchNumber: number }

export type KnockoutRound =
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL'

export type KnockoutFixtureMatch = {
  matchNumber: number
  round: KnockoutRound
  home: KnockoutSlot
  away: KnockoutSlot
}

export type ResolvedSide = {
  label: string
  team: TeamWithGroup | null
  isPlaceholder: boolean
}

export type ResolvedKnockoutMatch = {
  matchNumber: number
  round: KnockoutRound
  roundLabel: string
  home: ResolvedSide
  away: ResolvedSide
}

export const GROUP_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
] as const

export type GroupLetter = (typeof GROUP_LETTERS)[number]
