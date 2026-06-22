import type {
  KnockoutFixtureMatch,
  KnockoutRound,
  KnockoutSlot,
} from '@/lib/knockoutPreviewTypes'

function pos(group: string, rank: 1 | 2 | 3): KnockoutSlot {
  return { type: 'position', group, rank }
}

function third(groups: string[]): KnockoutSlot {
  return { type: 'third_pool', groups }
}

function winner(matchNumber: number): KnockoutSlot {
  return { type: 'winner', matchNumber }
}

function loser(matchNumber: number): KnockoutSlot {
  return { type: 'loser', matchNumber }
}

function fixture(
  matchNumber: number,
  round: KnockoutRound,
  home: KnockoutSlot,
  away: KnockoutSlot
): KnockoutFixtureMatch {
  return { matchNumber, round, home, away }
}

/** Fixture oficial de eliminación directa: partidos 73 a 104. */
export const KNOCKOUT_FIXTURE: KnockoutFixtureMatch[] = [
  // 16avos de final
  fixture(73, 'ROUND_OF_32', pos('A', 2), pos('B', 2)),
  fixture(74, 'ROUND_OF_32', pos('E', 1), third(['A', 'B', 'C', 'D', 'F'])),
  fixture(75, 'ROUND_OF_32', pos('F', 1), pos('C', 2)),
  fixture(76, 'ROUND_OF_32', pos('C', 1), pos('F', 2)),
  fixture(77, 'ROUND_OF_32', pos('I', 1), third(['C', 'D', 'F', 'G', 'H'])),
  fixture(78, 'ROUND_OF_32', pos('E', 2), pos('I', 2)),
  fixture(79, 'ROUND_OF_32', pos('A', 1), third(['C', 'E', 'F', 'H', 'I'])),
  fixture(80, 'ROUND_OF_32', pos('L', 1), third(['E', 'H', 'I', 'J', 'K'])),
  fixture(81, 'ROUND_OF_32', pos('D', 1), third(['B', 'E', 'F', 'I', 'J'])),
  fixture(82, 'ROUND_OF_32', pos('G', 1), third(['A', 'E', 'H', 'I', 'J'])),
  fixture(83, 'ROUND_OF_32', pos('K', 2), pos('L', 2)),
  fixture(84, 'ROUND_OF_32', pos('H', 1), pos('J', 2)),
  fixture(85, 'ROUND_OF_32', pos('B', 1), third(['E', 'F', 'G', 'I', 'J'])),
  fixture(86, 'ROUND_OF_32', pos('J', 1), pos('H', 2)),
  fixture(87, 'ROUND_OF_32', pos('K', 1), third(['D', 'E', 'I', 'J', 'L'])),
  fixture(88, 'ROUND_OF_32', pos('D', 2), pos('G', 2)),
  // Octavos de final
  fixture(89, 'ROUND_OF_16', winner(74), winner(77)),
  fixture(90, 'ROUND_OF_16', winner(73), winner(75)),
  fixture(91, 'ROUND_OF_16', winner(76), winner(78)),
  fixture(92, 'ROUND_OF_16', winner(79), winner(80)),
  fixture(93, 'ROUND_OF_16', winner(83), winner(84)),
  fixture(94, 'ROUND_OF_16', winner(81), winner(82)),
  fixture(95, 'ROUND_OF_16', winner(86), winner(88)),
  fixture(96, 'ROUND_OF_16', winner(85), winner(87)),
  // Cuartos de final
  fixture(97, 'QUARTER_FINAL', winner(89), winner(90)),
  fixture(98, 'QUARTER_FINAL', winner(93), winner(94)),
  fixture(99, 'QUARTER_FINAL', winner(91), winner(92)),
  fixture(100, 'QUARTER_FINAL', winner(95), winner(96)),
  // Semifinales
  fixture(101, 'SEMI_FINAL', winner(97), winner(98)),
  fixture(102, 'SEMI_FINAL', winner(99), winner(100)),
  // Tercer puesto
  fixture(103, 'THIRD_PLACE', loser(101), loser(102)),
  // Final
  fixture(104, 'FINAL', winner(101), winner(102)),
]

export const KNOCKOUT_ROUND_LABELS: Record<KnockoutRound, string> = {
  ROUND_OF_32: '16avos de final',
  ROUND_OF_16: 'Octavos de final',
  QUARTER_FINAL: 'Cuartos de final',
  SEMI_FINAL: 'Semifinales',
  THIRD_PLACE: 'Tercer puesto',
  FINAL: 'Final',
}
