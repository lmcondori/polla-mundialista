import Link from 'next/link'

type AdminAccessDeniedProps = {
  onLogout?: () => void
}

export default function AdminAccessDenied({ onLogout }: AdminAccessDeniedProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p
        role="alert"
        className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-red-800"
      >
        Acceso no autorizado. Esta sección es solo para administradores.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Ir al ambiente participante
        </Link>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex rounded-lg border border-emerald-200 px-5 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </main>
  )
}
