import TeamFlag from '@/components/TeamFlag'
import { groupResolvedMatchesByRound } from '@/lib/knockoutBracket'
import type { ResolvedKnockoutMatch } from '@/lib/knockoutPreviewTypes'

type KnockoutBracketTabProps = {
  matches: ResolvedKnockoutMatch[]
}

function MatchSide({ side }: { side: ResolvedKnockoutMatch['home'] }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {side.team ? (
        <TeamFlag team={side.team} className="h-4 w-5" />
      ) : (
        <span
          className="inline-flex h-4 w-5 shrink-0 items-center justify-center rounded-sm border border-dashed border-emerald-200 bg-emerald-50 text-[10px] text-emerald-600"
          aria-hidden
        >
          ?
        </span>
      )}
      <span
        className={`truncate text-sm ${
          side.isPlaceholder
            ? 'italic text-emerald-700/75'
            : 'font-medium text-emerald-950'
        }`}
        title={side.team?.name ?? side.label}
      >
        {side.team?.name ?? side.label}
      </span>
    </div>
  )
}

function MatchCard({ match }: { match: ResolvedKnockoutMatch }) {
  return (
    <article className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700/70">
        Partido {match.matchNumber}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <MatchSide side={match.home} />
        <span className="shrink-0 text-center text-xs font-bold text-emerald-600 sm:px-2">
          vs
        </span>
        <MatchSide side={match.away} />
      </div>
    </article>
  )
}

export default function KnockoutBracketTab({ matches }: KnockoutBracketTabProps) {
  const rounds = groupResolvedMatchesByRound(matches)

  return (
    <div className="space-y-8">
      {rounds.map((round) => (
        <section key={round.round}>
          <h3 className="mb-4 text-lg font-semibold text-emerald-900">
            {round.label}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {round.matches.map((match) => (
              <MatchCard key={match.matchNumber} match={match} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
