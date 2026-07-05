'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { rankingHref } from '@/lib/ranking'
import { fetchIsAdmin } from '@/lib/adminAuth'
import { supabase } from '@/lib/supabaseClient'

type NavbarProps = {
  showAuthLinks?: boolean
  onLogout?: () => void
  isAdminContext?: boolean
}

export default function Navbar({
  showAuthLinks = true,
  onLogout,
  isAdminContext = false,
}: NavbarProps) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      const loggedIn = Boolean(session?.user)
      setIsLoggedIn(loggedIn)

      if (loggedIn) {
        const admin = await fetchIsAdmin(supabase)
        if (mounted) setIsAdmin(admin)
      } else {
        setIsAdmin(false)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = Boolean(session?.user)
      setIsLoggedIn(loggedIn)
      if (!loggedIn) {
        setIsAdmin(false)
        return
      }
      fetchIsAdmin(supabase).then((admin) => {
        if (mounted) setIsAdmin(admin)
      })
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = useCallback(async () => {
    if (onLogout) {
      onLogout()
      return
    }
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [onLogout, router])

  return (
    <header className="border-b border-emerald-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-emerald-800"
        >
          Polla Mundialista 2026
        </Link>

        <div className="flex items-center gap-2 text-sm font-medium sm:gap-3">
          {!isAdminContext && (
            <>
              <Link
                href={rankingHref('KNOCKOUT_STAGE')}
                className="rounded-lg px-3 py-2 text-emerald-800 transition hover:bg-emerald-50"
              >
                Ranking
              </Link>
              <Link
                href="/knockout"
                className="rounded-lg px-3 py-2 text-emerald-800 transition hover:bg-emerald-50"
              >
                Llaves
              </Link>
            </>
          )}

          {isLoggedIn && !showAuthLinks && !isAdminContext && (
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-emerald-800 transition hover:bg-emerald-50"
            >
              Mis cartillas
            </Link>
          )}

          {isAdmin && !isAdminContext && (
            <Link
              href="/admin"
              className="rounded-lg bg-violet-600 px-3 py-2 text-white transition hover:bg-violet-700"
            >
              Panel admin
            </Link>
          )}

          {showAuthLinks && !isLoggedIn && (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-emerald-800 transition hover:bg-emerald-50"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-white transition hover:bg-emerald-700"
              >
                Registrarse
              </Link>
            </>
          )}

          {isLoggedIn && (onLogout || !showAuthLinks) && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-emerald-200 px-3 py-2 text-emerald-800 transition hover:bg-emerald-50"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
