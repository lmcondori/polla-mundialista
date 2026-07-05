-- =============================================================================
-- Polla Mundialista 2026 — Fix puntaje compuesto eliminatoria
--
-- Alcance:
--   - calculate_prediction_points_v2: llaves = marcador exacto 3 + clasificado 2 (máx 5)
--   - Recálculo de predictions existentes en cartillas KNOCKOUT_STAGE
--   - vw_ranking_cards_knockout: métricas exact_scores/result_hits compatibles
--
-- NO modifica:
--   - GROUP_STAGE en calculate_prediction_points_v2
--   - save_knockout_match_result_and_recalculate
--   - recalculate_knockout_match_points, propagate_knockout_teams
--   - Funciones RPC de grupos
--   - Filtro ROUND_OF_16+ en ranking (desde 004)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Puntaje compuesto eliminatoria: marcador exacto 3 + clasificado 2 (máx 5)
-- GROUP_STAGE sin cambios: exacto 5 · resultado 3 · fallo 0
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_prediction_points_v2(
  p_match_id bigint,
  p_pred_local integer,
  p_pred_visitor integer,
  p_pred_winner_team_id bigint,
  p_real_local integer,
  p_real_visitor integer,
  p_winner_team_id bigint
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_phase text;
  v_points integer := 0;
BEGIN
  IF p_real_local IS NULL OR p_real_visitor IS NULL THEN
    RETURN 0;
  END IF;

  SELECT m.phase
  INTO v_phase
  FROM public.matches m
  WHERE m.id = p_match_id;

  IF v_phase IS NULL THEN
    RETURN 0;
  END IF;

  IF v_phase = 'GROUP_STAGE' THEN
    IF p_pred_local = p_real_local AND p_pred_visitor = p_real_visitor THEN
      RETURN 5;
    END IF;

    IF (
      (p_pred_local > p_pred_visitor AND p_real_local > p_real_visitor)
      OR (p_pred_local < p_pred_visitor AND p_real_local < p_real_visitor)
      OR (p_pred_local = p_pred_visitor AND p_real_local = p_real_visitor)
    ) THEN
      RETURN 3;
    END IF;

    RETURN 0;
  END IF;

  -- Eliminatoria (phase <> GROUP_STAGE): puntaje compuesto
  IF p_pred_local = p_real_local
     AND p_pred_visitor = p_real_visitor THEN
    v_points := v_points + 3;
  END IF;

  IF p_pred_winner_team_id IS NOT NULL
     AND p_winner_team_id IS NOT NULL
     AND p_pred_winner_team_id = p_winner_team_id THEN
    v_points := v_points + 2;
  END IF;

  RETURN v_points;
END;
$$;

COMMENT ON FUNCTION public.calculate_prediction_points_v2 IS
  'Puntaje por pronóstico según fase: GROUP_STAGE (5/3/0 resultado) o eliminatoria (3 marcador + 2 clasificado, máx 5).';

-- -----------------------------------------------------------------------------
-- Recálculo de puntos existentes en cartillas KNOCKOUT_STAGE (todos los partidos llaves)
-- -----------------------------------------------------------------------------
UPDATE public.predictions pr
SET points = public.calculate_prediction_points_v2(
  pr.match_id,
  pr.local_score_predicted,
  pr.visitor_score_predicted,
  pr.predicted_winner_team_id,
  m.local_score_real,
  m.visitor_score_real,
  m.winner_team_id
)
FROM public.cards c,
     public.matches m
WHERE pr.card_id = c.id
  AND pr.match_id = m.id
  AND c.stage = 'KNOCKOUT_STAGE'
  AND m.phase <> 'GROUP_STAGE';

-- -----------------------------------------------------------------------------
-- Ranking llaves: métricas informativas alineadas al puntaje compuesto
-- exact_scores = acierto de marcador exacto (3 o 5 pts)
-- result_hits = acierto de clasificado (2 o 5 pts)
-- total_points sigue excluyendo ROUND_OF_32 (004)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_ranking_cards_knockout AS
SELECT
  c.id AS card_id,
  c.card_name,
  c.user_id,
  p.full_name,
  COALESCE(
    SUM(pr.points) FILTER (
      WHERE m.phase IN (
        'ROUND_OF_16',
        'QUARTER_FINAL',
        'SEMI_FINAL',
        'THIRD_PLACE',
        'FINAL'
      )
    ),
    0
  )::bigint AS total_points,
  COUNT(pr.id) FILTER (
    WHERE m.phase IN (
      'ROUND_OF_16',
      'QUARTER_FINAL',
      'SEMI_FINAL',
      'THIRD_PLACE',
      'FINAL'
    )
  )::bigint AS total_predictions,
  COUNT(*) FILTER (
    WHERE m.phase IN (
      'ROUND_OF_16',
      'QUARTER_FINAL',
      'SEMI_FINAL',
      'THIRD_PLACE',
      'FINAL'
    )
    AND pr.points IN (3, 5)
  )::bigint AS exact_scores,
  COUNT(*) FILTER (
    WHERE m.phase IN (
      'ROUND_OF_16',
      'QUARTER_FINAL',
      'SEMI_FINAL',
      'THIRD_PLACE',
      'FINAL'
    )
    AND pr.points IN (2, 5)
  )::bigint AS result_hits,
  c.status,
  c.stage
FROM public.cards c
JOIN public.profiles p ON p.id = c.user_id
LEFT JOIN public.predictions pr ON pr.card_id = c.id
LEFT JOIN public.matches m ON m.id = pr.match_id
WHERE c.stage = 'KNOCKOUT_STAGE'
  AND c.status = 'ACTIVE'
GROUP BY
  c.id,
  c.card_name,
  c.user_id,
  p.full_name,
  c.status,
  c.stage;

COMMENT ON VIEW public.vw_ranking_cards_knockout IS
  'Ranking cartillas ACTIVE de eliminatoria; métricas solo desde octavos. exact_scores: marcador exacto (3|5 pts); result_hits: clasificado (2|5 pts). ROUND_OF_32 no suma.';

COMMIT;
