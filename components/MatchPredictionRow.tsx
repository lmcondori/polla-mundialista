'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { MatchWithTeams, Prediction } from '@/lib/types'

type MatchPredictionRowProps = {
  cardId: string
  match: MatchWithTeams
  initialPrediction?: Pick<
    Prediction,
    'local_score_predicted' | 'visitor_score_predicted'
  >
}

export default function MatchPredictionRow({
  cardId,
  match,
  initialPrediction,
}: MatchPredictionRowProps) {
  const [localScore, setLocalScore] = useState(
    initialPrediction?.local_score_predicted?.toString() ?? ''
  )
  const [visitorScore, setVisitorScore] = useState(
    initialPrediction?.visitor_score_predicted?.toString() ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLocalScore(initialPrediction?.local_score_predicted?.toString() ?? '')
    setVisitorScore(
      initialPrediction?.visitor_score_predicted?.toString() ?? ''
    )
  }, [initialPrediction])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const local = Number.parseInt(localScore, 10)
    const visitor = Number.parseInt(visitorScore, 10)

    if (Number.isNaN(local) || Number.isNaN(visitor) || local < 0 || visitor < 0) {
      setError('Ingresa goles válidos (números enteros ≥ 0).')
      return
    }

    setSaving(true)

    const { error: upsertError } = await supabase.from('predictions').upsert(
      {
        card_id: cardId,
        match_id: match.id,
        local_score_predicted: local,
        visitor_score_predicted: visitor,
        points: 0,
      },
      { onConflict: 'card_id,match_id' }
    )

    setSaving(false)

    if (upsertError) {
      setError(upsertError.message)
      return
    }

    setSaved(true)
  }

  const matchDate = new Date(match.match_date)

  return (
    <li className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-base font-semibold text-emerald-950 sm:text-left">
          <span>{match.local_team.name}</span>
          <span className="mx-2 font-normal text-emerald-600">vs</span>
          <span>{match.visitor_team.name}</span>
        </p>
        <time
          dateTime={match.match_date}
          className="text-center text-sm text-emerald-700/70 sm:text-right"
        >
          {matchDate.toLocaleDateString('es-CO', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:gap-3">
          <div>
            <label
              htmlFor={`local-${match.id}`}
              className="mb-1 block text-xs font-medium text-emerald-800"
            >
              Local
            </label>
            <input
              id={`local-${match.id}`}
              type="number"
              min={0}
              inputMode="numeric"
              value={localScore}
              onChange={(e) => {
                setLocalScore(e.target.value)
                setSaved(false)
              }}
              required
              className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-center outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <span className="pb-2 text-sm font-medium text-emerald-600">—</span>

          <div>
            <label
              htmlFor={`visitor-${match.id}`}
              className="mb-1 block text-xs font-medium text-emerald-800"
            >
              Visitante
            </label>
            <input
              id={`visitor-${match.id}`}
              type="number"
              min={0}
              inputMode="numeric"
              value={visitorScore}
              onChange={(e) => {
                setVisitorScore(e.target.value)
                setSaved(false)
              }}
              required
              className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-center outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:mb-0"
          >
            {saving ? '…' : 'Guardar'}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" className="text-sm text-emerald-700">
            Pronóstico guardado.
          </p>
        )}
      </form>
    </li>
  )
}
