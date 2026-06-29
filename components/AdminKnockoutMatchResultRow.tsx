'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  formatKnockoutSidePlaceholder,
  getKnockoutPhaseLabel,
  getKnockoutSideTeam,
  isKnockoutMatchTeamsDefined,
  isKnockoutSideDefined,
  type KnockoutMatchSide,
} from '@/lib/knockoutMatches'
import { validateKnockoutResultSave } from '@/lib/knockoutResults'
import { formatMatchDatePeru } from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import TeamWithFlag from '@/components/TeamWithFlag'
import type { KnockoutMatchWithTeams } from '@/lib/types'

type AdminKnockoutMatchResultRowProps = {
  match: KnockoutMatchWithTeams
  onSaved?: () => void
}

function getStatusLabel(status: string): string {
  if (status === 'PENDING') return 'Pendiente'
  if (status === 'FINISHED') return 'Finalizado'
  return status
}

function KnockoutMatchSideDisplay({
  match,
  side,
}: {
  match: KnockoutMatchWithTeams
  side: KnockoutMatchSide
}) {
  if (isKnockoutSideDefined(match, side)) {
    const team = getKnockoutSideTeam(match, side)
    if (team) {
      return <TeamWithFlag team={team} />
    }
  }

  const placeholder = formatKnockoutSidePlaceholder(match, side)
  if (placeholder) {
    return (
      <span className="inline-flex text-sm font-medium italic text-emerald-800/70">
        {placeholder}
      </span>
    )
  }

  return (
    <span className="text-sm font-medium text-emerald-800/50">Por definir</span>
  )
}

export default function AdminKnockoutMatchResultRow({
  match,
  onSaved,
}: AdminKnockoutMatchResultRowProps) {
  const [localScore, setLocalScore] = useState(
    match.local_score_real?.toString() ?? ''
  )
  const [visitorScore, setVisitorScore] = useState(
    match.visitor_score_real?.toString() ?? ''
  )
  const [winnerTeamId, setWinnerTeamId] = useState(match.winner_team_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const teamsDefined = isKnockoutMatchTeamsDefined(match)
  const localTeam = getKnockoutSideTeam(match, 'local')
  const visitorTeam = getKnockoutSideTeam(match, 'visitor')
  const matchDatePeru = formatMatchDatePeru(match.match_date)
  const isFinished = match.status === 'FINISHED'
  const phaseLabel = getKnockoutPhaseLabel(match.phase)

  useEffect(() => {
    setLocalScore(match.local_score_real?.toString() ?? '')
    setVisitorScore(match.visitor_score_real?.toString() ?? '')
    setWinnerTeamId(match.winner_team_id ?? '')
  }, [match.local_score_real, match.visitor_score_real, match.winner_team_id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const validation = validateKnockoutResultSave(match, {
      localScore,
      visitorScore,
      winnerTeamId,
    })

    if (!validation.ok) {
      setError(validation.error)
      return
    }

    setSaving(true)

    const { error: rpcError } = await supabase.rpc(
      'save_knockout_match_result_and_recalculate',
      {
        p_match_number: validation.matchNumber,
        p_local_score_real: validation.local,
        p_visitor_score_real: validation.visitor,
        p_winner_team_id: validation.winnerTeamId,
      }
    )

    setSaving(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setSuccess(
      'Resultado guardado, puntos recalculados y equipos propagados a partidos siguientes.'
    )
    onSaved?.()
  }

  return (
    <li
      className={`rounded-xl border p-4 shadow-sm sm:p-5 ${
        teamsDefined
          ? 'border-emerald-100 bg-white'
          : 'border-emerald-100 bg-slate-50/80'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {match.match_number != null && (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
            Partido {match.match_number}
          </span>
        )}
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isFinished
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {getStatusLabel(match.status)}
        </span>
        <span className="text-xs text-emerald-700/70">{phaseLabel}</span>
        {!teamsDefined && (
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Pendiente de definir equipos
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base font-semibold text-emerald-950 sm:justify-start">
          <KnockoutMatchSideDisplay match={match} side="local" />
          <span className="font-normal text-emerald-600">vs</span>
          <KnockoutMatchSideDisplay match={match} side="visitor" />
        </div>
        <time
          dateTime={match.match_date}
          className="text-center text-sm text-emerald-700/70 sm:text-right"
        >
          {matchDatePeru} (hora Perú)
        </time>
      </div>

      {teamsDefined && localTeam && visitorTeam ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2 sm:gap-3">
            <div>
              <label
                htmlFor={`knockout-local-real-${match.id}`}
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Goles local
              </label>
              <input
                id={`knockout-local-real-${match.id}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={localScore}
                onChange={(e) => {
                  setLocalScore(e.target.value)
                  setSuccess(null)
                }}
                required
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-center outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <span className="pb-2 text-sm font-medium text-emerald-600">—</span>

            <div>
              <label
                htmlFor={`knockout-visitor-real-${match.id}`}
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Goles visitante
              </label>
              <input
                id={`knockout-visitor-real-${match.id}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={visitorScore}
                onChange={(e) => {
                  setVisitorScore(e.target.value)
                  setSuccess(null)
                }}
                required
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-center outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? '…' : isFinished ? 'Actualizar' : 'Guardar'}
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
                  name={`admin-winner-${match.id}`}
                  value={localTeam.id}
                  checked={winnerTeamId === localTeam.id}
                  onChange={() => {
                    setWinnerTeamId(localTeam.id)
                    setSuccess(null)
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
                  name={`admin-winner-${match.id}`}
                  value={visitorTeam.id}
                  checked={winnerTeamId === visitorTeam.id}
                  onChange={() => {
                    setWinnerTeamId(visitorTeam.id)
                    setSuccess(null)
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
          {success && (
            <p role="status" className="text-sm text-emerald-700">
              {success}
            </p>
          )}
        </form>
      ) : (
        <p className="text-sm text-emerald-800/70">
          El registro de resultado estará disponible cuando ambos equipos estén
          definidos.
        </p>
      )}
    </li>
  )
}
