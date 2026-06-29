'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  formatKnockoutMatchOrigin,
  isKnockoutMatchTeamsDefined,
} from '@/lib/knockoutMatches'
import {
  canEditKnockoutPrediction,
  isKnockoutPredictionComplete,
  validateKnockoutPredictionSave,
} from '@/lib/knockoutPrediction'
import {
  formatMatchDatePeru,
  isMatchPredictionClosed,
} from '@/lib/matchPrediction'
import TeamWithFlag from '@/components/TeamWithFlag'
import type { KnockoutMatchWithTeams, KnockoutPredictionPick, Team } from '@/lib/types'

type KnockoutMatchPredictionRowProps = {
  cardId: string
  match: KnockoutMatchWithTeams
  initialPrediction?: KnockoutPredictionPick
  onSaved?: (prediction: KnockoutPredictionPick) => void
}

function resolvePredictedWinnerTeam(
  match: KnockoutMatchWithTeams,
  winnerTeamId: string | null | undefined
): Team | null {
  if (!winnerTeamId) return null
  if (winnerTeamId === match.local_team_id) return match.local_team
  if (winnerTeamId === match.visitor_team_id) return match.visitor_team
  return null
}

function MatchStatusBadges({
  isClosed,
  hasPrediction,
  matchDatePeru,
}: {
  isClosed: boolean
  hasPrediction: boolean
  matchDatePeru: string
}) {
  return (
    <>
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
    </>
  )
}

