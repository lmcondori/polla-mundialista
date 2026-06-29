'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import RankingPodium from '@/components/RankingPodium'
import RankingSummaryCards from '@/components/RankingSummaryCards'
import RankingTable from '@/components/RankingTable'
import {
  applyRankingOrder,
  RANKING_ENTRY_SELECT,
  RANKING_VIEW_BY_STAGE,
  type RankingStage,
} from '@/lib/ranking'
import { supabase } from '@/lib/supabaseClient'
import type { RankingEntry } from '@/lib/types'

const RANKING_TABS: { value: RankingStage; label: string }[] = [
  { value: 'GROUP_STAGE', label: 'Fase de grupos' },
  { value: 'KNOCKOUT_STAGE', label: 'Llaves' },
]

const RANKING_COPY: Record<
  RankingStage,
  { title: string; description: string; tableTitle: string }
> = {
  GROUP_STAGE: {
    title: 'Ranking general',
    description: 'Clasificación por puntos totales de cada cartilla de grupos.',
    tableTitle: 'Tabla general',
  },
  KNOCKOUT_STAGE: {
    title: 'Ranking de llaves',
    description:
      'Clasificación por puntos totales de cada cartilla de eliminatoria.',
    tableTitle: 'Tabla de llaves',
  },
}

export default function RankingPage() {
  const [activeStage, setActiveStage] = useState<RankingStage>('GROUP_STAGE')
  const [entries, setEntries] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRanking() {
      setLoading(true)
      setError(null)

      const viewName = RANKING_VIEW_BY_STAGE[activeStage]
      const { data, error: fetchError } = await applyRankingOrder(
        supabase.from(viewName).select(RANKING_ENTRY_SELECT)
      )

      if (fetchError) {
        setError(fetchError.message)
        setEntries([])
      } else {
        setEntries((data ?? []) as RankingEntry[])
      }

      setLoading(false)
    }

    loadRanking()
  }, [activeStage])

  const copy = RANKING_COPY[activeStage]
  const isKnockout = activeStage === 'KNOCKOUT_STAGE'

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-emerald-800/80">
            El ranking considera únicamente cartillas habilitadas por la
            administración.
          </p>
          <p className="mt-2 text-emerald-800/70">{copy.description}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:underline"
          >
            ← Ir al dashboard
          </Link>
        </header>

        <div
          className="mb-8 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Etapa del ranking"
        >
          {RANKING_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeStage === tab.value}
              onClick={() => setActiveStage(tab.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeStage === tab.value
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <p className="py-12 text-center text-emerald-800">Cargando ranking…</p>
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
            <RankingSummaryCards entries={entries} />
            <RankingPodium entries={entries} />
            <section>
              <h2 className="mb-4 text-lg font-semibold text-emerald-900">
                {copy.tableTitle}
              </h2>
              <RankingTable
                entries={entries}
                resultHitsLabel={
                  isKnockout ? 'Aciertos de clasificado' : undefined
                }
                showPublicDetail={!isKnockout}
              />
            </section>
          </>
        )}
      </main>
    </div>
  )
}
