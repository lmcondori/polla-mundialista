import {
  fetchKnockoutMatchesWithTeams,
  formatKnockoutMatchOrigin,
  isKnockoutOfficialRankingPhase,
  isKnockoutSideDefined,
} from '@/lib/knockoutMatches'
import { isMatchPredictionClosed } from '@/lib/matchPrediction'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardStage, KnockoutMatchWithTeams, Team } from '@/lib/types'

export type AdminReminderProfile = {
  id: string
  full_name: string | null
  whatsapp_phone: string | null
  whatsapp_enabled: boolean
}

export type AdminReminderCard = {
  id: string
  user_id: string
  card_name: string
  stage: CardStage
  status: string
}

export type PendingMatchSummary = {
  id: string
  match_date: string
  label: string
  phase: string
}

export type AdminReminderRow = {
  cardId: string
  cardName: string
  stage: CardStage
  participantName: string
  participantUserId: string
  whatsappPhone: string | null
  whatsappEnabled: boolean
  pendingCount: number
  nextPendingMatch: PendingMatchSummary | null
}

type GroupMatchRow = {
  id: string
  phase: string
  match_date: string
  local_team_id: string | null
  visitor_team_id: string | null
  local_team: Team | Team[] | null
  visitor_team: Team | Team[] | null
}

function normalizeTeam(team: Team | Team[] | null | undefined): Team | null {
  if (Array.isArray(team)) return team[0] ?? null
  return team ?? null
}

function isGroupMatchTeamsDefined(match: GroupMatchRow): boolean {
  return match.local_team_id !== null && match.visitor_team_id !== null
}

function isKnockoutMatchTeamsDefined(match: KnockoutMatchWithTeams): boolean {
  return (
    isKnockoutSideDefined(match, 'local') &&
    isKnockoutSideDefined(match, 'visitor')
  )
}

export function isOfficialPhaseForCard(
  phase: string,
  cardStage: CardStage
): boolean {
  if (cardStage === 'KNOCKOUT_STAGE') {
    return isKnockoutOfficialRankingPhase(phase)
  }
  return phase === 'GROUP_STAGE'
}

function formatGroupMatchLabel(match: GroupMatchRow): string {
  const local = normalizeTeam(match.local_team)?.name ?? 'Local'
  const visitor = normalizeTeam(match.visitor_team)?.name ?? 'Visitante'
  return `${local} vs ${visitor}`
}

function isEligibleGroupPendingMatch(match: GroupMatchRow): boolean {
  return (
    match.phase === 'GROUP_STAGE' &&
    !isMatchPredictionClosed(match.match_date) &&
    isGroupMatchTeamsDefined(match)
  )
}

function isEligibleKnockoutPendingMatch(match: KnockoutMatchWithTeams): boolean {
  return (
    isKnockoutOfficialRankingPhase(match.phase) &&
    !isMatchPredictionClosed(match.match_date) &&
    isKnockoutMatchTeamsDefined(match)
  )
}

function getPendingMatchesForCard(
  card: AdminReminderCard,
  groupMatches: GroupMatchRow[],
  knockoutMatches: KnockoutMatchWithTeams[],
  predictedPairs: Set<string>
): PendingMatchSummary[] {
  const pending: PendingMatchSummary[] = []

  if (card.stage === 'KNOCKOUT_STAGE') {
    for (const match of knockoutMatches) {
      if (!isEligibleKnockoutPendingMatch(match)) continue
      if (predictedPairs.has(`${card.id}:${match.id}`)) continue
      pending.push({
        id: match.id,
        match_date: match.match_date,
        label: formatKnockoutMatchOrigin(match) ?? `Partido ${match.match_number ?? ''}`,
        phase: match.phase,
      })
    }
    return pending.sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    )
  }

  for (const match of groupMatches) {
    if (!isEligibleGroupPendingMatch(match)) continue
    if (predictedPairs.has(`${card.id}:${match.id}`)) continue
    pending.push({
      id: match.id,
      match_date: match.match_date,
      label: formatGroupMatchLabel(match),
      phase: match.phase,
    })
  }

  return pending.sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )
}

