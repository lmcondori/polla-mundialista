export type Profile = {
  id: string
  full_name: string
  role: string
  whatsapp_phone?: string | null
  whatsapp_enabled?: boolean
}

export type CardStage = 'GROUP_STAGE' | 'KNOCKOUT_STAGE'

export type Card = {
  id: string
  user_id: string
  card_name: string
  created_at?: string
  stage?: CardStage | string
}

export type Team = {
  id: string
  name: string
  fifa_code?: string
  flag_url?: string | null
}

export type Match = {
  id: string
  phase: string
  group_name: string | null
  local_team_id: string
  visitor_team_id: string
  match_date: string
  local_score_real: number | null
  visitor_score_real: number | null
  status: string
}

export type MatchWithTeams = Match & {
  local_team: Team
  visitor_team: Team
}

export type Prediction = {
  id: string
  card_id: string
  match_id: string
  local_score_predicted: number
  visitor_score_predicted: number
  predicted_winner_team_id?: string | null
  points: number
}

export type KnockoutSourceType = 'WINNER' | 'LOSER'

export type KnockoutMatchWithTeams = {
  id: string
  phase: string
  match_number: number | null
  match_date: string
  status: string
  local_score_real: number | null
  visitor_score_real: number | null
  local_team_id: string | null
  visitor_team_id: string | null
  local_source_match_number: number | null
  visitor_source_match_number: number | null
  local_source_type: KnockoutSourceType | null
  visitor_source_type: KnockoutSourceType | null
  winner_team_id: string | null
  loser_team_id: string | null
  local_team: Team | null
  visitor_team: Team | null
}

export type KnockoutPredictionPick = Pick<
  Prediction,
  'local_score_predicted' | 'visitor_score_predicted' | 'predicted_winner_team_id'
>

export type RankingEntry = {
  card_id: string
  card_name: string
  user_id: string
  full_name: string
  total_points: number
  total_predictions: number
  exact_scores: number
  result_hits: number
  status?: string
}

export type RankingEntryWithRank = RankingEntry & {
  rank: number
}

export type PredictionResultType =
  | 'SCORE_EXACTO'
  | 'RESULTADO_ACERTADO'
  | 'NO_ACERTADO'
  | 'PENDIENTE_RESULTADO'

export type CardPredictionDetail = {
  card_id: string
  card_name: string
  user_id: string
  card_status: string
  prediction_id: string
  match_id: string
  local_score_predicted: number
  visitor_score_predicted: number
  points: number
  group_name: string | null
  phase: string
  match_date: string
  local_score_real: number | null
  visitor_score_real: number | null
  match_status: string
  local_team_name: string
  local_team_code: string | null
  local_team_flag_url: string | null
  visitor_team_name: string
  visitor_team_code: string | null
  visitor_team_flag_url: string | null
  prediction_result: PredictionResultType | string
}
