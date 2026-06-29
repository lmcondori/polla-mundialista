import TeamFlag from '@/components/TeamFlag'
import { getHomeTodayMatchPhaseLabel, type HomeTodayMatch } from '@/lib/homeTodayMatches'
import { formatMatchTimePeru } from '@/lib/matchPrediction'

type HomeTodayMatchCardProps = {
  match: HomeTodayMatch
}

function isMatchFinished(match: HomeTodayMatch): boolean {
  return (
    match.status === 'FINISHED' ||
    (match.local_score_real !== null && match.visitor_score_real !== null)
  )
}

function TeamSide({
  label,
  flagUrl,
  align,
}: {
  label: string
  flagUrl: string | null
  align: 'left' | 'right'
}) {
  const isPlaceholder =
    label.startsWith('Ganador ') ||
    label.startsWith('Perdedor ') ||
    label === 'Pendiente de definir equipos'

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        align === 'right' ? 'justify-end' : 'justify-start'
      }`}
    >
      {align === 'right' ? (
        <>
          <span
            className={`truncate text-sm font-semibold sm:text-base ${
              isPlaceholder
                ? 'italic text-emerald-800/70'
                : 'text-emerald-950'
            } ${align === 'right' ? 'text-right' : ''}`}
          >
            {label}
          </span>
          {flagUrl ? <TeamFlag team={{ name: label, flag_url: flagUrl }} /> : null}
        </>
      ) : (
        <>
          {flagUrl ? <TeamFlag team={{ name: label, flag_url: flagUrl }} /> : null}
          <span
            className={`truncate text-sm font-semibold sm:text-base ${
              isPlaceholder
                ? 'italic text-emerald-800/70'
                : 'text-emerald-950'
            }`}
          >
            {label}
          </span>
        </>
      )}
    </div>
  )
}

export default function HomeTodayMatchCard({ match }: HomeTodayMatchCardProps) {
  const finished = isMatchFinished(match)
  const phaseLabel = getHomeTodayMatchPhaseLabel(match)

  return (
    <article className="flex flex-col rounded-xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {match.match_number !== null && (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
            Partido {match.match_number}
          </span>
        )}
        {phaseLabel && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            {phaseLabel}
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
        <TeamSide
          label={match.local_label}
          flagUrl={match.local_flag_url}
          align="right"
        />

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

        <TeamSide
          label={match.visitor_label}
          flagUrl={match.visitor_flag_url}
          align="left"
        />
      </div>
    </article>
  )
}
