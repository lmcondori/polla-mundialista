'use client'

type CardFormProps = {
  cardName: string
  onCardNameChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  title: string
  submitLabel?: string
  disabled?: boolean
  deadlineLabel?: string | null
}

export default function CardForm({
  cardName,
  onCardNameChange,
  onSubmit,
  loading,
  title,
  submitLabel = 'Crear cartilla',
  disabled = false,
  deadlineLabel,
}: CardFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-3 text-lg font-semibold text-emerald-900">{title}</h2>
      {deadlineLabel && (
        <p className="mb-3 text-sm text-emerald-800/80">
          Puedes crear cartillas hasta:{' '}
          <span className="font-medium text-emerald-900">{deadlineLabel}</span>
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={cardName}
          onChange={(e) => onCardNameChange(e.target.value)}
          placeholder="Nombre de la cartilla"
          required
          minLength={2}
          disabled={disabled}
          className="flex-1 rounded-lg border border-emerald-200 px-4 py-2.5 text-emerald-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-50/50"
        />
        <button
          type="submit"
          disabled={disabled || loading || !cardName.trim()}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Creando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
