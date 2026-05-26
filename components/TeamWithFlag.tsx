import TeamFlag from '@/components/TeamFlag'
import type { Team } from '@/lib/types'

type TeamWithFlagProps = {
  team: Team
  className?: string
}

export default function TeamWithFlag({ team, className = '' }: TeamWithFlagProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <TeamFlag team={team} />
      <span className="truncate">{team.name}</span>
    </span>
  )
}
