import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardStage } from '@/lib/types'

export type AdminCardRow = {
  id: string
  user_id: string
  card_name: string
  stage: CardStage
  status: 'ACTIVE' | 'INACTIVE' | string
  admin_note: string | null
  created_at: string
  updated_at: string
  participant_name: string
  participant_email: string | null
  whatsapp_phone: string | null
  prediction_count: number
}

type AdminListCardsRpcRow = {
  id: number | string
  user_id: string
  card_name: string
  stage: string
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string
  participant_name: string
  participant_email: string | null
  whatsapp_phone: string | null
  prediction_count: number | string
}

export async function fetchAdminCards(
  supabase: SupabaseClient
): Promise<{ data: AdminCardRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_list_cards')

  if (!error) {
    const rows = ((data ?? []) as AdminListCardsRpcRow[]).map(mapAdminCardRow)
    return { data: rows, error: null }
  }

  const { data: cardsData, error: cardsError } = await supabase
    .from('cards')
    .select('id, user_id, card_name, stage, status, admin_note, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (cardsError) {
    return { data: [], error: cardsError.message }
  }

  const cards = cardsData ?? []
  const userIds = [...new Set(cards.map((card) => card.user_id))]

  let profilesById: Record<
    string,
    { full_name: string | null; whatsapp_phone: string | null; whatsapp_enabled: boolean | null }
  > = {}

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, whatsapp_phone, whatsapp_enabled')
      .in('id', userIds)

    if (profilesError) {
      return { data: [], error: profilesError.message }
    }

    profilesById = Object.fromEntries(
      (profilesData ?? []).map((profile) => [profile.id, profile])
    )
  }

  const cardIds = cards.map((card) => card.id)
  let predictionCounts: Record<string, number> = {}

  if (cardIds.length > 0) {
    const { data: predictionsData, error: predictionsError } = await supabase
      .from('predictions')
      .select('card_id')
      .in('card_id', cardIds)

    if (predictionsError) {
      return { data: [], error: predictionsError.message }
    }

    for (const row of predictionsData ?? []) {
      const key = String(row.card_id)
      predictionCounts[key] = (predictionCounts[key] ?? 0) + 1
    }
  }

  const rows = cards.map((card) => {
    const profile = profilesById[card.user_id]
    return mapAdminCardRow({
      id: card.id,
      user_id: card.user_id,
      card_name: card.card_name,
      stage: card.stage ?? 'GROUP_STAGE',
      status: card.status,
      admin_note: card.admin_note,
      created_at: card.created_at,
      updated_at: card.updated_at,
      participant_name: profile?.full_name?.trim() || 'Participante',
      participant_email: null,
      whatsapp_phone:
        profile?.whatsapp_enabled === false ? null : profile?.whatsapp_phone ?? null,
      prediction_count: predictionCounts[String(card.id)] ?? 0,
    })
  })

  return { data: rows, error: null }
}

function mapAdminCardRow(row: AdminListCardsRpcRow): AdminCardRow {
  return {
    id: String(row.id),
    user_id: row.user_id,
    card_name: row.card_name,
    stage: (row.stage ?? 'GROUP_STAGE') as CardStage,
    status: row.status,
    admin_note: row.admin_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    participant_name: row.participant_name,
    participant_email: row.participant_email,
    whatsapp_phone: row.whatsapp_phone,
    prediction_count: Number(row.prediction_count ?? 0),
  }
}
