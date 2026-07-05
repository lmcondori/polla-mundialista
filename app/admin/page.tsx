'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { AdminRouteLoading, useAdminRoute } from '@/lib/useAdminRoute'
import { fetchAdminDashboardStats } from '@/lib/adminStats'
import { supabase } from '@/lib/supabaseClient'

type AdminModule = {
  href: string
  title: string
  description: string
}

const ADMIN_MODULES: AdminModule[] = [
  {
    href: '/admin/cards',
    title: 'Administrar cartillas',
    description:
      'Ver, activar o inactivar cartillas de todos los participantes.',
  },
  {
    href: '/admin/results',
    title: 'Registrar resultados',
    description:
      'Registrar resultados reales, clasificados y propagar llaves.',
  },
  {
    href: '/admin/reminders',
    title: 'Recordatorios WhatsApp',
    description:
      'Generar mensajes manuales de WhatsApp para participantes con pronósticos pendientes.',
  },
  {
    href: '/admin/settings',
    title: 'Configuración',
    description: 'Ajustar fechas límite y parámetros generales.',
  },
]

type StatCard = {
  label: string
  value: number
}

export default function AdminHomePage() {
  const { accessState, handleLogout, AdminDenied } = useAdminRoute()
  const [stats, setStats] = useState<StatCard[]>([])
  const [statsError, setStatsError] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)

    const { data, error } = await fetchAdminDashboardStats(supabase)

    if (error) {
      setStatsError(error)
      setStats([])
    } else if (data) {
      setStats([
        { label: 'Participantes registrados', value: data.total_users },
        { label: 'Cartillas de grupos', value: data.group_cards },
        { label: 'Cartillas de llaves', value: data.knockout_cards },
        { label: 'Cartillas activas', value: data.active_cards },
        { label: 'Pronósticos registrados', value: data.total_predictions },
        { label: 'Partidos con resultado', value: data.matches_with_result },
      ])
    }

    setStatsLoading(false)
  }, [])

  useEffect(() => {
    if (accessState === 'allowed') {
      loadStats()
    }
  }, [accessState, loadStats])

  if (accessState === 'checking') {
    return <AdminRouteLoading />
  }

  if (accessState === 'denied') {
    return (
      <div className="flex min-h-full flex-col bg-gradient-to-b from-slate-50 to-white">
        <AdminDenied />
      </div>
    )
  }

  return (
    <AdminShell
      onLogout={handleLogout}
      title="Panel administrador"
      description="Accede a las funciones de gestión global. Los participantes siguen usando su dashboard habitual."
    >
      {statsError && (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          No se pudo cargar el resumen general: {statsError}. Las acciones
          administrativas siguen disponibles.
        </p>
      )}

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Resumen general
        </h2>
        {statsLoading ? (
          <p className="text-sm text-slate-600">Cargando estadísticas…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-violet-700/80">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Administración
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ADMIN_MODULES.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-violet-950">
                {module.title}
              </h3>
              <p className="mt-2 text-sm text-slate-700/80">
                {module.description}
              </p>
              <span className="mt-4 inline-flex text-sm font-medium text-violet-700">
                Abrir →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </AdminShell>
  )
}
