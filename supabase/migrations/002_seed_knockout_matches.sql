-- =============================================================================
-- Polla Mundialista 2026 — Fase 2: seed partidos eliminatoria (73–104)
-- Rama: feature/etapa-llaves
--
-- Alcance de esta migración:
--   - 16avos (ROUND_OF_32): equipos reales vía lookup en public.teams
--   - Octavos a final: plantillas con match_number y campos source
--
-- NO incluye:
--   - Cambios en RPC, vistas, pantallas ni lógica de fase de grupos
--   - Sedes ni comentarios
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 16avos de final (ROUND_OF_32) — equipos fijos
-- -----------------------------------------------------------------------------
WITH team_map AS (
  SELECT name, id
  FROM public.teams
  WHERE name IN (
    'Canadá',
    'Sudáfrica',
    'Brasil',
    'Japón',
    'Alemania',
    'Paraguay',
    'Países Bajos',
    'Marruecos',
    'Costa de Marfil',
    'Noruega',
    'Francia',
    'Suecia',
    'México',
    'Ecuador',
    'Inglaterra',
    'RD de Congo',
    'Bélgica',
    'Senegal',
    'Estados Unidos',
    'Bosnia',
    'España',
    'Austria',
    'Portugal',
    'Croacia',
    'Suiza',
    'Argelia',
    'Australia',
    'Egipto',
    'Argentina',
    'Cabo Verde',
    'Colombia',
    'Ghana'
  )
),
round_of_32 AS (
  SELECT *
  FROM (
    VALUES
      (73, 'Canadá',           'Sudáfrica',      '2026-06-28 14:00:00-05'::timestamptz),
      (76, 'Brasil',           'Japón',          '2026-06-29 12:00:00-05'::timestamptz),
      (74, 'Alemania',         'Paraguay',       '2026-06-29 15:30:00-05'::timestamptz),
      (75, 'Países Bajos',     'Marruecos',      '2026-06-29 20:00:00-05'::timestamptz),
      (78, 'Costa de Marfil',  'Noruega',        '2026-06-30 12:00:00-05'::timestamptz),
      (77, 'Francia',          'Suecia',         '2026-06-30 16:00:00-05'::timestamptz),
      (79, 'México',           'Ecuador',        '2026-06-30 20:00:00-05'::timestamptz),
      (80, 'Inglaterra',       'RD de Congo',    '2026-07-01 11:00:00-05'::timestamptz),
      (82, 'Bélgica',          'Senegal',        '2026-07-01 15:00:00-05'::timestamptz),
      (81, 'Estados Unidos',   'Bosnia',         '2026-07-01 19:00:00-05'::timestamptz),
      (84, 'España',           'Austria',        '2026-07-02 14:00:00-05'::timestamptz),
      (83, 'Portugal',         'Croacia',        '2026-07-02 18:00:00-05'::timestamptz),
      (85, 'Suiza',            'Argelia',        '2026-07-02 22:00:00-05'::timestamptz),
      (88, 'Australia',        'Egipto',         '2026-07-03 13:00:00-05'::timestamptz),
      (86, 'Argentina',        'Cabo Verde',     '2026-07-03 17:00:00-05'::timestamptz),
      (87, 'Colombia',         'Ghana',          '2026-07-03 20:30:00-05'::timestamptz)
  ) AS v(match_number, local_name, visitor_name, match_date)
)
INSERT INTO public.matches (
  match_number,
  phase,
  group_name,
  local_team_id,
  visitor_team_id,
  match_date,
  status,
  local_source_match_number,
  visitor_source_match_number,
  local_source_type,
  visitor_source_type
)
SELECT
  r.match_number,
  'ROUND_OF_32',
  NULL,
  tl.id,
  tv.id,
  r.match_date,
  'PENDING',
  NULL,
  NULL,
  NULL,
  NULL
FROM round_of_32 r
JOIN team_map tl ON tl.name = r.local_name
JOIN team_map tv ON tv.name = r.visitor_name
ON CONFLICT (match_number) DO UPDATE SET
  phase                         = EXCLUDED.phase,
  group_name                    = EXCLUDED.group_name,
  local_team_id                 = EXCLUDED.local_team_id,
  visitor_team_id               = EXCLUDED.visitor_team_id,
  match_date                    = EXCLUDED.match_date,
  status                        = EXCLUDED.status,
  local_source_match_number     = EXCLUDED.local_source_match_number,
  visitor_source_match_number   = EXCLUDED.visitor_source_match_number,
  local_source_type             = EXCLUDED.local_source_type,
  visitor_source_type           = EXCLUDED.visitor_source_type;

