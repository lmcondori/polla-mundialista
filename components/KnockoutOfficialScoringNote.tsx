import { KNOCKOUT_OFFICIAL_SCORING_NOTE } from '@/lib/knockoutCardSummary'

type KnockoutOfficialScoringNoteProps = {
  className?: string
}

export default function KnockoutOfficialScoringNote({
  className = '',
}: KnockoutOfficialScoringNoteProps) {
  return (
    <p
      className={`rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-900/90 ${className}`}
    >
      {KNOCKOUT_OFFICIAL_SCORING_NOTE}
    </p>
  )
}
