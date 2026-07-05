'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { fetchAdminCards, type AdminCardRow } from '@/lib/adminCards'
import { AdminRouteLoading, useAdminRoute } from '@/lib/useAdminRoute'
import { supabase } from '@/lib/supabaseClient'
import type { CardStage } from '@/lib/types'

type CardStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'
type StageFilter = 'ALL' | CardStage

const PERU_DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Lima',
})

function formatDatePeru(iso: string) {
  return PERU_DATE_TIME_FORMAT.format(new Date(iso))
}

function getStatusLabel(status: string) {
  if (status === 'ACTIVE') return 'Activa'
  if (status === 'INACTIVE') return 'Inactiva'
  return status
}

function getStageLabel(stage: CardStage) {
  return stage === 'KNOCKOUT_STAGE' ? 'Llaves' : 'Fase de grupos'
}

export default function AdminCardsPage() {
  const { accessState, handleLogout, AdminDenied } = useAdminRoute()
  const [cards, setCards] = useState<AdminCardRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<CardStatusFilter>('ALL')
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingCardId, setUpdatingCardId] = useState<string | null>(null)

  const loadCards = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await fetchAdminCards(supabase)

    if (fetchError) {
      setError(fetchError)
      setCards([])
    } else {
      setCards(data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (accessState === 'allowed') {
      loadCards()
    }
  }, [accessState, loadCards])

  const filteredCards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return cards
      .filter((card) => {
        if (statusFilter === 'ALL') return true
        return card.status === statusFilter
      })
      .filter((card) => {
        if (stageFilter === 'ALL') return true
        return card.stage === stageFilter
      })
      .filter((card) => {
        if (!query) return true
        return (
          card.participant_name.toLowerCase().includes(query) ||
          (card.participant_email ?? '').toLowerCase().includes(query) ||
          card.card_name.toLowerCase().includes(query)
        )
      })
  }, [cards, statusFilter, stageFilter, searchTerm])

  async function handleChangeStatus(
    card: AdminCardRow,
    nextStatus: 'ACTIVE' | 'INACTIVE'
  ) {
    setUpdatingCardId(card.id)
    setError(null)

    const adminNote =
      nextStatus === 'INACTIVE'
        ? 'Cartilla inhabilitada por administración'
        : 'Cartilla habilitada por administración'

    const { error: rpcError } = await supabase.rpc('admin_update_card_status', {
      p_card_id: card.id,
      p_status: nextStatus,
      p_admin_note: adminNote,
    })

    setUpdatingCardId(null)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    await loadCards()
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
      title="Gestión global de cartillas"
      description="Administra todas las cartillas de todos los participantes. Activa o inactiva cartillas según corresponda."
    >
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <section className="mb-6 rounded-xl border border-violet-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="stage-filter"
              className="mb-1 block text-xs font-medium text-slate-800"
            >
              Etapa
            </label>
            <select
              id="stage-filter"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as StageFilter)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value="ALL">Todas</option>
              <option value="KNOCKOUT_STAGE">Llaves</option>
              <option value="GROUP_STAGE">Fase de grupos</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="status-filter"
              className="mb-1 block text-xs font-medium text-slate-800"
            >
              Estado
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as CardStatusFilter)
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value="ALL">Todas</option>
              <option value="ACTIVE">Activas</option>
              <option value="INACTIVE">Inactivas</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="search"
              className="mb-1 block text-xs font-medium text-slate-800"
            >
              Buscar por participante o cartilla
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, email o cartilla"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-700/80">
          Mostrando <span className="font-semibold">{filteredCards.length}</span>{' '}
          de <span className="font-semibold">{cards.length}</span> cartillas
        </p>
      </section>

      {filteredCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-12 text-center">
          <p className="text-slate-700/80">
            No hay cartillas que coincidan con los filtros.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white shadow-sm">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead>
              <tr className="border-b border-violet-100 bg-violet-50/80">
                <th className="px-4 py-3 font-semibold text-slate-900">ID</th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Cartilla
                </th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Participante
                </th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Email
                </th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Etapa
                </th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Estado
                </th>
                <th className="px-4 py-3 font-semibold text-slate-900">
                  Creación
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">
                  Pronósticos
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {filteredCards.map((card) => {
                const isActive = card.status === 'ACTIVE'
                const nextStatus = isActive ? 'INACTIVE' : 'ACTIVE'
                const isUpdating = updatingCardId === card.id

                return (
                  <tr key={card.id} className="align-top hover:bg-violet-50/30">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {card.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-950">
                      {card.card_name}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {card.participant_name}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {card.participant_email ?? (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          card.stage === 'KNOCKOUT_STAGE'
                            ? 'bg-violet-100 text-violet-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {getStageLabel(card.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {getStatusLabel(card.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <time dateTime={card.created_at}>
                        {formatDatePeru(card.created_at)}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                      {card.prediction_count}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        <Link
                          href={`/cards-public/${card.id}`}
                          className="inline-flex rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                        >
                          Ver detalle
                        </Link>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleChangeStatus(card, nextStatus)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                            isActive
                              ? 'border border-red-200 text-red-700 hover:bg-red-50'
                              : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {isUpdating
                            ? 'Actualizando…'
                            : isActive
                              ? 'Inactivar'
                              : 'Activar'}
                        </button>
                      </div>
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
