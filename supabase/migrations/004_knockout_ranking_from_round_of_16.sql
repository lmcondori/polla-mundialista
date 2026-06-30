-- =============================================================================
-- Polla Mundialista 2026 — Fase 10: ranking oficial de llaves desde octavos
-- Rama: feature/etapa-llaves
--
-- Alcance:
--   - Actualiza vw_ranking_cards_knockout para excluir ROUND_OF_32 (16avos)
--
-- NO modifica:
--   - Partidos ni pronósticos de 16avos (siguen en BD y en UI de pronósticos)
--   - Funciones RPC de cálculo de puntos por partido
--   - vw_ranking_cards (grupos)
-- =============================================================================

BEGIN;

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
    AND pr.points = 5
  )::bigint AS exact_scores,
  COUNT(*) FILTER (
    WHERE m.phase IN (
      'ROUND_OF_16',
      'QUARTER_FINAL',
      'SEMI_FINAL',
      'THIRD_PLACE',
      'FINAL'
    )
    AND pr.points = 3
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
  'Ranking cartillas ACTIVE de eliminatoria; métricas solo desde octavos (ROUND_OF_16) hasta la final. ROUND_OF_32 no suma.';

COMMIT;
