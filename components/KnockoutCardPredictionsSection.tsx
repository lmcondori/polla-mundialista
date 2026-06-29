'use client'

import KnockoutMatchPredictionRow from '@/components/KnockoutMatchPredictionRow'
import type { KnockoutMatchWithTeams, KnockoutPredictionPick } from '@/lib/types'

type KnockoutCardPredictionsSectionProps = {
  sectionKey: string
  title: string
  subtitle: string
  matches: KnockoutMatchWithTeams[]
  cardId: string
  predictionsByMatch: Record<string, KnockoutPredictionPick>
  isOpen: boolean
  onToggle: () => void
  onPredictionSaved: (
    matchId: string,
    prediction: KnockoutPredictionPick
  ) => void
}

export default function KnockoutCardPredictionsSection({
  sectionKey,
  title,
  subtitle,
  matches,
  cardId,
  predictionsByMatch,
  isOpen,
  onToggle,
  onPredictionSaved,
}: KnockoutCardPredictionsSectionProps) {
  return (
    <section
      key={sectionKey}
      className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 bg-emerald-50/70 px-4 py-3 text-left transition hover:bg-emerald-100/60 sm:px-5"
      >
        <div>
          <p className="text-sm font-semibold text-emerald-900">{title}</p>
          <p className="text-xs text-emerald-700/75">{subtitle}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-emerald-700">
          {isOpen ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      {isOpen && (
        <ul className="space-y-3 p-3 sm:p-4">
          {matches.map((match) => (
            <KnockoutMatchPredictionRow
              key={match.id}
              cardId={cardId}
              match={match}
              initialPrediction={predictionsByMatch[match.id]}
              onSaved={(prediction) => onPredictionSaved(match.id, prediction)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
