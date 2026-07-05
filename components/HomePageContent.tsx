'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import HomeTodayMatchCard from '@/components/HomeTodayMatchCard'
import Navbar from '@/components/Navbar'
import { fetchHomeTodayMatches, isOfficialOpenPendingMatch, isOfficialPendingMatchToday, type HomeTodayMatch } from '@/lib/homeTodayMatches'
import {
  getPeruDateKey,
  getTodayPeruDateKey,
  sortMatchesByDateAsc,
} from '@/lib/matchPrediction'
import {
  fetchRankingForStage,
  getPodiumRankedEntries,
  rankingHref,
} from '@/lib/ranking'
import { supabase } from '@/lib/supabaseClient'
import type { CardStage, RankingEntryWithRank } from '@/lib/types'

type ActiveCard = {
  id: string
  stage: CardStage
}

type PendingSummary = {
  officialSlotsToday: number
  predicted: number
  pending: number
  activeCards: number
  showRoundOf32Notice: boolean
  showNoOfficialPendingMessage: boolean
}

function computePendingSummary(
  todayMatches: HomeTodayMatch[],
  activeCards: ActiveCard[],
  predictedPairs: Set<string>
): PendingSummary {
  let officialSlotsToday = 0
  let predicted = 0

  for (const card of activeCards) {
    for (const match of todayMatches) {
      if (!isOfficialOpenPendingMatch(match, card.stage)) continue
      officialSlotsToday += 1
      if (predictedPairs.has(`${card.id}:${match.id}`)) {
        predicted += 1
      }
    }
  }

  const hasAnyOfficialMatchToday = activeCards.some((card) =>
    todayMatches.some((match) =>
      isOfficialPendingMatchToday(match, card.stage)
    )
  )
  const hasRoundOf32Today = todayMatches.some(
    (match) => match.phase === 'ROUND_OF_32'
  )

  return {
    officialSlotsToday,
    predicted,
    pending: Math.max(0, officialSlotsToday - predicted),
    activeCards: activeCards.length,
    showRoundOf32Notice:
      activeCards.length > 0 && !hasAnyOfficialMatchToday && hasRoundOf32Today,
    showNoOfficialPendingMessage:
      activeCards.length > 0 &&
      officialSlotsToday === 0 &&
      !hasAnyOfficialMatchToday,
  }
}

export default function HomePageContent() {
  const [todayMatches, setTodayMatches] = useState<HomeTodayMatch[]>([])
  const [topRanking, setTopRanking] = useState<RankingEntryWithRank[]>([])
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

    const { data: rankingData, error: rankingError } =
      await fetchRankingForStage(supabase, 'KNOCKOUT_STAGE')

    if (rankingError) {
      setError(rankingError.message)
    } else {
      setTopRanking(getPodiumRankedEntries(rankingData ?? []))
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    setIsAuthenticated(Boolean(session?.user))

    if (session?.user) {
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('id, stage')
        .eq('user_id', session.user.id)
        .eq('status', 'ACTIVE')

      if (cardsError) {
        setError(cardsError.message)
        setPendingSummary(null)
      } else {
        const activeCards: ActiveCard[] = (cardsData ?? []).map((card) => ({
          id: String(card.id),
          stage: (card.stage ?? 'GROUP_STAGE') as CardStage,
        }))
        const knockoutActiveCards = activeCards.filter(
          (card) => card.stage === 'KNOCKOUT_STAGE'
        )
        const activeCardIds = knockoutActiveCards.map((card) => card.id)
        const officialOpenMatchIds = new Set<string>()

        for (const card of knockoutActiveCards) {
          for (const match of matchesToday) {
            if (isOfficialOpenPendingMatch(match, card.stage)) {
              officialOpenMatchIds.add(match.id)
            }
          }
        }

        let predictedPairs = new Set<string>()

        if (activeCardIds.length > 0 && officialOpenMatchIds.size > 0) {
          const { data: predictionsData, error: predictionsError } =
            await supabase
              .from('predictions')
              .select('card_id, match_id')
              .in('card_id', activeCardIds)
              .in('match_id', [...officialOpenMatchIds])

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
          computePendingSummary(matchesToday, knockoutActiveCards, predictedPairs)
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
            Aplicación recreativa para pronosticar la etapa de llaves del
            Mundial. La fase de grupos permanece disponible como historial.
          </p>

          <div className="flex w-full flex-col gap-3 sm:mx-auto sm:max-w-lg sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href={rankingHref('KNOCKOUT_STAGE')}
              className="rounded-xl border border-emerald-300 bg-white px-6 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              Ver ranking de llaves
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
                  Tus pendientes de llaves hoy
                </h2>

                {pendingSummary.activeCards === 0 ? (
                  <p className="mb-4 text-sm text-emerald-800/80">
                    No tienes cartillas de llaves habilitadas. Crea o activa una
                    cartilla de llaves para pronosticar.
                  </p>
                ) : (
                  <>
                    <dl className="mb-5 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-emerald-50/80 p-3">
                        <dt className="text-xs text-emerald-700/70">
                          Pronósticos oficiales de hoy
                        </dt>
                        <dd className="mt-1 text-2xl font-bold tabular-nums text-emerald-900">
                          {pendingSummary.officialSlotsToday}
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
                        <dt className="text-xs text-amber-800/70">
                          Pendientes
                        </dt>
                        <dd className="mt-1 text-2xl font-bold tabular-nums text-amber-900">
                          {pendingSummary.pending}
                        </dd>
                      </div>
                    </dl>

                    {pendingSummary.showRoundOf32Notice && (
                      <p className="mb-4 text-sm text-emerald-800/80">
                        Los 16avos se muestran como referencia y no cuentan para
                        el ranking oficial de llaves.
                      </p>
                    )}

                    {pendingSummary.showNoOfficialPendingMessage &&
                      !pendingSummary.showRoundOf32Notice && (
                        <p className="mb-4 text-sm text-emerald-800/80">
                          No tienes pronósticos oficiales pendientes para hoy.
                        </p>
                      )}

                    {pendingSummary.pending === 0 &&
                      pendingSummary.officialSlotsToday > 0 && (
                        <p className="mb-4 text-sm text-emerald-800/80">
                          Ya completaste tus pronósticos oficiales de hoy.
                        </p>
                      )}
                  </>
                )}

                <Link
                  href="/dashboard"
                  className="inline-flex w-full justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  {pendingSummary.pending > 0
                    ? 'Completar pronósticos de llaves'
                    : 'Ir a mis cartillas de llaves'}
                </Link>
              </section>
            )}

            <section className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-emerald-950">
                Ranking de llaves
              </h2>

              {loading ? (
                <p className="text-sm text-emerald-800">Cargando ranking…</p>
              ) : topRanking.length === 0 ? (
                <p className="text-sm text-emerald-800/80">
                  Aún no hay cartillas en el ranking de llaves.
                </p>
              ) : (
                <ol className="space-y-3">
                  {topRanking.map((entry) => (
                    <li
                      key={entry.card_id}
                      className="flex items-center gap-3 rounded-lg border border-emerald-50 bg-emerald-50/40 px-3 py-2.5"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          entry.rank === 1
                            ? 'bg-amber-100 text-amber-800'
                            : entry.rank === 2
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {entry.rank}
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
                href={rankingHref('KNOCKOUT_STAGE')}
                className="mt-4 inline-flex w-full justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
              >
                Ver ranking completo de llaves
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
