import Link from 'next/link'
import type { Card } from '@/lib/types'

type CardListProps = {
  cards: Card[]
  loading: boolean
}

export default function CardList({ cards, loading }: CardListProps) {
  if (loading) {
    return (
      <p className="text-center text-emerald-700/70 py-8">Cargando cartillas…</p>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-10 text-center">
        <p className="text-emerald-800/80">
          Aún no tienes cartillas. Crea la primera arriba.
        </p>
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
            <span className="font-medium text-emerald-900">{card.card_name}</span>
            {card.created_at && (
              <time
                dateTime={card.created_at}
                className="mt-0.5 block text-sm text-emerald-700/60 sm:mt-0 sm:inline sm:ml-3"
              >
                {new Date(card.created_at).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </time>
            )}
          </div>
          <Link
            href={`/cards/${card.id}`}
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Ver pronósticos
          </Link>
        </li>
      ))}
    </ul>
  )
}
