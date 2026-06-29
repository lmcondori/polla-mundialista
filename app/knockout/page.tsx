'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import KnockoutBracket from '@/components/KnockoutBracket'
import Navbar from '@/components/Navbar'
import { fetchKnockoutBracketMatches } from '@/lib/knockoutMatches'
import type { KnockoutMatchWithTeams } from '@/lib/types'

export default function KnockoutPage() {
  const [matches, setMatches] = useState<KnockoutMatchWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBracket = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await fetchKnockoutBracketMatches()

    if (fetchError) {
      setError(fetchError)
      setMatches([])
    } else {
      setMatches(data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadBracket()
  }, [loadBracket])

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            Cuadro de llaves
          </h1>
          <p className="mt-2 text-sm text-emerald-800/80">
            Eliminatoria directa del Mundial 2026: partidos reales desde 16avos
            hasta la final. Los equipos en plantilla se actualizan al cargar
            resultados en la administración.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:underline"
          >
            ← Volver al inicio
          </Link>
        </header>

        {loading && (
          <p className="py-12 text-center text-emerald-800">
            Cargando cuadro de llaves…
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {!loading && !error && <KnockoutBracket matches={matches} />}
      </main>
    </div>
  )
}
