'use client'

import { FormEvent, useEffect, useState } from 'react'
import { formatMatchDatePeru } from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import TeamWithFlag from '@/components/TeamWithFlag'
import type { MatchWithTeams } from '@/lib/types'

type AdminMatchResultRowProps = {
  match: MatchWithTeams
  onSaved?: () => void
}

function getStatusLabel(status: string): string {
  if (status === 'PENDING') return 'Pendiente'
  if (status === 'FINISHED') return 'Finalizado'
  return status
}

function getPhaseLabel(phase: string): string {
  if (phase === 'GROUP_STAGE') return 'Fase de grupos'
  return phase
}

export default function AdminMatchResultRow({
  match,
  onSaved,
}: AdminMatchResultRowProps) {
  const [localScore, setLocalScore] = useState(
    match.local_score_real?.toString() ?? ''
  )
  const [visitorScore, setVisitorScore] = useState(
    match.visitor_score_real?.toString() ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setLocalScore(match.local_score_real?.toString() ?? '')
    setVisitorScore(match.visitor_score_real?.toString() ?? '')
  }, [match.local_score_real, match.visitor_score_real])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const local = Number.parseInt(localScore, 10)
    const visitor = Number.parseInt(visitorScore, 10)

    if (Number.isNaN(local) || Number.isNaN(visitor) || local < 0 || visitor < 0) {
      setError('Ingresa resultados válidos (números enteros ≥ 0).')
      return
    }

    setSaving(true)

    const { error: rpcError } = await supabase.rpc(
      'save_match_result_and_recalculate',
      {
        p_match_id: match.id,
        p_local_score_real: local,
        p_visitor_score_real: visitor,
      }
    )

    setSaving(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setSuccess('Resultado guardado y puntos recalculados.')
    onSaved?.()
  }

  const matchDatePeru = formatMatchDatePeru(match.match_date)
  const isFinished = match.status === 'FINISHED'
  const statusLabel = getStatusLabel(match.status)
  const phaseLabel = match.phase ? getPhaseLabel(match.phase) : null

  return (
    <li className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isFinished
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {statusLabel}
        </span>
        {phaseLabel && (
          <span className="text-xs text-emerald-700/70">{phaseLabel}</span>
        )}
        {match.group_name && (
          <span className="text-xs text-emerald-700/70">Grupo {match.group_name}</span>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base font-semibold text-emerald-950 sm:justify-start">
          <TeamWithFlag team={match.local_team} />
          <span className="font-normal text-emerald-600">vs</span>
          <TeamWithFlag team={match.visitor_team} />
        </div>
        <time
          dateTime={match.match_date}
          className="text-center text-sm text-emerald-700/70 sm:text-right"
        >
          {matchDatePeru} (hora Perú)
        </time>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2 sm:gap-3">
          <div>
            <label
              htmlFor={`local-real-${match.id}`}
              className="mb-1 block text-xs font-medium text-emerald-800"
            >
              Goles local
            </label>
            <input
              id={`local-real-${match.id}`}
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
              htmlFor={`visitor-real-${match.id}`}
              className="mb-1 block text-xs font-medium text-emerald-800"
            >
              Goles visitante
            </label>
            <input
              id={`visitor-real-${match.id}`}
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
            {saving ? '…' : 'Guardar'}
          </button>
        </div>

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
    </li>
  )
}
