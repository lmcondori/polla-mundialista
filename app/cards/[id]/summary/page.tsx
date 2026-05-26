'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import CardSummaryStats from '@/components/CardSummaryStats'
import CardSummaryTable from '@/components/CardSummaryTable'
import Navbar from '@/components/Navbar'
import {
  buildCardSummaryStats,
  getCardStatusLabel,
  PREDICTION_RESULT_FILTERS,
  type PredictionResultFilter,
} from '@/lib/cardSummary'
import { sortMatchesByDateAsc } from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import type { CardPredictionDetail } from '@/lib/types'

export default function CardSummaryPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = params.id as string

  const [rows, setRows] = useState<CardPredictionDetail[]>([])
  const [cardName, setCardName] = useState('')
  const [cardStatus, setCardStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resultFilter, setResultFilter] = useState<PredictionResultFilter>('ALL')

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

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
      .select('id, card_name, user_id')
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
      setLoading(false)
      return
    }

    const detailRows = (data ?? []) as CardPredictionDetail[]
    setRows(detailRows)
    setCardName(cardData.card_name)
    setCardStatus(detailRows[0]?.card_status ?? 'ACTIVE')
    setLoading(false)
  }, [cardId, router])

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

  const stats = useMemo(() => buildCardSummaryStats(rows), [rows])

  const filteredRows = useMemo(() => {
    const filtered =
      resultFilter === 'ALL'
        ? rows
        : rows.filter((row) => row.prediction_result === resultFilter)
    return sortMatchesByDateAsc(filtered)
  }, [rows, resultFilter])

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-emerald-50">
        <p className="text-emerald-800">Cargando resumen…</p>
      </div>
    )
  }

  const isActive = cardStatus === 'ACTIVE'

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
          </div>
          <p className="mt-2 text-emerald-800/70">
            Revisa el avance de tu cartilla y los puntos obtenidos por partido.
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
        />

        <section className="mb-6 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
          <label
            htmlFor="result-filter"
            className="mb-2 block text-xs font-medium text-emerald-800"
          >
            Filtrar por estado
          </label>
          <div className="flex flex-wrap gap-2">
            {PREDICTION_RESULT_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setResultFilter(filter.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  resultFilter === filter.value
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
            <span className="font-semibold">{filteredRows.length}</span> de{' '}
            <span className="font-semibold">{rows.length}</span> pronósticos
          </p>
        </section>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">
              Aún no hay pronósticos registrados en esta cartilla.
            </p>
          </div>
        ) : (
          <CardSummaryTable rows={filteredRows} />
        )}
      </main>
    </div>
  )
}
