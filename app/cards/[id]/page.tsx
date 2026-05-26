'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MatchPredictionRow from '@/components/MatchPredictionRow'
import { fetchMatchesWithTeams } from '@/lib/matches'
import { supabase } from '@/lib/supabaseClient'
import type { Card, MatchWithTeams, Prediction } from '@/lib/types'

export default function CardDetailPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = params.id as string

  const [card, setCard] = useState<Pick<Card, 'id' | 'card_name'> | null>(null)
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [predictionsByMatch, setPredictionsByMatch] = useState<
    Record<
      string,
      Pick<Prediction, 'local_score_predicted' | 'visitor_score_predicted'>
    >
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    setCard({ id: cardData.id, card_name: cardData.card_name })

    const { data: matchesWithTeams, error: matchesError } =
      await fetchMatchesWithTeams()

    if (matchesError) {
      setError(matchesError)
      setLoading(false)
      return
    }

    setMatches(matchesWithTeams)

    const { data: predictionsData, error: predictionsError } = await supabase
      .from('predictions')
      .select(
        'id, card_id, match_id, local_score_predicted, visitor_score_predicted, points'
      )
      .eq('card_id', cardId)

    if (predictionsError) {
      setError(predictionsError.message)
      setLoading(false)
      return
    }

    const byMatch: Record<
      string,
      Pick<Prediction, 'local_score_predicted' | 'visitor_score_predicted'>
    > = {}
    for (const p of predictionsData ?? []) {
      byMatch[p.match_id] = {
        local_score_predicted: p.local_score_predicted,
        visitor_score_predicted: p.visitor_score_predicted,
      }
    }
    setPredictionsByMatch(byMatch)
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

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-emerald-50">
        <p className="text-emerald-800">Cargando pronósticos…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar showAuthLinks={false} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Volver al dashboard
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            {card?.card_name ?? 'Cartilla'}
          </h1>
          <p className="mt-2 text-emerald-800/70">
            Ingresa tus pronósticos de goles para cada partido.
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

        {matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
            <p className="text-emerald-800/80">
              No hay partidos disponibles por ahora.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {matches.map((match) => (
              <MatchPredictionRow
                key={match.id}
                cardId={cardId}
                match={match}
                initialPrediction={predictionsByMatch[match.id]}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
