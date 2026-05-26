'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminMatchResultRow from '@/components/AdminMatchResultRow'
import Navbar from '@/components/Navbar'
import { fetchMatchesWithTeams } from '@/lib/matches'
import { supabase } from '@/lib/supabaseClient'
import type { MatchWithTeams } from '@/lib/types'

type AccessState = 'checking' | 'denied' | 'allowed'

export default function AdminResultsPage() {
  const router = useRouter()
  const [accessState, setAccessState] = useState<AccessState>('checking')
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true)
    setError(null)

    const { data, error: matchesError } = await fetchMatchesWithTeams()

    if (matchesError) {
      setError(matchesError)
      setMatches([])
    } else {
      setMatches(data)
    }

    setMatchesLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      setAccessState('checking')

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profileError || profile?.role !== 'admin') {
        setAccessState('denied')
        return
      }

      setAccessState('allowed')
      await loadMatches()
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
  }, [router, loadMatches])

  if (accessState === 'checking' || (accessState === 'allowed' && matchesLoading)) {
    return (
      <div className="flex min-h-full items-center justify-center bg-emerald-50">
        <p className="text-emerald-800">Cargando…</p>
      </div>
    )
  }

  if (accessState === 'denied') {
    return (
      <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
        <Navbar showAuthLinks={false} onLogout={handleLogout} />

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-red-800"
          >
            No tienes permisos para acceder a esta sección
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Ir al dashboard
          </Link>
        </main>
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
            Administrar resultados
          </h1>
          <p className="mt-2 text-emerald-800/70">
            Registra el marcador real de cada partido. Al guardar se actualiza el
            partido y se recalculan los puntos de los pronósticos.
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
            <p className="text-emerald-800/80">No hay partidos registrados.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {matches.map((match) => (
              <AdminMatchResultRow
                key={match.id}
                match={match}
                onSaved={loadMatches}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
