'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import {
  buildPeruDeadlineIso,
  formatDeadlineDisplayPeru,
  parseDeadlineToInputs,
} from '@/lib/settingsDeadline'
import { supabase } from '@/lib/supabaseClient'

type AccessState = 'checking' | 'denied' | 'allowed'

const SETTING_KEY = 'card_creation_deadline'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [accessState, setAccessState] = useState<AccessState>('checking')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentValueLabel, setCurrentValueLabel] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router])

  const loadSetting = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { data, error: fetchError } = await supabase
      .from('settings')
      .select('value, description')
      .eq('key', SETTING_KEY)
      .single()

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    if (!data?.value) {
      setError('No se encontró la configuración card_creation_deadline.')
      setLoading(false)
      return
    }

    const { date, time } = parseDeadlineToInputs(data.value)
    setEditDate(date)
    setEditTime(time)
    setCurrentValueLabel(formatDeadlineDisplayPeru(data.value))
    setDescription(data.description)
    setLoading(false)
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
      await loadSetting()
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router, loadSetting])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!editDate || !editTime) {
      setError('Ingresa fecha y hora válidas.')
      return
    }

    const newValue = buildPeruDeadlineIso(editDate, editTime)

    setSaving(true)

    const { error: updateError } = await supabase.rpc('admin_update_setting', {
      p_key: SETTING_KEY,
      p_value: newValue,
    })

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess('Configuración actualizada correctamente')
    await loadSetting()
  }

  if (accessState === 'checking' || (accessState === 'allowed' && loading)) {
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

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
        >
          Volver al dashboard
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-emerald-950 sm:text-3xl">
            Configuración del sistema
          </h1>
        </header>

        <section className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-emerald-900">
            Fecha límite de creación de cartillas
          </h2>
          {description && (
            <p className="mt-1 text-sm text-emerald-800/70">{description}</p>
          )}

          {currentValueLabel && (
            <p className="mt-4 text-sm text-emerald-800">
              Valor actual:{' '}
              <span className="font-semibold text-emerald-950">
                {currentValueLabel} (hora Perú)
              </span>
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="deadline-date"
                  className="mb-1 block text-xs font-medium text-emerald-800"
                >
                  Fecha
                </label>
                <input
                  id="deadline-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => {
                    setEditDate(e.target.value)
                    setSuccess(null)
                  }}
                  required
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label
                  htmlFor="deadline-time"
                  className="mb-1 block text-xs font-medium text-emerald-800"
                >
                  Hora
                </label>
                <input
                  id="deadline-time"
                  type="time"
                  value={editTime}
                  onChange={(e) => {
                    setEditTime(e.target.value)
                    setSuccess(null)
                  }}
                  required
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="text-sm text-emerald-700">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
            >
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
