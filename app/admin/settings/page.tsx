'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { AdminRouteLoading, useAdminRoute } from '@/lib/useAdminRoute'
import {
  buildPeruDeadlineIso,
  formatDeadlineDisplayPeru,
  parseDeadlineToInputs,
} from '@/lib/settingsDeadline'
import { supabase } from '@/lib/supabaseClient'

const SETTING_KEY = 'card_creation_deadline'

export default function AdminSettingsPage() {
  const { accessState, handleLogout, AdminDenied } = useAdminRoute()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentValueLabel, setCurrentValueLabel] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')

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
    if (accessState === 'allowed') {
      loadSetting()
    }
  }, [accessState, loadSetting])

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
      title="Configuración del sistema"
      description="Ajusta fechas límite y parámetros generales de la polla."
    >
      <section className="mx-auto max-w-lg rounded-xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Fecha límite de creación de cartillas
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-700/80">{description}</p>
        )}

        {currentValueLabel && (
          <p className="mt-4 text-sm text-slate-800">
            Valor actual:{' '}
            <span className="font-semibold text-slate-950">
              {currentValueLabel} (hora Perú)
            </span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="deadline-date"
                className="mb-1 block text-xs font-medium text-slate-800"
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
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label
                htmlFor="deadline-time"
                className="mb-1 block text-xs font-medium text-slate-800"
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
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
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
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60 sm:w-auto"
          >
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </form>
      </section>
    </AdminShell>
  )
}