-- -----------------------------------------------------------------------------
-- Octavos a final — plantillas (equipos NULL, slots vía source fields)
-- -----------------------------------------------------------------------------
INSERT INTO public.matches (
  match_number,
  phase,
  group_name,
  local_team_id,
  visitor_team_id,
  match_date,
  status,
  local_source_match_number,
  visitor_source_match_number,
  local_source_type,
  visitor_source_type
)
VALUES
  -- ROUND_OF_16
  (90, 'ROUND_OF_16',   NULL, NULL, NULL, '2026-07-04 12:00:00-05'::timestamptz, 'PENDING', 73, 75, 'WINNER', 'WINNER'),
  (89, 'ROUND_OF_16',   NULL, NULL, NULL, '2026-07-04 16:00:00-05'::timestamptz, 'PENDING', 74, 77, 'WINNER', 'WINNER'),
  (91, 'ROUND_OF_16',   NULL, NULL, NULL, '2026-07-05 15:00:00-05'::timestamptz, 'PENDING', 76, 78, 'WINNER', 'WINNER'),
  (92, 'ROUND_OF_16',   NULL, NULL, NULL, '2026-07-05 19:00:00-05'::timestamptz, 'PENDING', 79, 80, 'WINNER', 'WINNER'),
  (93, 'ROUND_OF_16',   NULL, NULL, NULL, '2026-07-06 14:00:00-05'::timestamptz, 'PENDING', 83, 84, 'WINNER', 'WINNER'),
  (94, 'ROUND_OF_16',   NULL, NULL, NULL, '2026-07-06 19:00:00-05'::timestamptz, 'PENDING', 81, 82, 'WINNER', 'WINNER'),
  (95, 'ROUND_OF_16',   NULL, NULL, NULL, '2026-07-07 11:00:00-05'::timestamptz, 'PENDING', 86, 88, 'WINNER', 'WINNER'),
  (96, 'ROUND_OF_16',   NULL, NULL, NULL, '2026-07-07 15:00:00-05'::timestamptz, 'PENDING', 85, 87, 'WINNER', 'WINNER'),
  -- QUARTER_FINAL
  (97, 'QUARTER_FINAL', NULL, NULL, NULL, '2026-07-09 15:00:00-05'::timestamptz, 'PENDING', 89, 90, 'WINNER', 'WINNER'),
  (98, 'QUARTER_FINAL', NULL, NULL, NULL, '2026-07-10 14:00:00-05'::timestamptz, 'PENDING', 93, 94, 'WINNER', 'WINNER'),
  (99, 'QUARTER_FINAL', NULL, NULL, NULL, '2026-07-11 16:00:00-05'::timestamptz, 'PENDING', 91, 92, 'WINNER', 'WINNER'),
  (100, 'QUARTER_FINAL', NULL, NULL, NULL, '2026-07-11 20:00:00-05'::timestamptz, 'PENDING', 95, 96, 'WINNER', 'WINNER'),
  -- SEMI_FINAL
  (101, 'SEMI_FINAL',    NULL, NULL, NULL, '2026-07-14 14:00:00-05'::timestamptz, 'PENDING', 97, 98, 'WINNER', 'WINNER'),
  (102, 'SEMI_FINAL',    NULL, NULL, NULL, '2026-07-15 14:00:00-05'::timestamptz, 'PENDING', 99, 100, 'WINNER', 'WINNER'),
  -- THIRD_PLACE
  (103, 'THIRD_PLACE',   NULL, NULL, NULL, '2026-07-18 16:00:00-05'::timestamptz, 'PENDING', 101, 102, 'LOSER', 'LOSER'),
  -- FINAL
  (104, 'FINAL',         NULL, NULL, NULL, '2026-07-19 14:00:00-05'::timestamptz, 'PENDING', 101, 102, 'WINNER', 'WINNER')
ON CONFLICT (match_number) DO UPDATE SET
  phase                         = EXCLUDED.phase,
  group_name                    = EXCLUDED.group_name,
  local_team_id                 = EXCLUDED.local_team_id,
  visitor_team_id               = EXCLUDED.visitor_team_id,
  match_date                    = EXCLUDED.match_date,
  status                        = EXCLUDED.status,
  local_source_match_number     = EXCLUDED.local_source_match_number,
  visitor_source_match_number   = EXCLUDED.visitor_source_match_number,
  local_source_type             = EXCLUDED.local_source_type,
  visitor_source_type           = EXCLUDED.visitor_source_type;

COMMIT;
