import {
  KNOCKOUT_RULES_INTRO,
  KNOCKOUT_RULES_PREDICTIONS,
  KNOCKOUT_RULES_RANKING,
  KNOCKOUT_RULES_ROUND_OF_32_NOTE,
  KNOCKOUT_RULES_SCORING,
  KNOCKOUT_RULES_TIE_NOTE,
  KNOCKOUT_RULES_TITLE,
} from '@/lib/knockoutRules'

type KnockoutRulesPanelProps = {
  showRoundOf32Note?: boolean
  className?: string
}

export default function KnockoutRulesPanel({
  showRoundOf32Note = false,
  className = '',
}: KnockoutRulesPanelProps) {
  return (
    <section
      className={`rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5 ${className}`}
      aria-labelledby="knockout-rules-title"
    >
      <h2
        id="knockout-rules-title"
        className="text-base font-semibold text-emerald-950 sm:text-lg"
      >
        {KNOCKOUT_RULES_TITLE}
      </h2>

      <p className="mt-2 text-sm text-emerald-800/80">{KNOCKOUT_RULES_INTRO}</p>

      <div className="mt-4">
        <p className="text-sm font-medium text-emerald-900">
          Por cada partido se pronostica:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-emerald-800/80">
          {KNOCKOUT_RULES_PREDICTIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-emerald-900">Puntaje:</p>
        <ul className="mt-2 space-y-1.5 text-sm text-emerald-800/80">
          {KNOCKOUT_RULES_SCORING.map((row) => (
            <li key={row.label} className="flex flex-wrap gap-x-2">
              <span>{row.label}:</span>
              <span className="font-semibold tabular-nums text-emerald-900">
                {row.points} puntos
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-sm text-emerald-800/80">{KNOCKOUT_RULES_TIE_NOTE}</p>
      <p className="mt-3 text-sm text-emerald-800/80">{KNOCKOUT_RULES_RANKING}</p>

      {showRoundOf32Note && (
        <p className="mt-3 text-sm text-emerald-800/70">
          {KNOCKOUT_RULES_ROUND_OF_32_NOTE}
        </p>
      )}
    </section>
  )
}
