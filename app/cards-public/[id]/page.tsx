'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import KnockoutCardSummaryTable from '@/components/KnockoutCardSummaryTable'
import KnockoutOfficialScoringNote from '@/components/KnockoutOfficialScoringNote'
import Navbar from '@/components/Navbar'
import PublicCardSummaryStats from '@/components/PublicCardSummaryStats'
import PublicCardSummaryTable from '@/components/PublicCardSummaryTable'
import {
  buildKnockoutCardSummaryRows,
  buildKnockoutCardSummaryStats,
  getKnockoutSummaryStatLabelProps,
  type KnockoutCardSummaryRow,
  type KnockoutPredictionRow,
} from '@/lib/knockoutCardSummary'
import { fetchKnockoutMatchesWithTeams } from '@/lib/knockoutMatches'
import { sortMatchesByDateAsc } from '@/lib/matchPrediction'
import { RANKING_ENTRY_SELECT, rankingHref } from '@/lib/ranking'
import { supabase } from '@/lib/supabaseClient'
import type { CardPredictionDetail, CardStage, RankingEntry } from '@/lib/types'

const NOT_FOUND_MESSAGE =
  'No se encontró la cartilla o no está habilitada para participar.'

const EMPTY_PREDICTIONS_MESSAGE =
  'Esta cartilla aún no tiene pronósticos registrados.'

const RANKING_CARD_SELECT = `${RANKING_ENTRY_SELECT}, status`

export default function PublicCardDetailPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = params.id as string

  const [cardStage, setCardStage] = useState<CardStage>('GROUP_STAGE')
  const [rankingCard, setRankingCard] = useState<RankingEntry | null>(null)
  const [groupRows, setGroupRows] = useState<CardPredictionDetail[]>([])
  const [knockoutRows, setKnockoutRows] = useState<KnockoutCardSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

  const loadGroupDetail = useCallback(async (): Promise<boolean> => {
    const { data: rankingData, error: rankingError } = await supabase
      .from('vw_ranking_cards')
      .select(RANKING_CARD_SELECT)
      .eq('card_id', cardId)
      .maybeSingle()

    if (rankingError) {
      setError(rankingError.message)
      return true
    }

    if (!rankingData) {
      return false
    }

    const card = rankingData as RankingEntry
    setCardStage('GROUP_STAGE')
    setRankingCard(card)

    const { data, error: viewError } = await supabase
      .from('vw_card_prediction_detail')
      .select(
        `
        card_id,
        card_name,
        user_id,
        card_status,
        prediction_id,
        match_id,
        local_score_predicted,
        visitor_score_predicted,
        points,
        group_name,
        phase,
        match_date,
        local_score_real,
        visitor_score_real,
        match_status,
        local_team_name,
        local_team_code,
        local_team_flag_url,
        visitor_team_name,
        visitor_team_code,
        visitor_team_flag_url,
        prediction_result
      `
      )
      .eq('card_id', cardId)
      .order('match_date', { ascending: true })

    if (viewError) {
      setError(viewError.message)
      return true
    }

    setGroupRows((data ?? []) as CardPredictionDetail[])
    return true
  }, [cardId])

  const loadKnockoutDetail = useCallback(async () => {
    const { data: rankingData, error: rankingError } = await supabase
      .from('vw_ranking_cards_knockout')
      .select(RANKING_CARD_SELECT)
      .eq('card_id', cardId)
      .maybeSingle()

    if (rankingError) {
      setError(rankingError.message)
      return
    }

    if (!rankingData) {
      setNotFound(true)
      return
    }

    const card = rankingData as RankingEntry
    setCardStage('KNOCKOUT_STAGE')
    setRankingCard(card)

    try {
      const [matchesResult, predictionsResult] = await Promise.all([
        fetchKnockoutMatchesWithTeams(),
        supabase
          .from('predictions')
          .select(
            'id, card_id, match_id, local_score_predicted, visitor_score_predicted, predicted_winner_team_id, points'
          )
          .eq('card_id', cardId),
      ])

      if (matchesResult.error) {
        setError(matchesResult.error)
        return
      }

      if (predictionsResult.error) {
        setError(predictionsResult.error.message)
        return
      }

      const predictions = (predictionsResult.data ?? []) as KnockoutPredictionRow[]
      setKnockoutRows(
        buildKnockoutCardSummaryRows(predictions, matchesResult.data)
      )
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar el detalle de la cartilla de llaves.'
      setError(message)
    }
  }, [cardId])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    setRankingCard(null)
    setGroupRows([])
    setKnockoutRows([])

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.replace('/login')
      return
    }

    const loadedGroup = await loadGroupDetail()
    if (!loadedGroup) {
      await loadKnockoutDetail()
    }

    setLoading(false)
  }, [loadGroupDetail, loadKnockoutDetail, router])

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

  const sortedGroupRows = useMemo(
    () => sortMatchesByDateAsc(groupRows),
    [groupRows]
  )

  const knockoutStats = useMemo(
    () => buildKnockoutCardSummaryStats(knockoutRows),
    [knockoutRows]
  )

  const isKnockout = cardStage === 'KNOCKOUT_STAGE'

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-emerald-50">
        <p className="text-emerald-800">Cargando cartilla…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar showAuthLinks={false} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={
            isKnockout
              ? rankingHref('KNOCKOUT_STAGE')
              : rankingHref('GROUP_STAGE')
          }
          className="mb-6 inline-flex text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Volver al ranking
        </Link>

        {notFound ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">{NOT_FOUND_MESSAGE}</p>
          </div>
        ) : rankingCard ? (
          <>
            <header className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
                  {rankingCard.card_name}
                </h1>
                {isKnockout && (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                    Etapa de llaves
                  </span>
                )}
              </div>
              <p className="mt-2 text-emerald-800">
                Participante:{' '}
                <span className="font-semibold text-emerald-950">
                  {rankingCard.full_name}
                </span>
              </p>
              <p className="mt-2 text-sm text-emerald-800/70">
                Vista pública de la cartilla. Los pronósticos de partidos futuros
                permanecen ocultos hasta su inicio.
              </p>
              {isKnockout && (
                <KnockoutOfficialScoringNote className="mt-4" />
              )}
            </header>

            {error && (
              <p
                role="alert"
                className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <PublicCardSummaryStats
              totalPoints={
                isKnockout
                  ? knockoutStats.totalPoints
                  : (rankingCard.total_points ?? 0)
              }
              exactScores={
                isKnockout
                  ? knockoutStats.exactScores
                  : (rankingCard.exact_scores ?? 0)
              }
              resultHits={
                isKnockout
                  ? knockoutStats.resultHits
                  : (rankingCard.result_hits ?? 0)
              }
              totalPredictions={
                isKnockout
                  ? knockoutStats.totalPredictions
                  : (rankingCard.total_predictions ?? 0)
              }
              {...(isKnockout ? getKnockoutSummaryStatLabelProps() : {})}
            />

            {isKnockout ? (
              <KnockoutCardSummaryTable
                rows={knockoutRows}
                publicView
                emptyMessage={EMPTY_PREDICTIONS_MESSAGE}
              />
            ) : (
              <PublicCardSummaryTable rows={sortedGroupRows} />
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}