export default function KnockoutMatchPredictionRow({
  cardId,
  match,
  initialPrediction,
  onSaved,
}: KnockoutMatchPredictionRowProps) {
  const [localScore, setLocalScore] = useState(
    initialPrediction?.local_score_predicted?.toString() ?? ''
  )
  const [visitorScore, setVisitorScore] = useState(
    initialPrediction?.visitor_score_predicted?.toString() ?? ''
  )
  const [winnerTeamId, setWinnerTeamId] = useState(
    initialPrediction?.predicted_winner_team_id ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const teamsDefined = isKnockoutMatchTeamsDefined(match)
  const isClosed = isMatchPredictionClosed(match.match_date)
  const canEdit = canEditKnockoutPrediction(match)
  const matchDatePeru = formatMatchDatePeru(match.match_date)
  const originLabel = formatKnockoutMatchOrigin(match)
  const hasPrediction = isKnockoutPredictionComplete(initialPrediction)

  useEffect(() => {
    setLocalScore(initialPrediction?.local_score_predicted?.toString() ?? '')
    setVisitorScore(
      initialPrediction?.visitor_score_predicted?.toString() ?? ''
    )
    setWinnerTeamId(initialPrediction?.predicted_winner_team_id ?? '')
  }, [initialPrediction])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSavedFlash(false)

    const validation = validateKnockoutPredictionSave(match, {
      localScore,
      visitorScore,
      winnerTeamId,
    })

    if (!validation.ok) {
      setError(validation.error)
      return
    }

    setSaving(true)

    const { error: upsertError } = await supabase.from('predictions').upsert(
      {
        card_id: cardId,
        match_id: match.id,
        local_score_predicted: validation.local,
        visitor_score_predicted: validation.visitor,
        predicted_winner_team_id: validation.winnerTeamId,
        points: 0,
      },
      { onConflict: 'card_id,match_id' }
    )

    setSaving(false)

    if (upsertError) {
      setError(upsertError.message)
      return
    }

    const prediction: KnockoutPredictionPick = {
      local_score_predicted: validation.local,
      visitor_score_predicted: validation.visitor,
      predicted_winner_team_id: validation.winnerTeamId,
    }
    setSavedFlash(true)
    onSaved?.(prediction)
  }

  if (!teamsDefined) {
    return (
      <li className="rounded-lg border border-emerald-100 bg-slate-50/80 p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {match.match_number != null && (
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
              Partido {match.match_number}
            </span>
          )}
          <time
            dateTime={match.match_date}
            className="text-xs text-emerald-700/75"
          >
            {matchDatePeru}
          </time>
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Pendiente de definir equipos
          </span>
        </div>
        {originLabel && (
          <p className="text-sm text-emerald-800/80">{originLabel}</p>
        )}
      </li>
    )
  }

  const localTeam = match.local_team!
  const visitorTeam = match.visitor_team!
  const predictedWinner = resolvePredictedWinnerTeam(
    match,
    initialPrediction?.predicted_winner_team_id
  )

  return (
    <li className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {match.match_number != null && (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
            Partido {match.match_number}
          </span>
        )}
        <time
          dateTime={match.match_date}
          className="text-xs text-emerald-700/75"
        >
          {matchDatePeru}
        </time>
        <MatchStatusBadges
          isClosed={isClosed}
          hasPrediction={hasPrediction}
          matchDatePeru={matchDatePeru}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-semibold text-emerald-950 sm:justify-start sm:text-base">
        <TeamWithFlag team={localTeam} />
        <span className="font-normal text-emerald-600">vs</span>
        <TeamWithFlag team={visitorTeam} />
      </div>

      {isClosed ? (
        <div className="space-y-3" aria-readonly="true">
          {hasPrediction ? (
            <>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-center text-sm font-semibold text-emerald-950">
                  {initialPrediction!.local_score_predicted}
                </div>
                <span className="text-sm font-medium text-emerald-600">—</span>
                <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-center text-sm font-semibold text-emerald-950">
                  {initialPrediction!.visitor_score_predicted}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-emerald-800">
                  Equipo clasificado
                </p>
                {predictedWinner ? (
                  <div className="inline-flex rounded-lg border border-emerald-200 bg-white px-3 py-2">
                    <TeamWithFlag team={predictedWinner} />
                  </div>
                ) : (
                  <p className="text-sm text-emerald-800/70">
                    Clasificado no registrado
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-emerald-800/70">
              Sin pronóstico registrado.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
            <div>
              <label
                htmlFor={`knockout-local-${match.id}`}
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Local
              </label>
              <input
                id={`knockout-local-${match.id}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={localScore}
                disabled={!canEdit}
                onChange={(e) => {
                  setLocalScore(e.target.value)
                  setSavedFlash(false)
                }}
                required
                className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-center text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-50 disabled:text-emerald-900/60"
              />
            </div>

            <span className="pb-2 text-sm font-medium text-emerald-600">—</span>

            <div>
              <label
                htmlFor={`knockout-visitor-${match.id}`}
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Visitante
              </label>
              <input
                id={`knockout-visitor-${match.id}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={visitorScore}
                disabled={!canEdit}
                onChange={(e) => {
                  setVisitorScore(e.target.value)
                  setSavedFlash(false)
                }}
                required
                className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-center text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-50 disabled:text-emerald-900/60"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !canEdit}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? '…' : hasPrediction ? 'Actualizar' : 'Guardar'}
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-emerald-800">
              Equipo clasificado
              <span className="ml-1 font-normal text-emerald-700/70">
                (obligatorio, incluso si hay empate)
              </span>
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  winnerTeamId === localTeam.id
                    ? 'border-emerald-500 bg-emerald-100/80 ring-2 ring-emerald-200'
                    : 'border-emerald-200 bg-white hover:bg-emerald-50'
                }`}
              >
                <input
                  type="radio"
                  name={`winner-${match.id}`}
                  value={localTeam.id}
                  checked={winnerTeamId === localTeam.id}
                  onChange={() => {
                    setWinnerTeamId(localTeam.id)
                    setSavedFlash(false)
                  }}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <TeamWithFlag team={localTeam} />
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  winnerTeamId === visitorTeam.id
                    ? 'border-emerald-500 bg-emerald-100/80 ring-2 ring-emerald-200'
                    : 'border-emerald-200 bg-white hover:bg-emerald-50'
                }`}
              >
                <input
                  type="radio"
                  name={`winner-${match.id}`}
                  value={visitorTeam.id}
                  checked={winnerTeamId === visitorTeam.id}
                  onChange={() => {
                    setWinnerTeamId(visitorTeam.id)
                    setSavedFlash(false)
                  }}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <TeamWithFlag team={visitorTeam} />
              </label>
            </div>
          </fieldset>

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
      )}
    </li>
  )
}
