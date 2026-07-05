'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import {
  fetchAdminReminderRows,
  updateParticipantWhatsappPhone,
  type AdminReminderRow,
} from '@/lib/adminReminders'
import { formatMatchDatePeru } from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import type { CardStage } from '@/lib/types'
import {
  buildWhatsappMeUrl,
  buildWhatsappReminderMessage,
  formatWhatsappPhoneDisplay,
  normalizeWhatsappPhone,
} from '@/lib/whatsappReminder'

type AccessState = 'checking' | 'denied' | 'allowed'

function getStageUiLabel(stage: CardStage): string {
  return stage === 'KNOCKOUT_STAGE' ? 'Llaves' : 'Fase de grupos'
}

export default function AdminRemindersPage() {
  const router = useRouter()
  const [accessState, setAccessState] = useState<AccessState>('checking')
  const [rows, setRows] = useState<AdminReminderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

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
    async function init() {
      setAccessState('checking')
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profileError || profile?.role !== 'admin') {
        setAccessState('denied')
        return
      }

      setAccessState('allowed')
      await loadRows()
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router, loadRows])

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
    return (
      <div className="flex min-h-full items-center justify-center bg-emerald-50">
        <p className="text-emerald-800">Cargando…</p>
      </div>
    )
  }

  if (accessState === 'denied') {
    return (
      <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
        <Navbar showAuthLinks={false} onLogout={handleLogout} />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-red-800"
          >
            No tienes permisos para acceder a esta sección
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Ir al dashboard
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar showAuthLinks={false} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Volver al dashboard
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            Recordatorios WhatsApp
          </h1>
          <p className="mt-2 text-emerald-800/70">
            Envía recordatorios manuales a participantes con pronósticos
            oficiales pendientes. Se abre WhatsApp Web o móvil con el mensaje
            prellenado; no hay envío automático desde la aplicación.
          </p>
          <p className="mt-2 text-xs text-emerald-800/60">
            Usar solo para recordatorios de participación. Verifica que el
            participante haya compartido su número.
          </p>
        </header>

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
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
          >
            Actualizar lista
          </button>
          <Link
            href="/admin/cards"
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
          >
            Administrar cartillas
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">
              No hay cartillas con pronósticos oficiales pendientes en este
              momento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white shadow-sm">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-emerald-100 bg-emerald-50/80">
                  <th className="px-4 py-3 font-semibold text-emerald-900">
                    Participante
                  </th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">
                    Cartilla
                  </th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">
                    Etapa
                  </th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">
                    WhatsApp
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-emerald-900">
                    Pendientes oficiales
                  </th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">
                    Próximo partido pendiente
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-emerald-900">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
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

                  return (
                    <tr key={row.cardId} className="align-top hover:bg-emerald-50/40">
                      <td className="px-4 py-3 text-emerald-950">
                        {row.participantName}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-950">
                        {row.cardName}
                      </td>
                      <td className="px-4 py-3 text-emerald-800">
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
                              className="w-full rounded-lg border border-emerald-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() =>
                                  handleSavePhone(row.participantUserId)
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {isSaving ? 'Guardando…' : 'Guardar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUserId(null)
                                  setPhoneDraft('')
                                }}
                                className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-emerald-800">
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
                      <td className="px-4 py-3 text-emerald-800">
                        {row.nextPendingMatch ? (
                          <div>
                            <p className="font-medium text-emerald-950">
                              {row.nextPendingMatch.label}
                            </p>
                            <time
                              dateTime={row.nextPendingMatch.match_date}
                              className="text-xs text-emerald-700/70"
                            >
                              {formatMatchDatePeru(
                                row.nextPendingMatch.match_date
                              )}
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
                        ) : (
                          <button
                            type="button"
                            disabled={isEditing}
                            onClick={() => startEditing(row)}
                            className="inline-flex rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
                          >
                            Registrar número
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
      </main>
    </div>
  )
}
