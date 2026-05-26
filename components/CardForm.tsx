'use client'

type CardFormProps = {
  cardName: string
  onCardNameChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
}

export default function CardForm({
  cardName,
  onCardNameChange,
  onSubmit,
  loading,
}: CardFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-3 text-lg font-semibold text-emerald-900">
        Nueva cartilla
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={cardName}
          onChange={(e) => onCardNameChange(e.target.value)}
          placeholder="Nombre de la cartilla"
          required
          minLength={2}
          className="flex-1 rounded-lg border border-emerald-200 px-4 py-2.5 text-emerald-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <button
          type="submit"
          disabled={loading || !cardName.trim()}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Creando…' : 'Crear cartilla'}
        </button>
      </div>
    </form>
  )
}
