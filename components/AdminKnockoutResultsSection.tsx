'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminKnockoutMatchResultRow from '@/components/AdminKnockoutMatchResultRow'
import {
  fetchKnockoutMatchesWithTeams,
  getKnockoutPhaseLabel,
  isKnockoutSideDefined,
  KNOCKOUT_PHASE_ORDER,
} from '@/lib/knockoutMatches'
import { sortMatchesByDateAsc } from '@/lib/matchPrediction'
import type { KnockoutMatchWithTeams } from '@/lib/types'

type StatusFilter = 'ALL' | 'PENDING' | 'FINISHED'

export default function AdminKnockoutResultsSection() {
  const [matches, setMatches] = useState<KnockoutMatchWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({})

  const loadMatches = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: matchesError } = await fetchKnockoutMatchesWithTeams()

    if (matchesError) {
      setError(matchesError)
      setMatches([])
    } else {
      setMatches(data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  const filteredMatches = useMemo(() => {
    const teamQuery = searchTerm.trim().toLowerCase()

    return matches.filter((match) => {
      if (statusFilter === 'FINISHED' && match.status !== 'FINISHED') {
        return false
      }
      if (statusFilter === 'PENDING' && match.status === 'FINISHED') {
        return false
      }

      if (teamQuery) {
        const names: string[] = []
        if (isKnockoutSideDefined(match, 'local') && match.local_team) {
          names.push(match.local_team.name.toLowerCase())
        }
        if (isKnockoutSideDefined(match, 'visitor') && match.visitor_team) {
          names.push(match.visitor_team.name.toLowerCase())
        }
        if (names.length === 0 || !names.some((name) => name.includes(teamQuery))) {
          return false
        }
      }

      return true
    })
  }, [matches, statusFilter, searchTerm])

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
    return <p className="text-emerald-800">Cargando partidos de llaves…</p>
  }

  return (
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="knockout-admin-status-filter"
              className="mb-1 block text-xs font-medium text-emerald-800"
            >
              Estado
            </label>
            <select
              id="knockout-admin-status-filter"
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
              htmlFor="knockout-admin-team-search"
              className="mb-1 block text-xs font-medium text-emerald-800"
            >
              Buscar equipo
            </label>
            <input
              id="knockout-admin-team-search"
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

      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
          <p className="text-emerald-800/80">
            No hay partidos de eliminatoria disponibles.
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
          {groupedSections.map((section) => {
            const isOpen = expandedSections[section.sectionKey] ?? false

            return (
              <section
                key={section.sectionKey}
                className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.sectionKey)}
                  className="flex w-full items-center justify-between gap-3 bg-emerald-50/70 px-4 py-3 text-left transition hover:bg-emerald-100/60 sm:px-5"
                >
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      {section.title}
                    </p>
                    <p className="text-xs text-emerald-700/75">
                      {section.subtitle}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">
                    {isOpen ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>

                {isOpen && (
                  <ul className="space-y-3 p-3 sm:p-4">
                    {section.matches.map((match) => (
                      <AdminKnockoutMatchResultRow
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
  )
}
