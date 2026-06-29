'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import HomeTodayMatchCard from '@/components/HomeTodayMatchCard'
import Navbar from '@/components/Navbar'
import { fetchHomeTodayMatches, type HomeTodayMatch } from '@/lib/homeTodayMatches'
import {
  getPeruDateKey,
  getTodayPeruDateKey,
  isMatchPredictionClosed,
  sortMatchesByDateAsc,
} from '@/lib/matchPrediction'
import { applyRankingOrder, RANKING_ENTRY_SELECT } from '@/lib/ranking'
import { supabase } from '@/lib/supabaseClient'
import type { RankingEntry } from '@/lib/types'

type PendingSummary = {
  todayMatches: number
  predicted: number
  pending: number
  activeCards: number
}

const GROUP_STAGE_PHASE = 'GROUP_STAGE'

function computePendingSummary(
  todayMatches: HomeTodayMatch[],
  activeCardIds: string[],
  predictedPairs: Set<string>
): PendingSummary {
  const openMatches = todayMatches.filter(
    (match) => !isMatchPredictionClosed(match.match_date)
  )
  const totalSlots = activeCardIds.length * openMatches.length
  let predicted = 0

  for (const cardId of activeCardIds) {
    for (const match of openMatches) {
      if (predictedPairs.has(`${cardId}:${match.id}`)) {
        predicted += 1
      }
    }
  }

  return {
    todayMatches: todayMatches.length,
    predicted,
    pending: Math.max(0, totalSlots - predicted),
    activeCards: activeCardIds.length,
  }
}

export default function HomePageContent() {
  const [todayMatches, setTodayMatches] = useState<HomeTodayMatch[]>([])
  const [topRanking, setTopRanking] = useState<RankingEntry[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pendingSummary, setPendingSummary] = useState<PendingSummary | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const todayKey = getTodayPeruDateKey()

    const { data: matches, error: matchesError } = await fetchHomeTodayMatches()

    if (matchesError) {
      setError(matchesError)
      setLoading(false)
      return
    }

    const matchesToday = sortMatchesByDateAsc(matches).filter(
      (match) => getPeruDateKey(match.match_date) === todayKey
    )

    setTodayMatches(matchesToday)

    const { data: rankingData, error: rankingError } = await applyRankingOrder(
      supabase.from('vw_ranking_cards').select(RANKING_ENTRY_SELECT)
    ).limit(3)

    if (rankingError) {
      setError(rankingError.message)
    } else {
      setTopRanking((rankingData ?? []) as RankingEntry[])
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    setIsAuthenticated(Boolean(session?.user))

    if (session?.user) {
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'ACTIVE')
        .or('stage.eq.GROUP_STAGE,stage.is.null')

      if (cardsError) {
        setError(cardsError.message)
        setPendingSummary(null)
      } else {
        const activeCardIds = (cardsData ?? []).map((card) => card.id)
        const openTodayIds = matchesToday
          .filter(
            (match) =>
              match.phase === GROUP_STAGE_PHASE &&
              !isMatchPredictionClosed(match.match_date)
          )
          .map((match) => match.id)

        let predictedPairs = new Set<string>()

        if (activeCardIds.length > 0 && openTodayIds.length > 0) {
          const { data: predictionsData, error: predictionsError } =
            await supabase
              .from('predictions')
              .select('card_id, match_id')
              .in('card_id', activeCardIds)
              .in('match_id', openTodayIds)

          if (predictionsError) {
            setError(predictionsError.message)
          } else {
            predictedPairs = new Set(
              (predictionsData ?? []).map(
                (row) => `${row.card_id}:${row.match_id}`
              )
            )
          }
        }

        setPendingSummary(
          computePendingSummary(matchesToday, activeCardIds, predictedPairs)
        )
      }
    } else {
      setPendingSummary(null)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const showPendingSection = useMemo(
    () => isAuthenticated && pendingSummary !== null,
    [isAuthenticated, pendingSummary]
  )

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar showAuthLinks={!isAuthenticated} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <section className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Mundial 2026
          </p>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
            Polla Mundialista 2026
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-emerald-900/80">
            Aplicación recreativa para pronosticar resultados de partidos del
            Mundial.
          </p>

          <div className="flex w-full flex-col gap-3 sm:mx-auto sm:max-w-lg sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/ranking"
              className="rounded-xl border border-emerald-300 bg-white px-6 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              Ver ranking
            </Link>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
              >
                Ir a mis cartillas
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border border-emerald-300 bg-white px-6 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="mb-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          <section className="lg:col-span-2">
            <h2 className="mb-4 text-xl font-bold text-emerald-950 sm:text-2xl">
              Partidos de hoy
            </h2>

            {loading ? (
              <p className="rounded-xl border border-emerald-100 bg-white px-6 py-10 text-center text-emerald-800">
                Cargando partidos…
              </p>
            ) : todayMatches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-10 text-center">
                <p className="text-emerald-800/80">
                  Hoy no hay partidos programados.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {todayMatches.map((match) => (
                  <HomeTodayMatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-8">
            {showPendingSection && pendingSummary && (
              <section className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-emerald-950">
                  Tus pendientes de hoy
                </h2>

                {pendingSummary.activeCards === 0 ? (
                  <p className="mb-4 text-sm text-emerald-800/80">
                    No tienes cartillas habilitadas. Crea o activa una cartilla
                    para pronosticar.
                  </p>
                ) : (
                  <dl className="mb-5 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-emerald-50/80 p-3">
                      <dt className="text-xs text-emerald-700/70">
                        Partidos de hoy
                      </dt>
                      <dd className="mt-1 text-2xl font-bold tabular-nums text-emerald-900">
                        {pendingSummary.todayMatches}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-emerald-50/80 p-3">
                      <dt className="text-xs text-emerald-700/70">
                        Pronosticados
                      </dt>
                      <dd className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
                        {pendingSummary.predicted}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-amber-50/80 p-3">
                      <dt className="text-xs text-amber-800/70">Pendientes</dt>
                      <dd className="mt-1 text-2xl font-bold tabular-nums text-amber-900">
                        {pendingSummary.pending}
                      </dd>
                    </div>
                  </dl>
                )}

                <Link
                  href="/dashboard"
                  className="inline-flex w-full justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  {pendingSummary.pending > 0
                    ? 'Completar pronósticos'
                    : 'Ir a mis cartillas'}
                </Link>
              </section>
            )}

            <section className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-emerald-950">
                Ranking destacado
              </h2>

              {loading ? (
                <p className="text-sm text-emerald-800">Cargando ranking…</p>
              ) : topRanking.length === 0 ? (
                <p className="text-sm text-emerald-800/80">
                  Aún no hay cartillas en el ranking.
                </p>
              ) : (
                <ol className="space-y-3">
                  {topRanking.map((entry, index) => (
                    <li
                      key={entry.card_id}
                      className="flex items-center gap-3 rounded-lg border border-emerald-50 bg-emerald-50/40 px-3 py-2.5"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          index === 0
                            ? 'bg-amber-100 text-amber-800'
                            : index === 1
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-emerald-950">
                          {entry.card_name}
                        </p>
                        <p className="truncate text-xs text-emerald-800/75">
                          {entry.full_name}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-700">
                        {entry.total_points} pts
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              <Link
                href="/ranking"
                className="mt-4 inline-flex w-full justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
              >
                Ver ranking completo
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
