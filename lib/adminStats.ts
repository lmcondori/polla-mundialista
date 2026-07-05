import type { SupabaseClient } from '@supabase/supabase-js'

export type AdminDashboardStats = {
  total_users: number
  group_cards: number
  knockout_cards: number
  active_cards: number
  total_predictions: number
  matches_with_result: number
}

export async function fetchAdminDashboardStats(
  supabase: SupabaseClient
): Promise<{ data: AdminDashboardStats | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_get_dashboard_stats')

  if (error) {
    return { data: null, error: error.message }
  }

  const stats = data as AdminDashboardStats

  return {
    data: {
      total_users: Number(stats.total_users ?? 0),
      group_cards: Number(stats.group_cards ?? 0),
      knockout_cards: Number(stats.knockout_cards ?? 0),
      active_cards: Number(stats.active_cards ?? 0),
      total_predictions: Number(stats.total_predictions ?? 0),
      matches_with_result: Number(stats.matches_with_result ?? 0),
    },
    error: null,
  }
}
