import TeamFlag from '@/components/TeamFlag'
import type { GroupLetter, GroupStandingRow } from '@/lib/knockoutPreviewTypes'
import { GROUP_LETTERS } from '@/lib/knockoutPreviewTypes'

type GroupStandingsTabProps = {
  standingsByGroup: Record<GroupLetter, GroupStandingRow[]>
  qualifiedThirdTeamIds: Set<string>
}

function rowHighlightClass(
  position: number,
  teamId: string,
  qualifiedThirdTeamIds: Set<string>
): string {
  if (position <= 2) {
    return 'bg-emerald-50/80'
  }
  if (position === 3 && qualifiedThirdTeamIds.has(teamId)) {
    return 'bg-amber-50/80'
  }
  return ''
}

export default function GroupStandingsTab({
  standingsByGroup,
  qualifiedThirdTeamIds,
}: GroupStandingsTabProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {GROUP_LETTERS.map((group) => {
        const rows = standingsByGroup[group]

        return (
          <section
            key={group}
            className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm"
          >
            <header className="border-b border-emerald-100 bg-emerald-50/80 px-4 py-2.5">
              <h3 className="text-sm font-bold text-emerald-900">
                Grupo {group}
              </h3>
            </header>

            {rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-emerald-800/70">
                Sin equipos registrados en este grupo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-emerald-50 text-emerald-800/70">
                      <th className="px-2 py-2 font-semibold">#</th>
                      <th className="px-2 py-2 font-semibold">Equipo</th>
                      <th className="px-2 py-2 text-right font-semibold">PJ</th>
                      <th className="px-2 py-2 text-right font-semibold">PG</th>
                      <th className="px-2 py-2 text-right font-semibold">PE</th>
                      <th className="px-2 py-2 text-right font-semibold">PP</th>
                      <th className="px-2 py-2 text-right font-semibold">GF</th>
                      <th className="px-2 py-2 text-right font-semibold">GC</th>
                      <th className="px-2 py-2 text-right font-semibold">DG</th>
                      <th className="px-2 py-2 text-right font-semibold">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50">
                    {rows.map((row) => (
                      <tr
                        key={row.team.id}
                        className={rowHighlightClass(
                          row.position,
                          row.team.id,
                          qualifiedThirdTeamIds
                        )}
                      >
                        <td className="px-2 py-2 font-medium text-emerald-800">
                          {row.position}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <TeamFlag team={row.team} className="h-4 w-5" />
                            <span
                              className="truncate font-medium text-emerald-950"
                              title={row.team.name}
                            >
                              {row.team.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.played}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.won}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.drawn}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.lost}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.goalsFor}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.goalsAgainst}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold tabular-nums text-emerald-700">
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
