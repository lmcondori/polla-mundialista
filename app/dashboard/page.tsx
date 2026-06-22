'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Navbar from '@/components/Navbar'
import CardForm from '@/components/CardForm'
import CardList from '@/components/CardList'
import { formatMatchDatePeru } from '@/lib/matchPrediction'
import { supabase } from '@/lib/supabaseClient'
import type { Card } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [cardName, setCardName] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [cardsLoading, setCardsLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canCreateCards, setCanCreateCards] = useState(true)
  const [deadlineLabel, setDeadlineLabel] = useState<string | null>(null)

  const loadCards = useCallback(async (userId: string) => {
    setCardsLoading(true)
    const { data, error: fetchError } = await supabase
      .from('cards')
      .select('id, user_id, card_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setCards(data ?? [])
    }
    setCardsLoading(false)
  }, [])

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userId)
      .single()

    setFullName(data?.full_name ?? null)
    setIsAdmin(data?.role === 'admin')
  }, [])

  const loadCardCreationDeadline = useCallback(async () => {
    const { data, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'card_creation_deadline')
      .single()

    if (settingsError || !data?.value) {
      setCanCreateCards(true)
      setDeadlineLabel(null)
      return
    }

    const deadline = new Date(data.value)
    const now = new Date()
    const allowed = now < deadline

    setCanCreateCards(allowed)
    setDeadlineLabel(
      `${formatMatchDatePeru(data.value)} (hora Perú)`
    )
  }, [])

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      setUser(session.user)
      await Promise.all([
        loadProfile(session.user.id),
        loadCards(session.user.id),
        loadCardCreationDeadline(),
      ])
      setAuthLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, loadCards, loadProfile, loadCardCreationDeadline])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  async function handleCreateCard(e: FormEvent) {
    e.preventDefault()
    if (!user || !canCreateCards) return

    const trimmed = cardName.trim()
    if (!trimmed) return

    setError(null)
    setCreating(true)

    const { error: insertError } = await supabase.from('cards').insert({
      user_id: user.id,
      card_name: trimmed,
    })

    setCreating(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setCardName('')
    await loadCards(user.id)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-emerald-50">
        <p className="text-emerald-800">Cargando…</p>
      </div>
    )
  }

  const greetingName = fullName ?? user?.email ?? 'participante'

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar showAuthLinks={false} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            Hola, {greetingName}
          </h1>
          <p className="mt-2 text-emerald-800/70">
            Administra tus cartillas de pronósticos.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/ranking"
              className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
            >
              Ver ranking
            </Link>
            <Link
              href="/knockout-preview"
              className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
            >
              Llaves probables
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin/results"
                  className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  Administrar resultados
                </Link>
                <Link
                  href="/admin/cards"
                  className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  Administrar cartillas
                </Link>
                <Link
                  href="/admin/settings"
                  className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  Configuración del sistema
                </Link>
              </>
            )}
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <section className="mb-8">
          {canCreateCards ? (
            <>
              {deadlineLabel && (
                <p className="mb-3 text-sm text-emerald-800/80">
                  Puedes crear cartillas hasta:{' '}
                  <span className="font-medium text-emerald-900">
                    {deadlineLabel}
                  </span>
                </p>
              )}
              <CardForm
                cardName={cardName}
                onCardNameChange={setCardName}
                onSubmit={handleCreateCard}
                loading={creating}
              />
            </>
          ) : (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"
            >
              La creación de cartillas ya se encuentra cerrada.
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-emerald-900">
            Mis cartillas
          </h2>
          <CardList cards={cards} loading={cardsLoading} />
        </section>
      </main>
    </div>
  )
}
