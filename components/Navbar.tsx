import Link from 'next/link'

type NavbarProps = {
  showAuthLinks?: boolean
  onLogout?: () => void
}

export default function Navbar({ showAuthLinks = true, onLogout }: NavbarProps) {
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
          <Link
            href="/ranking"
            className="rounded-lg px-3 py-2 text-emerald-800 transition hover:bg-emerald-50"
          >
            Ranking
          </Link>
          {showAuthLinks && (
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
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
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
