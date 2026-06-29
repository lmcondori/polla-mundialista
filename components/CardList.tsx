import Link from 'next/link'
import type { Card, CardStage } from '@/lib/types'

type CardListProps = {
  cards: Card[]
  loading: boolean
  stage: CardStage
  emptyMessage: string
}

function StageBadge({ stage }: { stage: CardStage }) {
  if (stage === 'KNOCKOUT_STAGE') {
    return (
      <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
        Llaves
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      Fase de grupos
    </span>
  )
}

export default function CardList({
  cards,
  loading,
  stage,
  emptyMessage,
}: CardListProps) {
  if (loading) {
    return (
      <p className="py-8 text-center text-emerald-700/70">Cargando cartillas…</p>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-10 text-center">
        <p className="text-emerald-800/80">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-emerald-100 rounded-xl border border-emerald-100 bg-white shadow-sm">
      {cards.map((card) => (
        <li
          key={card.id}
          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-emerald-900">{card.card_name}</span>
              <StageBadge stage={stage} />
            </div>
            {card.created_at && (
              <time
                dateTime={card.created_at}
                className="mt-1 block text-sm text-emerald-700/60"
              >
                {new Date(card.created_at).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </time>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {stage === 'GROUP_STAGE' ? (
              <>
                <Link
                  href={`/cards/${card.id}`}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Ver pronósticos
                </Link>
                <Link
                  href={`/cards/${card.id}/summary`}
                  className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-center text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  Ver resumen
                </Link>
              </>
            ) : (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm font-medium text-emerald-700/60"
              >
                Pronósticos de llaves próximamente
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
