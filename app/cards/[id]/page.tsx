'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import CardPredictionsSection from '@/components/CardPredictionsSection'
import CardPredictionsSummary from '@/components/CardPredictionsSummary'
import KnockoutStagePredictions from '@/components/KnockoutStagePredictions'
import Navbar from '@/components/Navbar'
import { fetchMatchesWithTeams } from '@/lib/matches'
import {
  getPeruDateKey,
  getPeruDateLabelLong,
  isMatchPredictionClosed,
  sortMatchesByDateAsc,
} from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import type { Card, CardStage, MatchWithTeams, Prediction } from '@/lib/types'

type ViewMode = 'GROUP' | 'DATE'
type StatusFilter = 'ALL' | 'PENDING' | 'PREDICTED' | 'CLOSED'

type PredictionPick = Pick<
  Prediction,
  'local_score_predicted' | 'visitor_score_predicted'
>

const GROUP_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function hasPrediction(
  matchId: string,
  predictionsByMatch: Record<string, PredictionPick>
): boolean {
  return predictionsByMatch[matchId] !== undefined
}

export default function CardDetailPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = params.id as string

  const [card, setCard] = useState<
    Pick<Card, 'id' | 'card_name' | 'stage'> | null
  >(null)
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [predictionsByMatch, setPredictionsByMatch] = useState<
    Record<string, PredictionPick>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('GROUP')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [groupFilter, setGroupFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({})

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.replace('/login')
      return
    }

    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select('id, card_name, user_id, stage')
      .eq('id', cardId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (cardError) {
      setError(cardError.message)
      setLoading(false)
      return
    }

    if (!cardData) {
      router.replace('/dashboard')
      return
    }

    const cardStage = (cardData.stage ?? 'GROUP_STAGE') as CardStage

    setCard({
      id: cardData.id,
      card_name: cardData.card_name,
      stage: cardStage,
    })

    if (cardStage === 'KNOCKOUT_STAGE') {
      setLoading(false)
      return
    }

    const { data: matchesWithTeams, error: matchesError } =
      await fetchMatchesWithTeams()

    if (matchesError) {
      setError(matchesError)
      setLoading(false)
      return
    }

    setMatches(matchesWithTeams)

    const { data: predictionsData, error: predictionsError } = await supabase
      .from('predictions')
      .select(
        'id, card_id, match_id, local_score_predicted, visitor_score_predicted, points'
      )
      .eq('card_id', cardId)

    if (predictionsError) {
      setError(predictionsError.message)
      setLoading(false)
      return
    }

    const byMatch: Record<string, PredictionPick> = {}
    for (const p of predictionsData ?? []) {
      byMatch[p.match_id] = {
        local_score_predicted: p.local_score_predicted,
        visitor_score_predicted: p.visitor_score_predicted,
      }
    }
    setPredictionsByMatch(byMatch)
    setLoading(false)
  }, [cardId, router])

  useEffect(() => {
    loadData()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [loadData, router])

  const summary = useMemo(() => {
    let predicted = 0
    let pending = 0
    let closed = 0

    for (const match of matches) {
      const isClosed = isMatchPredictionClosed(match.match_date)
      const predictedMatch = hasPrediction(match.id, predictionsByMatch)

      if (isClosed) closed += 1
      if (predictedMatch) predicted += 1
      if (!predictedMatch && !isClosed) pending += 1
    }

    return {
      total: matches.length,
      predicted,
      pending,
      closed,
    }
  }, [matches, predictionsByMatch])

  const filteredMatches = useMemo(() => {
    const teamQuery = searchTerm.trim().toLowerCase()

    return matches.filter((match) => {
      const isClosed = isMatchPredictionClosed(match.match_date)
      const predictedMatch = hasPrediction(match.id, predictionsByMatch)

      if (statusFilter === 'CLOSED' && !isClosed) return false
      if (statusFilter === 'PREDICTED' && !predictedMatch) return false
      if (statusFilter === 'PENDING' && (predictedMatch || isClosed)) return false

      if (groupFilter !== 'ALL') {
        if ((match.group_name ?? '').toUpperCase() !== groupFilter) return false
      }

      if (teamQuery) {
        const local = match.local_team.name.toLowerCase()
        const visitor = match.visitor_team.name.toLowerCase()
        if (!local.includes(teamQuery) && !visitor.includes(teamQuery)) {
          return false
        }
      }

      return true
    })
  }, [matches, statusFilter, groupFilter, searchTerm, predictionsByMatch])

  const groupedSections = useMemo(() => {
    if (viewMode === 'GROUP') {
      const grouped = new Map<string, MatchWithTeams[]>()

      for (const match of filteredMatches) {
        const key = (match.group_name ?? '').toUpperCase() || 'SIN_GRUPO'
        const list = grouped.get(key) ?? []
        list.push(match)
        grouped.set(key, list)
      }

      return Array.from(grouped.entries())
        .sort(([a], [b]) => {
          if (a === 'SIN_GRUPO') return 1
          if (b === 'SIN_GRUPO') return -1
          return a.localeCompare(b)
        })
        .map(([key, sectionMatches]) => {
          const sorted = sortMatchesByDateAsc(sectionMatches)
          const title =
            key === 'SIN_GRUPO' ? 'Sin grupo' : `Grupo ${key}`
          return {
            sectionKey: `group-${key}`,
            title,
            subtitle: `${sorted.length} partido${sorted.length === 1 ? '' : 's'}`,
            matches: sorted,
          }
        })
    }

    const grouped = new Map<string, { label: string; matches: MatchWithTeams[] }>()

    for (const match of filteredMatches) {
      const dateKey = getPeruDateKey(match.match_date)
      const existing = grouped.get(dateKey)

      if (!existing) {
        grouped.set(dateKey, {
          label: getPeruDateLabelLong(match.match_date),
          matches: [match],
        })
        continue
      }

      existing.matches.push(match)
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, section]) => {
        const sorted = sortMatchesByDateAsc(section.matches)
        return {
          sectionKey: `date-${dateKey}`,
          title: section.label,
          subtitle: `${sorted.length} partido${sorted.length === 1 ? '' : 's'}`,
          matches: sorted,
        }
      })
  }, [filteredMatches, viewMode])

  useEffect(() => {
    setExpandedSections((prev) => {
      const next: Record<string, boolean> = {}
      groupedSections.forEach((section, index) => {
        next[section.sectionKey] = prev[section.sectionKey] ?? index === 0
      })
      return next
    })
  }, [groupedSections])

  const handlePredictionSaved = useCallback(
    (matchId: string, prediction: PredictionPick) => {
      setPredictionsByMatch((prev) => ({ ...prev, [matchId]: prediction }))
    },
    []
  )

  function handleClearFilters() {
    setViewMode('GROUP')
    setStatusFilter('ALL')
    setGroupFilter('ALL')
    setSearchTerm('')
  }

  function toggleSection(sectionKey: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-emerald-50">
        <p className="text-emerald-800">Cargando pronósticos…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar showAuthLinks={false} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Volver al dashboard
        </Link>

        {card?.stage === 'KNOCKOUT_STAGE' ? (
          <KnockoutStagePredictions
            cardId={cardId}
            cardName={card?.card_name ?? 'Cartilla'}
          />
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
                {card?.card_name ?? 'Cartilla'}
              </h1>
              <p className="mt-2 text-emerald-800/70">
                Ingresa tus pronósticos de goles para cada partido.
              </p>
              <Link
                href={`/cards/${cardId}/summary`}
                className="mt-4 inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
              >
                Ver resumen de cartilla
              </Link>
            </header>

            {error && (
              <p
                role="alert"
                className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {matches.length > 0 && (
          <CardPredictionsSummary
            total={summary.total}
            predicted={summary.predicted}
            pending={summary.pending}
            closed={summary.closed}
          />
        )}

        {matches.length > 0 && (
          <section className="mb-6 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setViewMode('GROUP')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === 'GROUP'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                Por grupo
              </button>
              <button
                type="button"
                onClick={() => setViewMode('DATE')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === 'DATE'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                Por fecha
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">Todos</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="PREDICTED">Pronosticados</option>
                  <option value="CLOSED">Cerrados</option>
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
                  {GROUP_OPTIONS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
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
                Mostrando{' '}
                <span className="font-semibold">{filteredMatches.length}</span> de{' '}
                <span className="font-semibold">{matches.length}</span> partidos
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
              >
                Limpiar filtros
              </button>
            </div>
          </section>
        )}

        {matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">
              No hay partidos disponibles por ahora.
            </p>
          </div>
        ) : groupedSections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">
              No hay partidos que coincidan con los filtros.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedSections.map((section) => (
              <CardPredictionsSection
                key={section.sectionKey}
                sectionKey={section.sectionKey}
                title={section.title}
                subtitle={section.subtitle}
                matches={section.matches}
                cardId={cardId}
                predictionsByMatch={predictionsByMatch}
                isOpen={expandedSections[section.sectionKey] ?? false}
                onToggle={() => toggleSection(section.sectionKey)}
                onPredictionSaved={handlePredictionSaved}
              />
            ))}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  )
}
