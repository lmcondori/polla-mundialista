'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import KnockoutCardSummaryTable from '@/components/KnockoutCardSummaryTable'
import KnockoutOfficialScoringNote from '@/components/KnockoutOfficialScoringNote'
import Navbar from '@/components/Navbar'
import PublicCardSummaryStats from '@/components/PublicCardSummaryStats'
import PublicCardSummaryTable from '@/components/PublicCardSummaryTable'
import { buildCardSummaryStats } from '@/lib/cardSummary'
import {
  buildKnockoutCardSummaryRows,
  buildKnockoutCardSummaryStats,
  getKnockoutSummaryStatLabelProps,
  type KnockoutCardSummaryRow,
  type KnockoutPredictionRow,
} from '@/lib/knockoutCardSummary'
import { fetchKnockoutMatchesWithTeams } from '@/lib/knockoutMatches'
import { sortMatchesByDateAsc } from '@/lib/matchPrediction'
import { rankingHref } from '@/lib/ranking'
import { supabase } from '@/lib/supabaseClient'
import type { CardPredictionDetail, CardStage } from '@/lib/types'

const NOT_FOUND_MESSAGE =
  'No se encontró la cartilla o no está habilitada para participar.'

const EMPTY_PREDICTIONS_MESSAGE =
  'Esta cartilla aún no tiene pronósticos registrados.'

type PublicCardMeta = {
  cardName: string
  fullName: string
}

export default function PublicCardDetailPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = params.id as string

  const [cardStage, setCardStage] = useState<CardStage>('GROUP_STAGE')
  const [cardMeta, setCardMeta] = useState<PublicCardMeta | null>(null)
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

  const loadGroupRows = useCallback(async () => {
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
      return
    }

    setGroupRows((data ?? []) as CardPredictionDetail[])
  }, [cardId])

  const loadKnockoutRows = useCallback(async () => {
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
    setCardMeta(null)
    setGroupRows([])
    setKnockoutRows([])

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.replace('/login')
      return
    }

    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select('id, card_name, user_id, stage, status')
      .eq('id', cardId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (cardError) {
      setError(cardError.message)
      setLoading(false)
      return
    }

    if (!cardData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const stage = (cardData.stage ?? 'GROUP_STAGE') as CardStage
    setCardStage(stage)

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', cardData.user_id)
      .maybeSingle()

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    setCardMeta({
      cardName: cardData.card_name,
      fullName: profileData?.full_name ?? '—',
    })

    if (stage === 'KNOCKOUT_STAGE') {
      await loadKnockoutRows()
    } else {
      await loadGroupRows()
    }

    setLoading(false)
  }, [cardId, loadGroupRows, loadKnockoutRows, router])

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

  const groupStats = useMemo(
    () => buildCardSummaryStats(groupRows),
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
        ) : cardMeta ? (
          <>
            <header className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
                  {cardMeta.cardName}
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
                  {cardMeta.fullName}
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
                isKnockout ? knockoutStats.totalPoints : groupStats.totalPoints
              }
              exactScores={
                isKnockout ? knockoutStats.exactScores : groupStats.exactScores
              }
              resultHits={
                isKnockout ? knockoutStats.resultHits : groupStats.resultHits
              }
              totalPredictions={
                isKnockout
                  ? knockoutStats.totalPredictions
                  : groupStats.totalPredictions
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
