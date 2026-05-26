import type { RankingEntry } from '@/lib/types'

type RankingPodiumProps = {
  entries: RankingEntry[]
}

type PodiumPlace = 1 | 2 | 3

type PodiumSlot = {
  place: PodiumPlace
  entry: RankingEntry
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

function buildPodiumSlots(entries: RankingEntry[]): PodiumSlot[] {
  const top = entries.slice(0, 3)

  if (top.length === 1) {
    return [{ place: 1, entry: top[0] }]
  }
  if (top.length === 2) {
    return [
      { place: 2, entry: top[1] },
      { place: 1, entry: top[0] },
    ]
  }
  return [
    { place: 2, entry: top[1] },
    { place: 1, entry: top[0] },
    { place: 3, entry: top[2] },
  ]
}

function PodiumCard({ place, entry }: PodiumSlot) {
  const config = PLACE_CONFIG[place]
  const isFirst = place === 1

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

        <h3
          className={`truncate font-bold text-emerald-950 ${
            isFirst ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
          }`}
          title={entry.card_name}
        >
          {entry.card_name}
        </h3>
        <p
          className="mt-1 truncate text-xs text-emerald-800/75 sm:text-sm"
          title={entry.full_name}
        >
          {entry.full_name}
        </p>

        <div className="mt-4 border-t border-emerald-100/80 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-700/60">
            Puntos
          </p>
          <p
            className={`font-bold tabular-nums ${
              isFirst ? 'text-3xl sm:text-4xl' : 'text-2xl'
            } ${config.points}`}
          >
            {entry.total_points}
          </p>
        </div>
      </div>

      <div
        className={`mt-2 w-full rounded-t-xl ${config.pedestal}`}
        aria-hidden
      />
    </article>
  )
}

export default function RankingPodium({ entries }: RankingPodiumProps) {
  const slots = buildPodiumSlots(entries)

  if (slots.length === 0) return null

  const isSolo = slots.length === 1
  const isDuo = slots.length === 2

  return (
    <section className="mb-12">
      <h2 className="mb-8 text-center text-lg font-semibold text-emerald-900">
        Podio
      </h2>

      {isSolo ? (
        <div className="mx-auto max-w-xs">
          <PodiumCard {...slots[0]} />
        </div>
      ) : isDuo ? (
        <div className="mx-auto flex max-w-md items-end justify-center gap-4 sm:gap-8">
          <div className="w-[42%] max-w-[9.5rem] sm:max-w-[10rem]">
            <PodiumCard {...slots[0]} />
          </div>
          <div className="w-[48%] max-w-[11rem] sm:max-w-[12rem]">
            <PodiumCard {...slots[1]} />
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-3xl grid-cols-3 items-end gap-2 sm:gap-4">
          <PodiumCard {...slots[0]} />
          <PodiumCard {...slots[1]} />
          <PodiumCard {...slots[2]} />
        </div>
      )}
    </section>
  )
}
