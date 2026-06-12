/** Columnas estándar para listados desde `vw_ranking_cards`. */
export const RANKING_ENTRY_SELECT =
  'card_id, card_name, user_id, full_name, total_points, total_predictions, exact_scores, result_hits'

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
