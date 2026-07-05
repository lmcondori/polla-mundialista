'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import AdminAccessDenied from '@/components/AdminAccessDenied'
import { checkAdminAccess, type AdminAccessState } from '@/lib/adminAuth'
import { supabase } from '@/lib/supabaseClient'

type UseAdminRouteResult = {
  accessState: AdminAccessState
  handleLogout: () => Promise<void>
  AdminDenied: () => ReactNode
  isReady: boolean
}

export function useAdminRoute(): UseAdminRouteResult {
  const router = useRouter()
  const [accessState, setAccessState] = useState<AdminAccessState>('checking')

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

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

      const result = await checkAdminAccess(supabase)
      setAccessState(result.state)
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
  }, [router])

  const AdminDenied = useCallback(
    () => <AdminAccessDenied onLogout={handleLogout} />,
    [handleLogout]
  )

  return {
    accessState,
    handleLogout,
    AdminDenied,
    isReady: accessState === 'allowed',
  }
}

export function AdminRouteLoading() {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50">
      <p className="text-slate-700">Cargando panel administrador…</p>
    </div>
  )
}
