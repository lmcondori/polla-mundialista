'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AdminShell from '@/components/AdminShell'
import {
  fetchAdminReminderRows,
  updateParticipantWhatsappPhone,
  type AdminReminderRow,
} from '@/lib/adminReminders'
import { AdminRouteLoading, useAdminRoute } from '@/lib/useAdminRoute'
import { getKnockoutPhaseLabel } from '@/lib/knockoutMatches'
import { formatMatchDatePeru } from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import type { CardStage } from '@/lib/types'
import {
  buildWhatsappMeUrl,
  buildWhatsappReminderMessage,
  formatWhatsappPhoneDisplay,
  normalizeWhatsappPhone,
} from '@/lib/whatsappReminder'

function getStageUiLabel(stage: CardStage): string {
  return stage === 'KNOCKOUT_STAGE' ? 'Llaves' : 'Fase de grupos'
}

const PENDING_PHASE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Fase de grupos',
  ROUND_OF_16: 'Octavos de final',
  QUARTER_FINAL: 'Cuartos de final',
  SEMI_FINAL: 'Semifinal',
  THIRD_PLACE: 'Tercer puesto',
  FINAL: 'Final',
}

const PENDING_PHASE_BADGES: Record<string, string> = {
  GROUP_STAGE: 'Grupos',
  ROUND_OF_16: 'Octavos',
  QUARTER_FINAL: 'Cuartos',
  SEMI_FINAL: 'Semifinal',
  THIRD_PLACE: 'Tercer puesto',
  FINAL: 'Final',
}

function getPendingPhaseLabel(phase: string): string {
  return PENDING_PHASE_LABELS[phase] ?? getKnockoutPhaseLabel(phase)
}

function getPendingPhaseBadge(phase: string): string | null {
  return PENDING_PHASE_BADGES[phase] ?? null
}

function getPendingPhaseBadgeClass(phase: string): string {
  if (phase === 'GROUP_STAGE') return 'bg-emerald-100 text-emerald-800'
  if (phase === 'ROUND_OF_16') return 'bg-sky-100 text-sky-800'
  if (phase === 'QUARTER_FINAL') return 'bg-violet-100 text-violet-800'
  if (phase === 'SEMI_FINAL') return 'bg-indigo-100 text-indigo-800'
  if (phase === 'THIRD_PLACE') return 'bg-amber-100 text-amber-800'
  if (phase === 'FINAL') return 'bg-rose-100 text-rose-800'
  return 'bg-slate-100 text-slate-700'
}

