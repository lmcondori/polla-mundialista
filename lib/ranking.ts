import type { SupabaseClient } from '@supabase/supabase-js'
import type { RankingEntry } from '@/lib/types'

/** Columnas estándar para listados desde vistas de ranking. */
export const RANKING_ENTRY_SELECT =
  'card_id, card_name, user_id, full_name, total_points, total_predictions, exact_scores, result_hits'

export type RankingStage = 'GROUP_STAGE' | 'KNOCKOUT_STAGE'

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

    const entries = ((rankingResult.data ?? []) as RankingEntry[]).filter(
      (entry) => !knockoutCardIds.has(String(entry.card_id))
    )

    return { data: entries, error: null }
  }

  const { data, error } = await applyRankingOrder(
    supabase.from(viewName).select(RANKING_ENTRY_SELECT)
  )

  if (error) {
    return { data: null, error }
  }

  return { data: (data ?? []) as RankingEntry[], error: null }
}

type OrderableQuery = {
  order: (
    column: string,
    options?: { ascending?: boolean }
  ) => OrderableQuery
}

/**
 * Orden oficial del ranking:
 * total_points desc, exact_scores desc, result_hits desc, card_name asc
 */
export function applyRankingOrder<T extends OrderableQuery>(query: T): T {
  return query
    .order('total_points', { ascending: false })
    .order('exact_scores', { ascending: false })
    .order('result_hits', { ascending: false })
    .order('card_name', { ascending: true }) as T
}
