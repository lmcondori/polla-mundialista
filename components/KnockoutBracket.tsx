import TeamFlag from '@/components/TeamFlag'
import {
  getKnockoutMatchStatusLabel,
  getKnockoutPhaseLabel,
  getKnockoutSideLabel,
  groupKnockoutMatchesByPhase,
  isKnockoutMatchFinished,
  isKnockoutSideDefined,
  type KnockoutMatchSide,
} from '@/lib/knockoutMatches'
import type { KnockoutMatchWithTeams } from '@/lib/types'

type KnockoutBracketProps = {
  matches: KnockoutMatchWithTeams[]
}

type BracketSideProps = {
  match: KnockoutMatchWithTeams
  side: KnockoutMatchSide
  isWinner: boolean
}

function BracketSide({ match, side, isWinner }: BracketSideProps) {
  const { label, flag_url } = getKnockoutSideLabel(match, side)
  const isPlaceholder = !isKnockoutSideDefined(match, side)

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 ${
        isWinner
          ? 'bg-emerald-100 font-semibold text-emerald-950 ring-1 ring-emerald-300'
          : ''
      }`}
    >
      {flag_url ? (
        <TeamFlag team={{ name: label, flag_url }} className="h-4 w-5" />
      ) : (
        <span
          className="inline-flex h-4 w-5 shrink-0 items-center justify-center rounded-sm border border-dashed border-emerald-200 bg-emerald-50 text-[10px] text-emerald-600"
          aria-hidden
        >
          ?
        </span>
      )}
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          isPlaceholder && !isWinner
            ? 'italic text-emerald-700/75'
            : 'text-emerald-950'
        }`}
        title={label}
      >
        {label}
      </span>
    </div>
  )
}

function BracketMatchCard({ match }: { match: KnockoutMatchWithTeams }) {
  const isFinished = isKnockoutMatchFinished(match)
  const hasScore =
    match.local_score_real !== null && match.visitor_score_real !== null
  const localWinner =
    match.winner_team_id !== null &&
    match.winner_team_id === match.local_team_id
  const visitorWinner =
    match.winner_team_id !== null &&
    match.winner_team_id === match.visitor_team_id

  return (
    <article className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">
            Partido {match.match_number}
          </p>
          <p className="truncate text-[11px] text-emerald-800/60">
            {getKnockoutPhaseLabel(match.phase)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isFinished
              ? 'bg-slate-100 text-slate-700'
              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
          }`}
        >
          {getKnockoutMatchStatusLabel(match)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <BracketSide match={match} side="local" isWinner={localWinner} />
        {isFinished && hasScore ? (
          <p className="text-center text-sm font-bold tabular-nums text-emerald-800">
            {match.local_score_real} - {match.visitor_score_real}
          </p>
        ) : (
          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80">
            vs
          </p>
        )}
        <BracketSide match={match} side="visitor" isWinner={visitorWinner} />
      </div>
    </article>
  )
}

function BracketRoundSection({
  label,
  matches,
  layout,
}: {
  label: string
  matches: KnockoutMatchWithTeams[]
  layout: 'column' | 'stack'
}) {
  return (
    <section
      className={
        layout === 'column'
          ? 'flex min-w-[13.5rem] shrink-0 flex-col'
          : 'w-full'
      }
    >
      <h3 className="mb-3 text-center text-sm font-semibold text-emerald-900 lg:text-left">
        {label}
      </h3>
      <div
        className={
          layout === 'column'
            ? 'flex flex-1 flex-col justify-around gap-3'
            : 'grid gap-3 sm:grid-cols-2'
        }
      >
        {matches.map((match) => (
          <BracketMatchCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  )
}

export default function KnockoutBracket({ matches }: KnockoutBracketProps) {
  const rounds = groupKnockoutMatchesByPhase(matches)

  if (rounds.length === 0) {
    return (
      <p className="py-12 text-center text-emerald-800/70">
        No hay partidos de eliminatoria cargados en el cuadro.
      </p>
    )
  }

  return (
    <>
      <div className="hidden lg:block">
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max items-stretch gap-0">
            {rounds.map((round, index) => (
              <div
                key={round.phase}
                className={`px-3 ${
                  index < rounds.length - 1
                    ? 'border-r border-emerald-200/80'
                    : ''
                }`}
              >
                <BracketRoundSection
                  label={round.label}
                  matches={round.matches}
                  layout="column"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8 lg:hidden">
        {rounds.map((round) => (
          <BracketRoundSection
            key={round.phase}
            label={round.label}
            matches={round.matches}
            layout="stack"
          />
        ))}
      </div>
    </>
  )
}
