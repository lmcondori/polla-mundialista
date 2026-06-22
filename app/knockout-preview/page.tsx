'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import BestThirdsTab from '@/components/knockout-preview/BestThirdsTab'
import GroupStandingsTab from '@/components/knockout-preview/GroupStandingsTab'
import KnockoutBracketTab from '@/components/knockout-preview/KnockoutBracketTab'
import Navbar from '@/components/Navbar'
import {
  computeBestThirdPlaces,
  computeGroupStandings,
  getQualifiedThirdTeamIds,
} from '@/lib/groupStandings'
import { resolveKnockoutBracket } from '@/lib/knockoutBracket'
import type { TeamWithGroup } from '@/lib/knockoutPreviewTypes'
import { supabase } from '@/lib/supabaseClient'
import type { Match } from '@/lib/types'

type PreviewTab = 'standings' | 'thirds' | 'bracket'

const TABS: { id: PreviewTab; label: string }[] = [
  { id: 'standings', label: 'Posiciones por grupo' },
  { id: 'thirds', label: 'Mejores terceros' },
  { id: 'bracket', label: 'Llaves' },
]

const FIFA_DISCLAIMER =
  'Clasificación referencial según resultados registrados. No contempla todos los criterios oficiales de desempate FIFA.'

export default function KnockoutPreviewPage() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('standings')
  const [teams, setTeams] = useState<TeamWithGroup[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [teamsResult, matchesResult] = await Promise.all([
      supabase
        .from('teams')
        .select('id, name, fifa_code, group_name, flag_url')
        .order('group_name', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('matches')
        .select(
          'id, phase, group_name, local_team_id, visitor_team_id, match_date, local_score_real, visitor_score_real, status'
        )
        .eq('phase', 'GROUP_STAGE'),
    ])

    if (teamsResult.error) {
      setError(teamsResult.error.message)
      setLoading(false)
      return
    }

    if (matchesResult.error) {
      setError(matchesResult.error.message)
      setLoading(false)
      return
    }

    setTeams((teamsResult.data ?? []) as TeamWithGroup[])
    setMatches((matchesResult.data ?? []) as Match[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const standingsByGroup = useMemo(
    () => computeGroupStandings(teams, matches),
    [teams, matches]
  )

  const bestThirds = useMemo(
    () => computeBestThirdPlaces(standingsByGroup),
    [standingsByGroup]
  )

  const qualifiedThirdTeamIds = useMemo(
    () => getQualifiedThirdTeamIds(bestThirds),
    [bestThirds]
  )

  const bracketMatches = useMemo(
    () => resolveKnockoutBracket(standingsByGroup),
    [standingsByGroup]
  )

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            Llaves probables
          </h1>
          <p className="mt-2 text-sm text-emerald-800/80">
            Proyección referencial según resultados registrados.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:underline"
          >
            ← Volver al inicio
          </Link>
        </header>

        <div
          role="status"
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {FIFA_DISCLAIMER}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <p className="py-12 text-center text-emerald-800">Cargando datos…</p>
        )}

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'standings' && (
              <>
                <div className="mb-4 flex flex-wrap gap-4 text-xs text-emerald-800/80">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-6 rounded bg-emerald-50 ring-1 ring-emerald-200" />
                    Clasifican 1º y 2º
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-6 rounded bg-amber-50 ring-1 ring-amber-200" />
                    Mejor tercero (entre los 8 clasificados)
                  </span>
                </div>
                <GroupStandingsTab
                  standingsByGroup={standingsByGroup}
                  qualifiedThirdTeamIds={qualifiedThirdTeamIds}
                />
              </>
            )}

            {activeTab === 'thirds' && <BestThirdsTab thirds={bestThirds} />}

            {activeTab === 'bracket' && (
              <KnockoutBracketTab matches={bracketMatches} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
