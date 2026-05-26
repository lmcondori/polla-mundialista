import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-50 to-white">
      <Navbar />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-600">
          Mundial 2026
        </p>
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
          Polla Mundialista 2026
        </h1>
        <p className="mb-10 max-w-xl text-lg leading-relaxed text-emerald-900/80">
          Aplicación recreativa para pronosticar resultados de partidos del
          Mundial. Crea tu cartilla, registra tus pronósticos y compite con
          amigos de forma informal.
        </p>

        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            href="/ranking"
            className="rounded-xl border border-emerald-300 bg-white px-6 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50"
          >
            Ver ranking
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-emerald-300 bg-white px-6 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
          >
            Registrarse
          </Link>
        </div>
      </main>
    </div>
  )
}
