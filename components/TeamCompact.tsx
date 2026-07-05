import TeamFlag from '@/components/TeamFlag'

type TeamCompactProps = {
  name: string
  fifa_code?: string | null
  flag_url?: string | null
  className?: string
}

function getShortName(name: string): string {
  if (name.length <= 12) return name
  return `${name.slice(0, 10)}…`
}

/**
 * Vista compacta de equipo: bandera + código FIFA (desktop).
 * El nombre completo queda en `title` para tooltip nativo.
 */
export default function TeamCompact({
  name,
  fifa_code,
  flag_url,
  className = '',
}: TeamCompactProps) {
  const hasTeam = Boolean(fifa_code || flag_url)

  if (!hasTeam) {
    return (
      <span className={`text-emerald-800/70 ${className}`} title={name}>
        {name}
      </span>
    )
  }

  const code = fifa_code?.trim().toUpperCase() ?? null

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-emerald-950 ${className}`}
      title={name}
    >
      {flag_url ? (
        <TeamFlag team={{ name, flag_url }} className="h-4 w-5" />
      ) : null}
      {code ? (
        <span className="text-xs font-semibold tracking-wide">{code}</span>
      ) : !flag_url ? (
        <span className="text-xs">{getShortName(name)}</span>
      ) : null}
    </span>
  )
}
