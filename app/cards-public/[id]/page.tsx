'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PublicCardSummaryStats from '@/components/PublicCardSummaryStats'
import PublicCardSummaryTable from '@/components/PublicCardSummaryTable'
import { buildCardSummaryStats } from '@/lib/cardSummary'
import { sortMatchesByDateAsc } from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import type { CardPredictionDetail } from '@/lib/types'

export default function PublicCardDetailPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = params.id as string

  const [rows, setRows] = useState<CardPredictionDetail[]>([])
  const [cardName, setCardName] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [cardStatus, setCardStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.replace('/login')
      return
    }

    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select('id, card_name, status, user_id')
      .eq('id', cardId)
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

    setCardName(cardData.card_name)
    setCardStatus(cardData.status)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', cardData.user_id)
      .single()

    setParticipantName(profileData?.full_name ?? 'Participante')

    if (cardData.status !== 'ACTIVE') {
      setRows([])
      setLoading(false)
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

    setRows((data ?? []) as CardPredictionDetail[])
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
  const sortedRows = useMemo(() => sortMatchesByDateAsc(rows), [rows])

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
          href="/ranking"
          className="mb-6 inline-flex text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Volver al ranking
        </Link>

        {notFound ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">No se encontró la cartilla.</p>
          </div>
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
                {cardName}
              </h1>
              <p className="mt-2 text-emerald-800">
                Participante:{' '}
                <span className="font-semibold text-emerald-950">
                  {participantName}
                </span>
              </p>
              <p className="mt-2 text-sm text-emerald-800/70">
                Vista pública de la cartilla. Los pronósticos de partidos futuros
                permanecen ocultos hasta su inicio.
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

            {cardStatus !== 'ACTIVE' ? (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center"
              >
                <p className="text-amber-900">
                  Esta cartilla no está habilitada para participar.
                </p>
              </div>
            ) : (
              <>
                <PublicCardSummaryStats
                  totalPoints={stats.totalPoints}
                  exactScores={stats.exactScores}
                  resultHits={stats.resultHits}
                  totalPredictions={stats.totalPredictions}
                />
                <PublicCardSummaryTable rows={sortedRows} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
