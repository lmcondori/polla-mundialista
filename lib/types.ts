export type Profile = {
  id: string
  full_name: string
  role: string
}

export type Card = {
  id: string
  user_id: string
  card_name: string
  created_at?: string
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
  points: number
}

export type RankingEntry = {
  card_id: string
  card_name: string
  user_id: string
  full_name: string
  total_points: number
  total_predictions: number
  exact_scores: number
  result_hits: number
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
