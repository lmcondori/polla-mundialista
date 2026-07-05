'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabaseClient'

type AccessState = 'checking' | 'denied' | 'allowed'
type CardStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

type CardAdminRow = {
  id: string
  user_id: string
  card_name: string
  status: 'ACTIVE' | 'INACTIVE' | string
  admin_note: string | null
  created_at: string
  updated_at: string
}

type ProfileMini = {
  id: string
  full_name: string | null
  whatsapp_phone: string | null
  whatsapp_enabled: boolean | null
}

const PERU_DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Lima',
})

function formatDatePeru(iso: string) {
  return PERU_DATE_TIME_FORMAT.format(new Date(iso))
}

function getStatusLabel(status: string) {
  if (status === 'ACTIVE') return 'Habilitada'
  if (status === 'INACTIVE') return 'Inhabilitada'
  return status
}

export default function AdminCardsPage() {
  const router = useRouter()
  const [accessState, setAccessState] = useState<AccessState>('checking')
  const [cards, setCards] = useState<CardAdminRow[]>([])
  const [profilesById, setProfilesById] = useState<
    Record<string, { full_name: string; whatsapp_phone: string | null }>
  >({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<CardStatusFilter>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingCardId, setUpdatingCardId] = useState<string | null>(null)

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

  const loadCards = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select('id, user_id, card_name, status, admin_note, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (cardsError) {
      setError(cardsError.message)
      setCards([])
      setProfilesById({})
      setLoading(false)
      return
    }

    const nextCards = (cardsData ?? []) as CardAdminRow[]
    setCards(nextCards)

    const userIds = [...new Set(nextCards.map((card) => card.user_id))]

    if (userIds.length === 0) {
      setProfilesById({})
      setLoading(false)
      return
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, whatsapp_phone, whatsapp_enabled')
      .in('id', userIds)

    if (profilesError) {
      setError(profilesError.message)
      setProfilesById({})
      setLoading(false)
      return
    }

    const map: Record<string, { full_name: string; whatsapp_phone: string | null }> =
      {}
    for (const profile of (profilesData ?? []) as ProfileMini[]) {
      map[profile.id] = {
        full_name: profile.full_name ?? 'Participante',
        whatsapp_phone:
          profile.whatsapp_enabled === false ? null : profile.whatsapp_phone,
      }
    }
    setProfilesById(map)
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
      await loadCards()
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router, loadCards])

  const filteredCards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return cards
      .filter((card) => {
        if (statusFilter === 'ALL') return true
        return card.status === statusFilter
      })
      .filter((card) => {
        if (!query) return true
        const participant = (profilesById[card.user_id]?.full_name ?? '').toLowerCase()
        const cardName = card.card_name.toLowerCase()
        return participant.includes(query) || cardName.includes(query)
      })
  }, [cards, statusFilter, searchTerm, profilesById])

  async function handleChangeStatus(card: CardAdminRow, nextStatus: 'ACTIVE' | 'INACTIVE') {
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Volver al dashboard
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            Administrar cartillas
          </h1>
          <p className="mt-2 text-emerald-800/70">
            Habilita o inhabilita cartillas de participantes.
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

        <section className="mb-6 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="status-filter"
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Estado
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CardStatusFilter)}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="ALL">Todas</option>
                <option value="ACTIVE">Habilitadas</option>
                <option value="INACTIVE">Inhabilitadas</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="search"
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Buscar por participante o cartilla
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre del participante o cartilla"
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <p className="mt-3 text-sm text-emerald-800/80">
            Mostrando <span className="font-semibold">{filteredCards.length}</span> de{' '}
            <span className="font-semibold">{cards.length}</span> cartillas
          </p>
        </section>

        {filteredCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">
              No hay cartillas que coincidan con los filtros.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white shadow-sm">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-emerald-100 bg-emerald-50/80">
                  <th className="px-4 py-3 font-semibold text-emerald-900">ID</th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">Cartilla</th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">Participante</th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">WhatsApp</th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">Estado</th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">Creación</th>
                  <th className="px-4 py-3 font-semibold text-emerald-900">Nota administrativa</th>
                  <th className="px-4 py-3 text-right font-semibold text-emerald-900">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {filteredCards.map((card) => {
                  const participantName =
                    profilesById[card.user_id]?.full_name ?? 'Participante'
                  const whatsappPhone =
                    profilesById[card.user_id]?.whatsapp_phone ?? null
                  const isActive = card.status === 'ACTIVE'
                  const nextStatus = isActive ? 'INACTIVE' : 'ACTIVE'
                  const isUpdating = updatingCardId === card.id

                  return (
                    <tr key={card.id} className="align-top hover:bg-emerald-50/40">
                      <td className="px-4 py-3 font-mono text-xs text-emerald-800">
                        {card.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-950">{card.card_name}</td>
                      <td className="px-4 py-3 text-emerald-800">{participantName}</td>
                      <td className="px-4 py-3 text-emerald-800">
                        {whatsappPhone ? (
                          whatsappPhone
                        ) : (
                          <span className="text-emerald-700/60">
                            Sin número registrado
                          </span>
                        )}
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
                      <td className="px-4 py-3 text-emerald-800">
                        <time dateTime={card.created_at}>
                          {formatDatePeru(card.created_at)}
                        </time>
                      </td>
                      <td className="px-4 py-3 text-emerald-800/80">
                        {card.admin_note ? (
                          card.admin_note
                        ) : (
                          <span className="text-emerald-700/60">Sin nota</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleChangeStatus(card, nextStatus)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                            isActive
                              ? 'border border-red-200 text-red-700 hover:bg-red-50'
                              : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {isUpdating
                            ? 'Actualizando…'
                            : isActive
                              ? 'Inhabilitar'
                              : 'Habilitar'}
                        </button>
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