export function buildAdminReminderRows(
  cards: AdminReminderCard[],
  profilesByUserId: Record<string, AdminReminderProfile>,
  groupMatches: GroupMatchRow[],
  knockoutMatches: KnockoutMatchWithTeams[],
  predictedPairs: Set<string>
): AdminReminderRow[] {
  const rows: AdminReminderRow[] = []

  for (const card of cards) {
    if (card.status !== 'ACTIVE') continue

    const stage = (card.stage ?? 'GROUP_STAGE') as CardStage
    const pendingMatches = getPendingMatchesForCard(
      { ...card, stage },
      groupMatches,
      knockoutMatches,
      predictedPairs
    )

    if (pendingMatches.length === 0) continue

    const profile = profilesByUserId[card.user_id]

    rows.push({
      cardId: card.id,
      cardName: card.card_name,
      stage,
      participantName: profile?.full_name?.trim() || 'Participante',
      participantUserId: card.user_id,
      whatsappPhone: profile?.whatsapp_phone ?? null,
      whatsappEnabled: profile?.whatsapp_enabled ?? true,
      pendingCount: pendingMatches.length,
      nextPendingMatch: pendingMatches[0] ?? null,
    })
  }

  return rows.sort((a, b) => {
    const dateA = a.nextPendingMatch?.match_date ?? ''
    const dateB = b.nextPendingMatch?.match_date ?? ''
    if (dateA && dateB && dateA !== dateB) {
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    }
    return a.participantName.localeCompare(b.participantName, 'es')
  })
}

const GROUP_MATCHES_SELECT = `
  id,
  phase,
  match_date,
  local_team_id,
  visitor_team_id,
  local_team:teams!matches_local_team_id_fkey (
    id,
    name,
    fifa_code,
    flag_url
  ),
  visitor_team:teams!matches_visitor_team_id_fkey (
    id,
    name,
    fifa_code,
    flag_url
  )
`

export async function fetchAdminReminderRows(
  supabase: SupabaseClient
): Promise<{ data: AdminReminderRow[]; error: string | null }> {
  const [cardsResult, groupMatchesResult, knockoutMatchesResult] =
    await Promise.all([
      supabase
        .from('cards')
        .select('id, user_id, card_name, stage, status')
        .eq('status', 'ACTIVE'),
      supabase
        .from('matches')
        .select(GROUP_MATCHES_SELECT)
        .eq('phase', 'GROUP_STAGE'),
      fetchKnockoutMatchesWithTeams(),
    ])

  if (cardsResult.error) {
    return { data: [], error: cardsResult.error.message }
  }

  if (groupMatchesResult.error) {
    return { data: [], error: groupMatchesResult.error.message }
  }

  if (knockoutMatchesResult.error) {
    return { data: [], error: knockoutMatchesResult.error }
  }

  const cards = (cardsResult.data ?? []) as AdminReminderCard[]
  const userIds = [...new Set(cards.map((card) => card.user_id))]

  let profilesByUserId: Record<string, AdminReminderProfile> = {}

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, whatsapp_phone, whatsapp_enabled')
      .in('id', userIds)

    if (profilesError) {
      return { data: [], error: profilesError.message }
    }

    profilesByUserId = Object.fromEntries(
      ((profilesData ?? []) as AdminReminderProfile[]).map((profile) => [
        profile.id,
        profile,
      ])
    )
  }

  const groupMatches = (groupMatchesResult.data ?? []) as GroupMatchRow[]
  const knockoutMatches = knockoutMatchesResult.data

  const eligibleGroupIds = groupMatches
    .filter(isEligibleGroupPendingMatch)
    .map((match) => match.id)
  const eligibleKnockoutIds = knockoutMatches
    .filter(isEligibleKnockoutPendingMatch)
    .map((match) => match.id)
  const eligibleMatchIds = [...eligibleGroupIds, ...eligibleKnockoutIds]
  const cardIds = cards.map((card) => card.id)

  let predictedPairs = new Set<string>()

  if (cardIds.length > 0 && eligibleMatchIds.length > 0) {
    const { data: predictionsData, error: predictionsError } = await supabase
      .from('predictions')
      .select('card_id, match_id')
      .in('card_id', cardIds)
      .in('match_id', eligibleMatchIds)

    if (predictionsError) {
      return { data: [], error: predictionsError.message }
    }

    predictedPairs = new Set(
      (predictionsData ?? []).map((row) => `${row.card_id}:${row.match_id}`)
    )
  }

  return {
    data: buildAdminReminderRows(
      cards,
      profilesByUserId,
      groupMatches,
      knockoutMatches,
      predictedPairs
    ),
    error: null,
  }
}

export async function updateParticipantWhatsappPhone(
  supabase: SupabaseClient,
  userId: string,
  phone: string | null,
  enabled = true
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      whatsapp_phone: phone,
      whatsapp_enabled: enabled,
    })
    .eq('id', userId)

  return { error: error?.message ?? null }
}
