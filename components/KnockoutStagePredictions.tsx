'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import CardPredictionsSummary from '@/components/CardPredictionsSummary'
import KnockoutCardPredictionsSection from '@/components/KnockoutCardPredictionsSection'
import KnockoutRulesPanel from '@/components/KnockoutRulesPanel'
import {
  fetchKnockoutMatchesWithTeams,
  getKnockoutPhaseLabel,
  isKnockoutMatchTeamsDefined,
  KNOCKOUT_PHASE_ORDER,
} from '@/lib/knockoutMatches'
import { isKnockoutPredictionComplete } from '@/lib/knockoutPrediction'
import { isMatchPredictionClosed, sortMatchesByDateAsc } from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import type { KnockoutMatchWithTeams, KnockoutPredictionPick } from '@/lib/types'

type StatusFilter = 'ALL' | 'PENDING' | 'PREDICTED' | 'CLOSED'

function hasKnockoutPrediction(
  matchId: string,
  predictionsByMatch: Record<string, KnockoutPredictionPick>
): boolean {
  return isKnockoutPredictionComplete(predictionsByMatch[matchId])
}

type KnockoutStagePredictionsProps = {
  cardId: string
  cardName: string
}

export default function KnockoutStagePredictions({
  cardId,
  cardName,
}: KnockoutStagePredictionsProps) {
  const [matches, setMatches] = useState<KnockoutMatchWithTeams[]>([])
  const [predictionsByMatch, setPredictionsByMatch] = useState<
    Record<string, KnockoutPredictionPick>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({})

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: matchesWithTeams, error: matchesError } =
      await fetchKnockoutMatchesWithTeams()

    if (matchesError) {
      setError(matchesError)
      setLoading(false)
      return
    }

    setMatches(matchesWithTeams)

    const { data: predictionsData, error: predictionsError } = await supabase
      .from('predictions')
      .select(
        'id, card_id, match_id, local_score_predicted, visitor_score_predicted, predicted_winner_team_id, points'
      )
      .eq('card_id', cardId)

    if (predictionsError) {
      setError(predictionsError.message)
      setLoading(false)
      return
    }

    const byMatch: Record<string, KnockoutPredictionPick> = {}
    for (const p of predictionsData ?? []) {
      byMatch[p.match_id] = {
        local_score_predicted: p.local_score_predicted,
        visitor_score_predicted: p.visitor_score_predicted,
        predicted_winner_team_id: p.predicted_winner_team_id,
      }
    }
    setPredictionsByMatch(byMatch)
    setLoading(false)
  }, [cardId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const predictableMatches = useMemo(
    () => matches.filter(isKnockoutMatchTeamsDefined),
    [matches]
  )

  const summary = useMemo(() => {
    let predicted = 0
    let pending = 0
    let closed = 0

    for (const match of predictableMatches) {
      const isClosed = isMatchPredictionClosed(match.match_date)
      const predictedMatch = hasKnockoutPrediction(match.id, predictionsByMatch)

      if (isClosed) closed += 1
      if (predictedMatch) predicted += 1
      if (!predictedMatch && !isClosed) pending += 1
    }

    return {
      total: predictableMatches.length,
      predicted,
      pending,
      closed,
    }
  }, [predictableMatches, predictionsByMatch])

  const filteredMatches = useMemo(() => {
    const teamQuery = searchTerm.trim().toLowerCase()

    return matches.filter((match) => {
      const teamsDefined = isKnockoutMatchTeamsDefined(match)
      const isClosed = isMatchPredictionClosed(match.match_date)
      const predictedMatch = hasKnockoutPrediction(match.id, predictionsByMatch)

      if (statusFilter === 'CLOSED' && (!isClosed || !teamsDefined)) return false
      if (statusFilter === 'PREDICTED' && !predictedMatch) return false
      if (
        statusFilter === 'PENDING' &&
        (!teamsDefined || predictedMatch || isClosed)
      ) {
        return false
      }

      if (teamQuery && teamsDefined) {
        const local = match.local_team!.name.toLowerCase()
        const visitor = match.visitor_team!.name.toLowerCase()
        if (!local.includes(teamQuery) && !visitor.includes(teamQuery)) {
          return false
        }
      }

      if (teamQuery && !teamsDefined) {
        return false
      }

      return true
    })
  }, [matches, statusFilter, searchTerm, predictionsByMatch])

  const groupedSections = useMemo(() => {
    const grouped = new Map<string, KnockoutMatchWithTeams[]>()

    for (const match of filteredMatches) {
      const key = match.phase
      const list = grouped.get(key) ?? []
      list.push(match)
      grouped.set(key, list)
    }

    return KNOCKOUT_PHASE_ORDER.filter((phase) => grouped.has(phase)).map(
      (phase) => {
        const sectionMatches = sortMatchesByDateAsc(grouped.get(phase) ?? [])
        return {
          sectionKey: `phase-${phase}`,
          title: getKnockoutPhaseLabel(phase),
          subtitle: `${sectionMatches.length} partido${sectionMatches.length === 1 ? '' : 's'}`,
          matches: sectionMatches,
        }
      }
    )
  }, [filteredMatches])

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
    (matchId: string, prediction: KnockoutPredictionPick) => {
      setPredictionsByMatch((prev) => ({ ...prev, [matchId]: prediction }))
    },
    []
  )

  function handleClearFilters() {
    setStatusFilter('ALL')
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
      <p className="text-emerald-800">Cargando pronósticos de eliminatoria…</p>
    )
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
          {cardName}
        </h1>
        <p className="mt-2 text-emerald-800/70">
          Ingresa marcador y equipo clasificado para cada partido de
          eliminatoria directa.
        </p>
        <KnockoutRulesPanel showRoundOf32Note className="mt-4" />
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="knockout-status-filter"
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Estado
              </label>
              <select
                id="knockout-status-filter"
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
                htmlFor="knockout-team-search"
                className="mb-1 block text-xs font-medium text-emerald-800"
              >
                Buscar equipo
              </label>
              <input
                id="knockout-team-search"
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
            No hay partidos de eliminatoria disponibles por ahora.
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
            <KnockoutCardPredictionsSection
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
  )
}
