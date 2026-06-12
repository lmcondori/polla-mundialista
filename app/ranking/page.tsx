'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import RankingPodium from '@/components/RankingPodium'
import RankingSummaryCards from '@/components/RankingSummaryCards'
import RankingTable from '@/components/RankingTable'
import { applyRankingOrder, RANKING_ENTRY_SELECT } from '@/lib/ranking'
import { supabase } from '@/lib/supabaseClient'
import type { RankingEntry } from '@/lib/types'

export default function RankingPage() {
  const [entries, setEntries] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRanking() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await applyRankingOrder(
        supabase.from('vw_ranking_cards').select(RANKING_ENTRY_SELECT)
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
  }, [])

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            Ranking general
          </h1>
          <p className="mt-2 text-sm text-emerald-800/80">
            El ranking considera únicamente cartillas habilitadas por la
            administración.
          </p>
          <p className="mt-2 text-emerald-800/70">
            Clasificación por puntos totales de cada cartilla.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:underline"
          >
            ← Ir al dashboard
          </Link>
        </header>

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
                Tabla general
              </h2>
              <RankingTable entries={entries} />
            </section>
          </>
        )}
      </main>
    </div>
  )
}
