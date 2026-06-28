-- =============================================================================
-- Polla Mundialista 2026 — Fase 3: funciones, RPC y vista ranking llaves
-- Rama: feature/etapa-llaves
--
-- Alcance:
--   - calculate_prediction_points_v2 (grupos + eliminatoria)
--   - recalculate_knockout_match_points
--   - propagate_knockout_teams
--   - save_knockout_match_result_and_recalculate (RPC admin)
--   - vw_ranking_cards_knockout
--
-- NO modifica:
--   - calculate_prediction_points (grupos — intacta)
--   - recalculate_match_points (grupos — intacta)
--   - save_match_result_and_recalculate (grupos — intacta)
--   - vw_ranking_cards (grupos — intacta)
--   - Pantallas ni componentes frontend
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Cálculo de puntos unificado por fase del partido
-- GROUP_STAGE: exacto 5 · resultado 3 · fallo 0 (misma lógica que grupos)
-- Eliminatoria: exacto 5 · clasificado 3 · fallo 0
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

  -- Eliminatoria directa (phase <> GROUP_STAGE)
  IF p_winner_team_id IS NULL THEN
    RETURN 0;
  END IF;

  IF p_pred_local = p_real_local AND p_pred_visitor = p_real_visitor THEN
    RETURN 5;
  END IF;

  IF p_pred_winner_team_id IS NOT NULL
     AND p_pred_winner_team_id = p_winner_team_id THEN
    RETURN 3;
  END IF;

  RETURN 0;
END;
$$;

COMMENT ON FUNCTION public.calculate_prediction_points_v2 IS
  'Puntaje por pronóstico según fase: GROUP_STAGE (5/3/0 resultado) o eliminatoria (5/3/0 clasificado).';