export default function AdminRemindersPage() {
  const { accessState, handleLogout, AdminDenied } = useAdminRoute()
  const [rows, setRows] = useState<AdminReminderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await fetchAdminReminderRows(supabase)

    if (fetchError) {
      setError(fetchError)
      setRows([])
    } else {
      setRows(data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (accessState === 'allowed') {
      loadRows()
    }
  }, [accessState, loadRows])

  async function handleSavePhone(userId: string) {
    const normalized = phoneDraft.trim()
      ? normalizeWhatsappPhone(phoneDraft)
      : null

    if (phoneDraft.trim() && !normalized) {
      setError('Ingresa un número válido en formato internacional, ej. 51999999999')
      return
    }

    setSavingUserId(userId)
    setError(null)

    const { error: saveError } = await updateParticipantWhatsappPhone(
      supabase,
      userId,
      normalized
    )

    setSavingUserId(null)

    if (saveError) {
      setError(saveError)
      return
    }

    setEditingUserId(null)
    setPhoneDraft('')
    await loadRows()
  }

  function startEditing(row: AdminReminderRow) {
    setEditingUserId(row.participantUserId)
    setPhoneDraft(row.whatsappPhone ?? '')
    setError(null)
  }

  if (accessState === 'checking' || (accessState === 'allowed' && loading)) {
    return <AdminRouteLoading />
  }

  if (accessState === 'denied') {
    return (
      <div className="flex min-h-full flex-col bg-gradient-to-b from-slate-50 to-white">
        <AdminDenied />
      </div>
    )
  }

  return (
    <AdminShell
      onLogout={handleLogout}
      title="Recordatorios WhatsApp"
      description="Recordatorios manuales para todos los participantes con cartillas activas y pronósticos oficiales pendientes. No hay envío automático."
    >
      <p className="mb-6 text-sm text-slate-700/80">
        Se listan pendientes oficiales de todas las cartillas activas. En llaves
        solo cuentan octavos en adelante; los 16avos se excluyen del ranking
        oficial.
      </p>

      {error && (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => loadRows()}
          disabled={loading}
          className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50 disabled:opacity-60"
        >
          Actualizar lista
        </button>
        <Link
          href="/admin/cards"
          className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50"
        >
          Gestión global de cartillas
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-12 text-center">
          <p className="text-slate-700/80">
            No hay cartillas activas con pronósticos oficiales pendientes en
            este momento.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white shadow-sm">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-violet-100 bg-violet-50/80">
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Participante
                </th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Cartilla
                </th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Etapa
                </th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  WhatsApp
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">
                  Pendientes oficiales
                </th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Próximo partido pendiente
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {rows.map((row) => {
                const canSend =
                  Boolean(row.whatsappPhone) && row.whatsappEnabled
                const whatsappUrl = canSend
                  ? buildWhatsappMeUrl(
                      row.whatsappPhone!,
                      buildWhatsappReminderMessage(
                        row.participantName,
                        row.pendingCount,
                        row.stage
                      )
                    )
                  : null
                const isEditing = editingUserId === row.participantUserId
                const isSaving = savingUserId === row.participantUserId
                const nextMatch = row.nextPendingMatch
                const nextPhaseBadge = nextMatch
                  ? getPendingPhaseBadge(nextMatch.phase)
                  : null

                return (
                  <tr key={row.cardId} className="align-top hover:bg-violet-50/30">
                    <td className="px-4 py-3 text-slate-950">
                      {row.participantName}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-950">
                      {row.cardName}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {getStageUiLabel(row.stage)}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          <input
                            type="tel"
                            value={phoneDraft}
                            onChange={(e) => setPhoneDraft(e.target.value)}
                            placeholder="51999999999"
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                handleSavePhone(row.participantUserId)
                              }
                              className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                            >
                              {isSaving ? 'Guardando…' : 'Guardar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(null)
                                setPhoneDraft('')
                              }}
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-slate-800">
                            {formatWhatsappPhoneDisplay(row.whatsappPhone)}
                          </p>
                          {!row.whatsappEnabled && row.whatsappPhone && (
                            <p className="text-xs text-amber-700">
                              Recordatorios deshabilitados
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-800">
                      {row.pendingCount}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {nextMatch ? (
                        <div className="space-y-1">
                          {row.pendingCount > 1 && (
                            <p className="text-xs font-medium text-amber-800">
                              {row.pendingCount} pendientes oficiales · próximo:
                            </p>
                          )}
                          {nextPhaseBadge ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPendingPhaseBadgeClass(nextMatch.phase)}`}
                            >
                              {nextPhaseBadge}
                            </span>
                          ) : null}
                          <p className="text-xs font-semibold text-violet-900">
                            {getPendingPhaseLabel(nextMatch.phase)}
                          </p>
                          <p className="font-medium text-slate-950">
                            {nextMatch.label}
                          </p>
                          <time
                            dateTime={nextMatch.match_date}
                            className="text-xs text-slate-600"
                          >
                            {formatMatchDatePeru(nextMatch.match_date)}
                          </time>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canSend && whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50"
                        >
                          Enviar WhatsApp
                        </a>
                      ) : row.whatsappPhone && !row.whatsappEnabled ? (
                        <span className="text-xs text-slate-500">
                          Deshabilitado
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isEditing}
                          onClick={() => startEditing(row)}
                          className="inline-flex rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50 disabled:opacity-60"
                        >
                          {row.whatsappPhone ? 'Editar número' : 'Registrar número'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}
