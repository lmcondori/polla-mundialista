import type { Team } from '@/lib/types'

type TeamFlagProps = {
  team: Pick<Team, 'name' | 'flag_url'>
  className?: string
}

export default function TeamFlag({ team, className = '' }: TeamFlagProps) {
  if (team.flag_url) {
    return (
      <img
        src={team.flag_url}
        alt={`Bandera de ${team.name}`}
        width={32}
        height={24}
        className={`h-6 w-8 shrink-0 rounded-sm border border-emerald-200 object-cover ${className}`}
      />
    )
  }

  return (
    <span
      className={`inline-flex h-6 w-8 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-100 text-sm ${className}`}
      aria-hidden
    >
      🏳️
    </span>
  )
}