-- -----------------------------------------------------------------------------
-- Recálculo de puntos para un partido de eliminatoria
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_knockout_match_points(p_match_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local_score_real integer;
  v_visitor_score_real integer;
  v_winner_team_id bigint;
BEGIN
  SELECT
    m.local_score_real,
    m.visitor_score_real,
    m.winner_team_id
  INTO
    v_local_score_real,
    v_visitor_score_real,
    v_winner_team_id
  FROM public.matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partido % no encontrado.', p_match_id;
  END IF;

  UPDATE public.predictions pr
  SET points = public.calculate_prediction_points_v2(
    p_match_id,
    pr.local_score_predicted,
    pr.visitor_score_predicted,
    pr.predicted_winner_team_id,
    v_local_score_real,
    v_visitor_score_real,
    v_winner_team_id
  )
  WHERE pr.match_id = p_match_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_knockout_match_points IS
  'Recalcula predictions.points de un partido de eliminatoria usando calculate_prediction_points_v2.';

-- -----------------------------------------------------------------------------
-- Propagación de ganador/perdedor a partidos plantilla siguientes
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.propagate_knockout_teams(p_match_number integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner_team_id bigint;
  v_loser_team_id bigint;
BEGIN
  SELECT m.winner_team_id, m.loser_team_id
  INTO v_winner_team_id, v_loser_team_id
  FROM public.matches m
  WHERE m.match_number = p_match_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partido % no encontrado.', p_match_number;
  END IF;

  UPDATE public.matches dst
  SET local_team_id = CASE dst.local_source_type
    WHEN 'WINNER' THEN v_winner_team_id
    WHEN 'LOSER' THEN v_loser_team_id
    ELSE dst.local_team_id
  END
  WHERE dst.local_source_match_number = p_match_number;

  UPDATE public.matches dst
  SET visitor_team_id = CASE dst.visitor_source_type
    WHEN 'WINNER' THEN v_winner_team_id
    WHEN 'LOSER' THEN v_loser_team_id
    ELSE dst.visitor_team_id
  END
  WHERE dst.visitor_source_match_number = p_match_number;
END;
$$;

COMMENT ON FUNCTION public.propagate_knockout_teams IS
  'Propaga winner_team_id/loser_team_id al slot local o visitante de partidos plantilla fuente.';

-- -----------------------------------------------------------------------------
-- RPC admin: resultado eliminatoria + recálculo + propagación
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_knockout_match_result_and_recalculate(
  p_match_number integer,
  p_local_score_real integer,
  p_visitor_score_real integer,
  p_winner_team_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id bigint;
  v_phase text;
  v_local_team_id bigint;
  v_visitor_team_id bigint;
  v_loser_team_id bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden registrar resultados de eliminatoria.';
  END IF;

  SELECT
    m.id,
    m.phase,
    m.local_team_id,
    m.visitor_team_id
  INTO
    v_match_id,
    v_phase,
    v_local_team_id,
    v_visitor_team_id
  FROM public.matches m
  WHERE m.match_number = p_match_number;

  IF v_match_id IS NULL THEN
    RAISE EXCEPTION 'Partido % no encontrado.', p_match_number;
  END IF;

  IF v_phase = 'GROUP_STAGE' THEN
    RAISE EXCEPTION 'Este RPC es solo para partidos de eliminatoria directa.';
  END IF;

  IF v_local_team_id IS NULL OR v_visitor_team_id IS NULL THEN
    RAISE EXCEPTION 'El partido aún no tiene ambos equipos definidos.';
  END IF;

  IF p_winner_team_id IS DISTINCT FROM v_local_team_id
     AND p_winner_team_id IS DISTINCT FROM v_visitor_team_id THEN
    RAISE EXCEPTION 'El equipo clasificado debe ser local o visitante del partido.';
  END IF;

  IF p_winner_team_id = v_local_team_id THEN
    v_loser_team_id := v_visitor_team_id;
  ELSE
    v_loser_team_id := v_local_team_id;
  END IF;

  UPDATE public.matches
  SET
    local_score_real = p_local_score_real,
    visitor_score_real = p_visitor_score_real,
    winner_team_id = p_winner_team_id,
    loser_team_id = v_loser_team_id,
    status = 'FINISHED'
  WHERE id = v_match_id;

  PERFORM public.recalculate_knockout_match_points(v_match_id);
  PERFORM public.propagate_knockout_teams(p_match_number);
END;
$$;

COMMENT ON FUNCTION public.save_knockout_match_result_and_recalculate IS
  'Admin: guarda marcador y clasificado en eliminatoria, recalcula puntos y propaga equipos.';

-- -----------------------------------------------------------------------------
-- Ranking de cartillas KNOCKOUT_STAGE (solo partidos eliminatoria)
-- Orden oficial en frontend: total_points desc, exact_scores desc,
-- result_hits desc, card_name asc
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_ranking_cards_knockout AS
SELECT
  c.id AS card_id,
  c.card_name,
  c.user_id,
  p.full_name,
  COALESCE(SUM(pr.points) FILTER (WHERE m.phase <> 'GROUP_STAGE'), 0)::bigint AS total_points,
  COUNT(pr.id) FILTER (WHERE m.phase <> 'GROUP_STAGE')::bigint AS total_predictions,
  COUNT(*) FILTER (WHERE m.phase <> 'GROUP_STAGE' AND pr.points = 5)::bigint AS exact_scores,
  COUNT(*) FILTER (WHERE m.phase <> 'GROUP_STAGE' AND pr.points = 3)::bigint AS result_hits,
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
  'Ranking cartillas ACTIVE de eliminatoria; métricas solo sobre partidos phase <> GROUP_STAGE.';

-- -----------------------------------------------------------------------------
-- Permisos: RPC expuesta al cliente; funciones internas restringidas
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.recalculate_knockout_match_points(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.propagate_knockout_teams(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_knockout_match_result_and_recalculate(
  integer, integer, integer, bigint
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_knockout_match_result_and_recalculate(
  integer, integer, integer, bigint
) TO authenticated;

GRANT SELECT ON public.vw_ranking_cards_knockout TO anon, authenticated;

COMMIT;
