'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  formatMatchDatePeru,
  isMatchPredictionClosed,
} from '@/lib/matchPrediction'
import TeamWithFlag from '@/components/TeamWithFlag'
import type { MatchWithTeams, Prediction } from '@/lib/types'

type PredictionPick = Pick<
  Prediction,
  'local_score_predicted' | 'visitor_score_predicted'
>

type MatchPredictionRowProps = {
  cardId: string
  match: MatchWithTeams
  initialPrediction?: PredictionPick
  onSaved?: (prediction: PredictionPick) => void
}

export default function MatchPredictionRow({
  cardId,
  match,
  initialPrediction,
  onSaved,
}: MatchPredictionRowProps) {
  const [localScore, setLocalScore] = useState(
    initialPrediction?.local_score_predicted?.toString() ?? ''
  )
  const [visitorScore, setVisitorScore] = useState(
    initialPrediction?.visitor_score_predicted?.toString() ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const isClosed = isMatchPredictionClosed(match.match_date)
  const matchDatePeru = formatMatchDatePeru(match.match_date)
  const hasPrediction = initialPrediction !== undefined

  useEffect(() => {
    setLocalScore(initialPrediction?.local_score_predicted?.toString() ?? '')
    setVisitorScore(
      initialPrediction?.visitor_score_predicted?.toString() ?? ''
    )
  }, [initialPrediction])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSavedFlash(false)

    if (isMatchPredictionClosed(match.match_date)) {
      return
    }

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

    const prediction = {
      local_score_predicted: local,
      visitor_score_predicted: visitor,
    }
    setSavedFlash(true)
    onSaved?.(prediction)
  }

  return (
    <li className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {match.group_name && (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
            Grupo {match.group_name}
          </span>
        )}
        <time
          dateTime={match.match_date}
          className="text-xs text-emerald-700/75"
        >
          {matchDatePeru}
        </time>
        {isClosed ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Pronóstico cerrado
          </span>
        ) : hasPrediction ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            Pronóstico guardado
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Pendiente
          </span>
        )}
        {!isClosed && !hasPrediction && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-100">
            Abierto hasta {matchDatePeru}
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-semibold text-emerald-950 sm:justify-start sm:text-base">
        <TeamWithFlag team={match.local_team} />
        <span className="font-normal text-emerald-600">vs</span>
        <TeamWithFlag team={match.visitor_team} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div
          className={`grid items-end gap-2 ${
            isClosed
              ? 'grid-cols-[1fr_auto_1fr]'
              : 'grid-cols-[1fr_auto_1fr_auto]'
          }`}
        >
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
              disabled={isClosed}
              onChange={(e) => {
                setLocalScore(e.target.value)
                setSavedFlash(false)
              }}
              required={!isClosed}
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-center text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-50 disabled:text-emerald-900/60"
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
              disabled={isClosed}
              onChange={(e) => {
                setVisitorScore(e.target.value)
                setSavedFlash(false)
              }}
              required={!isClosed}
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-center text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-50 disabled:text-emerald-900/60"
            />
          </div>

          {!isClosed && (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? '…' : 'Guardar'}
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {savedFlash && !error && (
          <p role="status" className="text-sm text-emerald-700">
            Pronóstico guardado correctamente.
          </p>
        )}
      </form>
    </li>
  )
}
