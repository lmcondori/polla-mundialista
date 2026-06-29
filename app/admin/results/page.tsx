'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminKnockoutResultsSection from '@/components/AdminKnockoutResultsSection'
import AdminMatchResultRow from '@/components/AdminMatchResultRow'
import Navbar from '@/components/Navbar'
import { fetchMatchesWithTeams } from '@/lib/matches'
import { supabase } from '@/lib/supabaseClient'
import type { MatchWithTeams } from '@/lib/types'

type AccessState = 'checking' | 'denied' | 'allowed'
type StageView = 'GROUP_STAGE' | 'KNOCKOUT_STAGE'
type StatusFilter = 'ALL' | 'PENDING' | 'FINISHED'
type DateFilter = 'ALL' | 'TODAY' | 'CUSTOM'

const PERU_DATE_LABEL_FORMAT = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Lima',
})

function getPeruDateParts(dateIso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(dateIso))

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'

  return { year, month, day }
}

function getPeruDateKey(dateIso: string): string {
  const { year, month, day } = getPeruDateParts(dateIso)
  return `${year}-${month}-${day}`
}

function getTodayPeruKey(): string {
  const { year, month, day } = getPeruDateParts(new Date().toISOString())
  return `${year}-${month}-${day}`
}

function getPeruDateLabel(dateIso: string): string {
  return PERU_DATE_LABEL_FORMAT.format(new Date(dateIso))
}

export default function AdminResultsPage() {
  const router = useRouter()
  const [accessState, setAccessState] = useState<AccessState>('checking')
  const [stageView, setStageView] = useState<StageView>('GROUP_STAGE')
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [groupFilter, setGroupFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL')
  const [customDate, setCustomDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true)
    setError(null)

    const { data, error: matchesError } = await fetchMatchesWithTeams()

    if (matchesError) {
      setError(matchesError)
      setMatches([])
    } else {
      setMatches(data)
    }

    setMatchesLoading(false)
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
      await loadMatches()
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, loadMatches])

  const filteredMatches = useMemo(() => {
    const teamQuery = searchTerm.trim().toLowerCase()
    const todayPeruKey = getTodayPeruKey()

    return matches
      .filter((match) => {
        if (statusFilter === 'FINISHED') return match.status === 'FINISHED'
        if (statusFilter === 'PENDING') return match.status !== 'FINISHED'
        return true
      })
      .filter((match) => {
        if (groupFilter === 'ALL') return true
        return (match.group_name ?? '').toUpperCase() === groupFilter
      })
      .filter((match) => {
        const matchDay = getPeruDateKey(match.match_date)
        if (dateFilter === 'TODAY') return matchDay === todayPeruKey
        if (dateFilter === 'CUSTOM' && customDate) return matchDay === customDate
        return true
      })
      .filter((match) => {
        if (!teamQuery) return true
        const local = match.local_team.name.toLowerCase()
        const visitor = match.visitor_team.name.toLowerCase()
        return local.includes(teamQuery) || visitor.includes(teamQuery)
      })
  }, [matches, statusFilter, groupFilter, dateFilter, customDate, searchTerm])

  const groupedByDate = useMemo(() => {
    const grouped = new Map<string, { label: string; matches: MatchWithTeams[] }>()

    for (const match of filteredMatches) {
      const dateKey = getPeruDateKey(match.match_date)
      const existing = grouped.get(dateKey)

      if (!existing) {
        grouped.set(dateKey, {
          label: getPeruDateLabel(match.match_date),
          matches: [match],
        })
        continue
      }

      existing.matches.push(match)
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, section]) => ({
        dateKey,
        label: section.label,
        matches: section.matches.sort(
          (a, b) =>
            new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        ),
      }))
  }, [filteredMatches])

  useEffect(() => {
    setExpandedDates((prev) => {
      const next: Record<string, boolean> = {}

      groupedByDate.forEach((section, index) => {
        next[section.dateKey] = prev[section.dateKey] ?? index === 0
      })

      return next
    })
  }, [groupedByDate])

  function toggleDateSection(dateKey: string) {
    setExpandedDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }))
  }

  function handleClearFilters() {
    setStatusFilter('ALL')
    setGroupFilter('ALL')
    setDateFilter('ALL')
    setCustomDate('')
    setSearchTerm('')
  }

  if (
    accessState === 'checking' ||
    (accessState === 'allowed' &&
      stageView === 'GROUP_STAGE' &&
      matchesLoading)
  ) {
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Volver al dashboard
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            Administrar resultados
          </h1>
          <p className="mt-2 text-emerald-800/70">
            {stageView === 'GROUP_STAGE'
              ? 'Registra el marcador real de cada partido de fase de grupos. Al guardar se actualiza el partido y se recalculan los puntos de los pronósticos.'
              : 'Registra marcador y equipo clasificado de eliminatoria directa. Al guardar se recalculan puntos y se propagan equipos a partidos siguientes.'}
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStageView('GROUP_STAGE')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              stageView === 'GROUP_STAGE'
                ? 'bg-emerald-600 text-white'
                : 'border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            Fase de grupos
          </button>
          <button
            type="button"
            onClick={() => setStageView('KNOCKOUT_STAGE')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              stageView === 'KNOCKOUT_STAGE'
                ? 'bg-emerald-600 text-white'
                : 'border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            Llaves
          </button>
        </div>

        {stageView === 'KNOCKOUT_STAGE' ? (
          <AdminKnockoutResultsSection />
        ) : (
          <>
        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <section className="mb-6 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendientes</option>
                <option value="FINISHED">Finalizados</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="group-filter"
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Grupo
              </label>
              <select
                id="group-filter"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="ALL">Todos</option>
                {Array.from({ length: 12 }).map((_, index) => {
                  const group = String.fromCharCode(65 + index)
                  return (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label
                htmlFor="date-filter"
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Fecha
              </label>
              <select
                id="date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="ALL">Todas</option>
                <option value="TODAY">Hoy</option>
                <option value="CUSTOM">Seleccionar fecha</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="team-search"
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Buscar equipo
              </label>
              <input
                id="team-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Local o visitante"
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-emerald-800/80">
              Mostrando <span className="font-semibold">{filteredMatches.length}</span>{' '}
              de <span className="font-semibold">{matches.length}</span> partidos
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
            >
              Limpiar filtros
            </button>
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="mt-3 max-w-xs">
              <label
                htmlFor="custom-date"
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Selecciona fecha
              </label>
              <input
                id="custom-date"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          )}
        </section>

        {groupedByDate.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">
              No hay partidos que coincidan con los filtros.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByDate.map((section) => {
              const isOpen = expandedDates[section.dateKey]

              return (
                <section
                  key={section.dateKey}
                  className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleDateSection(section.dateKey)}
                    className="flex w-full items-center justify-between gap-3 bg-emerald-50/70 px-4 py-3 text-left transition hover:bg-emerald-100/60 sm:px-5"
                  >
                    <div>
                      <p className="text-sm font-semibold capitalize text-emerald-900">
                        {section.label}
                      </p>
                      <p className="text-xs text-emerald-700/75">
                        {section.matches.length} partido
                        {section.matches.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">
                      {isOpen ? 'Ocultar' : 'Mostrar'}
                    </span>
                  </button>

                  {isOpen && (
                    <ul className="space-y-3 p-3 sm:p-4">
                      {section.matches.map((match) => (
                        <AdminMatchResultRow
                          key={match.id}
                          match={match}
                          onSaved={loadMatches}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  )
}
