'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Navbar from '@/components/Navbar'
import CardForm from '@/components/CardForm'
import CardList from '@/components/CardList'
import KnockoutRulesPanel from '@/components/KnockoutRulesPanel'
import { evaluateCreationDeadline } from '@/lib/settingsDeadline'
import { rankingHref } from '@/lib/ranking'
import { supabase } from '@/lib/supabaseClient'
import type { Card, CardStage } from '@/lib/types'

type CreationGate = {
  canCreate: boolean
  deadlineLabel: string | null
}

const DEFAULT_GROUP_GATE: CreationGate = { canCreate: true, deadlineLabel: null }
const DEFAULT_KNOCKOUT_GATE: CreationGate = { canCreate: true, deadlineLabel: null }

function isKnockoutCard(card: Card): boolean {
  return card.stage === 'KNOCKOUT_STAGE'
}

function isGroupCard(card: Card): boolean {
  return card.stage !== 'KNOCKOUT_STAGE'
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [groupCardName, setGroupCardName] = useState('')
  const [knockoutCardName, setKnockoutCardName] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [cardsLoading, setCardsLoading] = useState(true)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [creatingKnockout, setCreatingKnockout] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupCreationGate, setGroupCreationGate] =
    useState<CreationGate>(DEFAULT_GROUP_GATE)
  const [knockoutCreationGate, setKnockoutCreationGate] =
    useState<CreationGate>(DEFAULT_KNOCKOUT_GATE)

  const loadCards = useCallback(async (userId: string) => {
    setCardsLoading(true)
    const { data, error: fetchError } = await supabase
      .from('cards')
      .select('id, user_id, card_name, created_at, stage')
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

  const loadCreationDeadlines = useCallback(async () => {
    const [groupResult, knockoutResult] = await Promise.all([
      supabase
        .from('settings')
        .select('value')
        .eq('key', 'card_creation_deadline')
        .maybeSingle(),
      supabase
        .from('settings')
        .select('value')
        .eq('key', 'knockout_card_creation_deadline')
        .maybeSingle(),
    ])

    const groupGate = evaluateCreationDeadline(groupResult.data?.value)
    const knockoutGate = evaluateCreationDeadline(knockoutResult.data?.value)

    setGroupCreationGate({
      canCreate: groupGate.canCreate,
      deadlineLabel: groupGate.label,
    })
    setKnockoutCreationGate({
      canCreate: knockoutGate.canCreate,
      deadlineLabel: knockoutGate.label,
    })
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
        loadCreationDeadlines(),
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
  }, [router, loadCards, loadProfile, loadCreationDeadlines])

  const groupCards = useMemo(
    () => cards.filter(isGroupCard),
    [cards]
  )

  const knockoutCards = useMemo(
    () => cards.filter(isKnockoutCard),
    [cards]
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  async function createCard(stage: CardStage, trimmedName: string) {
    if (!user) return

    setError(null)

    const { error: insertError } = await supabase.from('cards').insert({
      user_id: user.id,
      card_name: trimmedName,
      stage,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    if (stage === 'GROUP_STAGE') {
      setGroupCardName('')
    } else {
      setKnockoutCardName('')
    }

    await loadCards(user.id)
  }

  async function handleCreateGroupCard(e: FormEvent) {
    e.preventDefault()
    if (!user || !groupCreationGate.canCreate) return

    const trimmed = groupCardName.trim()
    if (!trimmed) return

    setCreatingGroup(true)
    await createCard('GROUP_STAGE', trimmed)
    setCreatingGroup(false)
  }

  async function handleCreateKnockoutCard(e: FormEvent) {
    e.preventDefault()
    if (!user || !knockoutCreationGate.canCreate) return

    const trimmed = knockoutCardName.trim()
    if (!trimmed) return

    setCreatingKnockout(true)
    await createCard('KNOCKOUT_STAGE', trimmed)
    setCreatingKnockout(false)
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            Hola, {greetingName}
          </h1>
          <p className="mt-2 text-emerald-800/70">
            Administra tus cartillas de pronósticos.{' '}
            <span className="font-medium text-violet-800">
              Fase activa: etapa de llaves.
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={rankingHref('KNOCKOUT_STAGE')}
              className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Ver ranking de llaves
            </Link>
            <Link
              href="/knockout"
              className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
            >
              Cuadro de llaves
            </Link>
            <Link
              href={rankingHref('GROUP_STAGE')}
              className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
            >
              Ranking histórico de grupos
            </Link>
          </div>
        </header>

        {isAdmin && (
          <section className="mb-8 rounded-xl border border-violet-200 bg-violet-50/60 p-5">
            <h2 className="text-lg font-semibold text-violet-950">
              Panel administrador
            </h2>
            <p className="mt-2 text-sm text-violet-900/80">
              Gestión global de cartillas, resultados, recordatorios WhatsApp y
              configuración del sistema.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              Ir al panel administrador
            </Link>
          </section>
        )}

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-emerald-900">
            Crear cartilla
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {knockoutCreationGate.canCreate ? (
              <CardForm
                title="Llaves"
                submitLabel="Crear cartilla de llaves"
                cardName={knockoutCardName}
                onCardNameChange={setKnockoutCardName}
                onSubmit={handleCreateKnockoutCard}
                loading={creatingKnockout}
                deadlineLabel={knockoutCreationGate.deadlineLabel}
              />
            ) : (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"
              >
                La creación de cartillas de llaves ya se encuentra cerrada.
              </div>
            )}

            {groupCreationGate.canCreate ? (
              <CardForm
                title="Fase de grupos"
                submitLabel="Crear cartilla de grupos"
                cardName={groupCardName}
                onCardNameChange={setGroupCardName}
                onSubmit={handleCreateGroupCard}
                loading={creatingGroup}
                deadlineLabel={groupCreationGate.deadlineLabel}
              />
            ) : (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"
              >
                La creación de cartillas de fase de grupos ya se encuentra
                cerrada.
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-emerald-900">
            Mis cartillas de llaves
          </h2>
          <KnockoutRulesPanel showRoundOf32Note className="mb-4" />
          <CardList
            cards={knockoutCards}
            loading={cardsLoading}
            stage="KNOCKOUT_STAGE"
            emptyMessage="Aún no tienes cartillas de llaves. Crea una arriba."
          />
        </section>

        <section>
          <h2 className="mb-1 text-lg font-semibold text-emerald-900">
            Mis cartillas de fase de grupos
          </h2>
          <p className="mb-3 text-sm text-emerald-800/70">
            Historial de la fase de grupos. La etapa activa es la de llaves.
          </p>
          <CardList
            cards={groupCards}
            loading={cardsLoading}
            stage="GROUP_STAGE"
            emptyMessage="Aún no tienes cartillas de fase de grupos."
          />
        </section>
      </main>
    </div>
  )
}
