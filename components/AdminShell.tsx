'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'

type AdminShellProps = {
  children: ReactNode
  onLogout: () => void
  title?: string
  description?: string
}

const ADMIN_LINKS = [
  { href: '/admin', label: 'Inicio', exact: true },
  { href: '/admin/cards', label: 'Cartillas', exact: false },
  { href: '/admin/results', label: 'Resultados', exact: false },
  { href: '/admin/reminders', label: 'WhatsApp', exact: false },
  { href: '/admin/settings', label: 'Configuración', exact: false },
]

export default function AdminShell({
  children,
  onLogout,
  title,
  description,
}: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-slate-50 to-white">
      <Navbar showAuthLinks={false} onLogout={onLogout} isAdminContext />

      <div className="border-b border-violet-100 bg-violet-50/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-700">
              Panel administrador
            </p>
            <p className="text-sm text-violet-900/80">
              Gestión global de la Polla Mundialista 2026
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
          >
            ← Ambiente participante
          </Link>
        </div>
      </div>

      <nav
        aria-label="Administración"
        className="border-b border-violet-100 bg-white/90"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 py-3 sm:px-6">
          {ADMIN_LINKS.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-violet-900 hover:bg-violet-50'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {(title || description) && (
          <header className="mb-8">
            {title && (
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-2 text-slate-700/80">{description}</p>
            )}
          </header>
        )}
        {children}
      </main>
    </div>
  )
}
