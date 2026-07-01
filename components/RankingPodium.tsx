import { useMemo } from 'react'
import { getPodiumRankedEntries } from '@/lib/ranking'
import type { RankingEntry, RankingEntryWithRank } from '@/lib/types'

type RankingPodiumProps = {
  entries: RankingEntry[]
}

type PodiumPlace = 1 | 2 | 3

type PodiumGroup = {
  place: PodiumPlace
  totalPoints: number
  entries: RankingEntryWithRank[]
}

const PLACE_CONFIG: Record<
  PodiumPlace,
  {
    label: string
    badge: string
    card: string
    pedestal: string
    points: string
  }
> = {
  1: {
    label: '1° lugar',
    badge: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md',
    card:
      'border-amber-200/80 bg-gradient-to-b from-white to-amber-50/80 shadow-lg shadow-amber-200/40 ring-2 ring-amber-300/50',
    pedestal:
      'h-16 bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 sm:h-20',
    points: 'text-amber-700',
  },
  2: {
    label: '2° lugar',
    badge: 'bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow',
    card: 'border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-md ring-1 ring-slate-200',
    pedestal:
      'h-12 bg-gradient-to-t from-slate-500 via-slate-400 to-slate-300 sm:h-14',
    points: 'text-slate-600',
  },
  3: {
    label: '3° lugar',
    badge: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow',
    card: 'border-orange-200 bg-gradient-to-b from-white to-orange-50 shadow-md ring-1 ring-orange-200',
    pedestal:
      'h-10 bg-gradient-to-t from-orange-600 via-orange-500 to-orange-400 sm:h-12',
    points: 'text-orange-700',
  },
}

function buildPodiumGroups(entries: RankingEntry[]): PodiumGroup[] {
  const podiumEntries = getPodiumRankedEntries(entries)
  const groups: PodiumGroup[] = []

  for (const place of [1, 2, 3] as const) {
    const placeEntries = podiumEntries.filter((entry) => entry.rank === place)
    if (placeEntries.length > 0) {
      groups.push({
        place,
        totalPoints: placeEntries[0]?.total_points ?? 0,
        entries: placeEntries,
      })
    }
  }

  return groups
}

function PodiumCard({ group }: { group: PodiumGroup }) {
  const config = PLACE_CONFIG[group.place]
  const isFirst = group.place === 1

  return (
    <article
      className={`flex w-full flex-col items-stretch ${
        isFirst ? 'z-10 sm:-mt-2' : ''
      }`}
    >
      <div
        className={`relative flex flex-1 flex-col rounded-2xl border p-4 text-center transition ${config.card} ${
          isFirst ? 'px-5 py-5 sm:py-6' : 'p-4'
        }`}
      >
        <span
          className={`mx-auto mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${config.badge}`}
        >
          {config.label}
        </span>

        <div className="mb-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-700/60">
            Puntos
          </p>
          <p
            className={`font-bold tabular-nums ${
              isFirst ? 'text-3xl sm:text-4xl' : 'text-2xl'
            } ${config.points}`}
          >
            {group.totalPoints}
          </p>
        </div>

        <ul className="space-y-2.5 border-t border-emerald-100/80 pt-3 text-left">
          {group.entries.map((entry) => {
            if (!entry) return null

            return (
              <li key={entry.card_id} className="min-w-0">
                <p
                  className={`truncate font-bold text-emerald-950 ${
                    isFirst ? 'text-sm sm:text-base' : 'text-sm'
                  }`}
                  title={entry.card_name}
                >
                  {entry.card_name}
                </p>
                <p
                  className="truncate text-xs text-emerald-800/75"
                  title={entry.full_name}
                >
                  {entry.full_name}
                </p>
              </li>
            )
          })}
        </ul>
      </div>

      <div
        className={`mt-2 w-full rounded-t-xl ${config.pedestal}`}
        aria-hidden
      />
    </article>
  )
}

export default function RankingPodium({ entries }: RankingPodiumProps) {
  const groups = useMemo(() => buildPodiumGroups(entries), [entries])
  const second = groups.find((group) => group.place === 2)
  const first = groups.find((group) => group.place === 1)
  const third = groups.find((group) => group.place === 3)
  const columnCount = groups.length

  return (
    <section className="mb-12">
      <h2 className="mb-8 text-center text-lg font-semibold text-emerald-900">
        Podio
      </h2>

      {entries.length === 0 ? (
        <p className="text-center text-sm text-emerald-800/70">
          Aún no hay cartillas en este ranking.
        </p>
      ) : columnCount === 1 && first ? (
        <div className="mx-auto max-w-xs">
          <PodiumCard group={first} />
        </div>
      ) : columnCount === 2 && first && second ? (
        <div className="mx-auto flex max-w-2xl items-end justify-center gap-4 sm:gap-8">
          <div className="w-[42%] max-w-[9.5rem] sm:max-w-[11rem]">
            <PodiumCard group={second} />
          </div>
          <div className="w-[48%] max-w-[11rem] sm:max-w-[13rem]">
            <PodiumCard group={first} />
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-4xl grid-cols-1 items-end gap-4 sm:grid-cols-3 sm:gap-4">
          <div className={second ? '' : 'hidden sm:block'}>
            {second ? <PodiumCard group={second} /> : null}
          </div>
          <div>{first ? <PodiumCard group={first} /> : null}</div>
          <div className={third ? '' : 'hidden sm:block'}>
            {third ? <PodiumCard group={third} /> : null}
          </div>
        </div>
      )}
    </section>
  )
}
