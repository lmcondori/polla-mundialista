import type { SupabaseClient } from '@supabase/supabase-js'
import type { RankingEntry, RankingEntryWithRank } from '@/lib/types'

/** Columnas estándar para listados desde vistas de ranking. */
export const RANKING_ENTRY_SELECT =
  'card_id, card_name, user_id, full_name, total_points, total_predictions, exact_scores, result_hits'

export type RankingStage = 'GROUP_STAGE' | 'KNOCKOUT_STAGE'

export type RankingStageQuery = 'knockout' | 'groups'

/** Etapa activa por defecto en navegación y ranking. */
export const DEFAULT_RANKING_STAGE: RankingStage = 'KNOCKOUT_STAGE'

export function rankingStageFromQuery(
  param: string | null | undefined
): RankingStage {
  if (param === 'groups') return 'GROUP_STAGE'
  return 'KNOCKOUT_STAGE'
}

export function rankingQueryFromStage(stage: RankingStage): RankingStageQuery {
  return stage === 'KNOCKOUT_STAGE' ? 'knockout' : 'groups'
}

export function rankingHref(stage: RankingStage = DEFAULT_RANKING_STAGE): string {
  return `/ranking?stage=${rankingQueryFromStage(stage)}`
}

export const RANKING_VIEW_BY_STAGE: Record<RankingStage, string> = {
  GROUP_STAGE: 'vw_ranking_cards',
  KNOCKOUT_STAGE: 'vw_ranking_cards_knockout',
}

async function getKnockoutCardIds(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const { data } = await supabase
    .from(RANKING_VIEW_BY_STAGE.KNOCKOUT_STAGE)
    .select('card_id')

  return new Set((data ?? []).map((row) => String(row.card_id)))
}

/**
 * Orden visual estable dentro del mismo puntaje (no afecta el puesto).
 */
export function sortRankingEntries(entries: RankingEntry[]): RankingEntry[] {
  return [...entries].sort((a, b) => {
    const pointsDiff = (b.total_points ?? 0) - (a.total_points ?? 0)
    if (pointsDiff !== 0) return pointsDiff
    return (a.card_name ?? '').localeCompare(b.card_name ?? '', 'es')
  })
}

/**
 * Asigna posiciones con ranking denso usando solo total_points.
 * Empates comparten el mismo rank; el siguiente puntaje distinto incrementa en 1.
 */
export function calculateDenseRankingPositions(
  items: RankingEntry[]
): RankingEntryWithRank[] {
  const sorted = sortRankingEntries(items)
  let rank = 0
  let previousPoints: number | null = null

  return sorted.map((item, index) => {
    const points = item.total_points ?? 0
    if (index === 0 || points !== previousPoints) {
      rank += 1
      previousPoints = points
    }
    return { ...item, rank }
  })
}

/**
 * Carga el ranking de una etapa con orden oficial y filtro por stage.
 * Grupos: excluye cartillas presentes en vw_ranking_cards_knockout (la vista
 * de grupos en BD puede incluir todas las ACTIVE sin filtrar stage).
 * Llaves: usa vw_ranking_cards_knockout (solo KNOCKOUT_STAGE).
 */
export async function fetchRankingForStage(
  supabase: SupabaseClient,
  stage: RankingStage
): Promise<{
  data: RankingEntry[] | null
  error: { message: string } | null
}> {
  const viewName = RANKING_VIEW_BY_STAGE[stage]

  if (stage === 'GROUP_STAGE') {
    const [rankingResult, knockoutCardIds] = await Promise.all([
      applyRankingOrder(
        supabase.from(viewName).select(RANKING_ENTRY_SELECT)
      ),
      getKnockoutCardIds(supabase),
    ])

    if (rankingResult.error) {
      return { data: null, error: rankingResult.error }
    }

    const entries = sortRankingEntries(
      ((rankingResult.data ?? []) as RankingEntry[]).filter(
        (entry) => !knockoutCardIds.has(String(entry.card_id))
      )
    )

    return { data: entries, error: null }
  }

  const { data, error } = await applyRankingOrder(
    supabase.from(viewName).select(RANKING_ENTRY_SELECT)
  )

  if (error) {
    return { data: null, error }
  }

  return {
    data: sortRankingEntries((data ?? []) as RankingEntry[]),
    error: null,
  }
}

type OrderableQuery = {
  order: (
    column: string,
    options?: { ascending?: boolean }
  ) => OrderableQuery
}

/**
 * Orden de consulta: total_points desc.
 * card_name asc solo para estabilidad visual dentro del mismo puntaje.
 */
export function applyRankingOrder<T extends OrderableQuery>(query: T): T {
  return query
    .order('total_points', { ascending: false })
    .order('card_name', { ascending: true }) as T
}

/** Entradas del podio: puestos 1, 2 y 3 según ranking denso. */
export function getPodiumRankedEntries(
  entries: RankingEntry[]
): RankingEntryWithRank[] {
  return calculateDenseRankingPositions(entries).filter(
    (entry) => entry.rank <= 3
  )
}
