import TeamFlag from '@/components/TeamFlag'
import { formatMatchTimePeru } from '@/lib/matchPrediction'
import type { MatchWithTeams } from '@/lib/types'

type HomeTodayMatchCardProps = {
  match: MatchWithTeams
}

function isMatchFinished(match: MatchWithTeams): boolean {
  return (
    match.status === 'FINISHED' ||
    (match.local_score_real !== null && match.visitor_score_real !== null)
  )
}

export default function HomeTodayMatchCard({ match }: HomeTodayMatchCardProps) {
  const finished = isMatchFinished(match)

  return (
    <article className="flex flex-col rounded-xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {match.group_name && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            Grupo {match.group_name}
          </span>
        )}
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            finished
              ? 'bg-slate-100 text-slate-700'
              : 'bg-amber-50 text-amber-800'
          }`}
        >
          {finished ? 'Finalizado' : 'Por jugar'}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-semibold text-emerald-950 sm:text-base">
            {match.local_team.name}
          </span>
          <TeamFlag team={match.local_team} />
        </div>

        <div className="flex shrink-0 flex-col items-center px-2">
          {finished ? (
            <p className="text-xl font-bold tabular-nums text-emerald-900">
              {match.local_score_real} - {match.visitor_score_real}
            </p>
          ) : (
            <>
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                vs
              </span>
              <time
                dateTime={match.match_date}
                className="mt-1 text-sm font-semibold text-emerald-800"
              >
                {formatMatchTimePeru(match.match_date)}
              </time>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamFlag team={match.visitor_team} />
          <span className="truncate text-sm font-semibold text-emerald-950 sm:text-base">
            {match.visitor_team.name}
          </span>
        </div>
      </div>
    </article>
  )
}
