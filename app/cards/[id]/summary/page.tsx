'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import CardSummaryStats from '@/components/CardSummaryStats'
import CardSummaryTable from '@/components/CardSummaryTable'
import KnockoutCardSummaryTable from '@/components/KnockoutCardSummaryTable'
import Navbar from '@/components/Navbar'
import {
  buildCardSummaryStats,
  getCardStatusLabel,
  PREDICTION_RESULT_FILTERS,
  type PredictionResultFilter,
} from '@/lib/cardSummary'
import {
  buildKnockoutCardSummaryRows,
  buildKnockoutCardSummaryStats,
  KNOCKOUT_PREDICTION_RESULT_FILTERS,
  type KnockoutPredictionRow,
  type KnockoutResultFilter,
} from '@/lib/knockoutCardSummary'
import { fetchKnockoutMatchesWithTeams } from '@/lib/knockoutMatches'
import { sortMatchesByDateAsc } from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import type { CardPredictionDetail, CardStage } from '@/lib/types'

export default function CardSummaryPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = params.id as string

  const [cardStage, setCardStage] = useState<CardStage>('GROUP_STAGE')
  const [groupRows, setGroupRows] = useState<CardPredictionDetail[]>([])
  const [knockoutRows, setKnockoutRows] = useState<
    ReturnType<typeof buildKnockoutCardSummaryRows>
  >([])
  const [cardName, setCardName] = useState('')
  const [cardStatus, setCardStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupResultFilter, setGroupResultFilter] =
    useState<PredictionResultFilter>('ALL')
  const [knockoutResultFilter, setKnockoutResultFilter] =
    useState<KnockoutResultFilter>('ALL')

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

  const loadGroupSummary = useCallback(async () => {
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
      return { error: viewError.message }
    }

    const detailRows = (data ?? []) as CardPredictionDetail[]
    setGroupRows(detailRows)
    setCardStatus(detailRows[0]?.card_status ?? 'ACTIVE')
    return { error: null }
  }, [cardId])

  const loadKnockoutSummary = useCallback(async () => {
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
      return { error: matchesResult.error }
    }

    if (predictionsResult.error) {
      return { error: predictionsResult.error.message }
    }

    const predictions = (predictionsResult.data ?? []) as KnockoutPredictionRow[]
    setKnockoutRows(
      buildKnockoutCardSummaryRows(predictions, matchesResult.data)
    )
    return { error: null }
  }, [cardId])

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
      .select('id, card_name, user_id, stage, status')
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

    const stage = (cardData.stage ?? 'GROUP_STAGE') as CardStage
    setCardStage(stage)
    setCardName(cardData.card_name)
    setCardStatus(cardData.status ?? 'ACTIVE')

    const summaryResult =
      stage === 'KNOCKOUT_STAGE'
        ? await loadKnockoutSummary()
        : await loadGroupSummary()

    if (summaryResult.error) {
      setError(summaryResult.error)
    }

    setLoading(false)
  }, [cardId, loadGroupSummary, loadKnockoutSummary, router])

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

  const groupStats = useMemo(() => buildCardSummaryStats(groupRows), [groupRows])
  const knockoutStats = useMemo(
    () => buildKnockoutCardSummaryStats(knockoutRows),
    [knockoutRows]
  )

  const filteredGroupRows = useMemo(() => {
    const filtered =
      groupResultFilter === 'ALL'
        ? groupRows
        : groupRows.filter((row) => row.prediction_result === groupResultFilter)
    return sortMatchesByDateAsc(filtered)
  }, [groupRows, groupResultFilter])

  const filteredKnockoutRows = useMemo(() => {
    if (knockoutResultFilter === 'ALL') return knockoutRows
    return knockoutRows.filter(
      (row) => row.prediction_result === knockoutResultFilter
    )
  }, [knockoutRows, knockoutResultFilter])

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-emerald-50">
        <p className="text-emerald-800">Cargando resumen…</p>
      </div>
    )
  }

  const isActive = cardStatus === 'ACTIVE'
  const isKnockout = cardStage === 'KNOCKOUT_STAGE'
  const stats = isKnockout ? knockoutStats : groupStats
  const totalRows = isKnockout ? knockoutRows.length : groupRows.length
  const filteredCount = isKnockout
    ? filteredKnockoutRows.length
    : filteredGroupRows.length
  const filters = isKnockout
    ? KNOCKOUT_PREDICTION_RESULT_FILTERS
    : PREDICTION_RESULT_FILTERS
  const activeFilter = isKnockout ? knockoutResultFilter : groupResultFilter

  const handleFilterChange = (value: string) => {
    if (isKnockout) {
      setKnockoutResultFilter(value as KnockoutResultFilter)
      return
    }
    setGroupResultFilter(value as PredictionResultFilter)
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar showAuthLinks={false} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href={`/cards/${cardId}`}
            className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
          >
            Volver a pronósticos
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            ← Volver al dashboard
          </Link>
        </div>

        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
              {cardName}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {getCardStatusLabel(cardStatus)}
            </span>
            {isKnockout && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                Etapa de llaves
              </span>
            )}
          </div>
          <p className="mt-2 text-emerald-800/70">
            {isKnockout
              ? 'Puntaje oficial desde octavos de final. Los pronósticos de 16avos se muestran abajo pero no suman al total.'
              : 'Revisa el avance de tu cartilla y los puntos obtenidos por partido.'}
          </p>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <CardSummaryStats
          totalPoints={stats.totalPoints}
          exactScores={stats.exactScores}
          resultHits={stats.resultHits}
          missed={stats.missed}
          pending={stats.pending}
          totalPredictions={stats.totalPredictions}
          resultHitsLabel={
            isKnockout ? 'Aciertos de clasificado' : undefined
          }
        />

        <section className="mb-6 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
          <label
            htmlFor="result-filter"
            className="mb-2 block text-xs font-medium text-emerald-800"
          >
            Filtrar por estado
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleFilterChange(filter.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeFilter === filter.value
                    ? 'bg-emerald-600 text-white'
                    : 'border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-emerald-800/80">
            Mostrando{' '}
            <span className="font-semibold">{filteredCount}</span> de{' '}
            <span className="font-semibold">{totalRows}</span> pronósticos
          </p>
        </section>

        {totalRows === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">
              Aún no hay pronósticos registrados en esta cartilla.
            </p>
          </div>
        ) : isKnockout ? (
          <KnockoutCardSummaryTable rows={filteredKnockoutRows} />
        ) : (
          <CardSummaryTable rows={filteredGroupRows} />
        )}
      </main>
    </div>
  )
}
