-- =============================================================================
-- Polla Mundialista 2026 — Fase 1: esquema etapa eliminatoria
-- Rama: feature/etapa-llaves
--
-- Alcance de esta migración:
--   - Agregar columnas nuevas (nullable/default según corresponda)
--   - Constraints idempotentes
--
-- NO incluye:
--   - Seed de partidos 73–104
--   - Cambios en funciones RPC de cálculo
--   - Cambios en vistas de ranking
--   - Migración de cartillas existentes
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- public.cards.stage
-- Cartillas existentes quedan GROUP_STAGE (default).
-- Cartillas futuras de llaves usarán KNOCKOUT_STAGE.
-- -----------------------------------------------------------------------------
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS stage text;

UPDATE public.cards
SET stage = 'GROUP_STAGE'
WHERE stage IS NULL;

ALTER TABLE public.cards
  ALTER COLUMN stage SET DEFAULT 'GROUP_STAGE';

ALTER TABLE public.cards
  ALTER COLUMN stage SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cards_stage_check'
      AND conrelid = 'public.cards'::regclass
  ) THEN
    ALTER TABLE public.cards
      ADD CONSTRAINT cards_stage_check
      CHECK (stage IN ('GROUP_STAGE', 'KNOCKOUT_STAGE'));
  END IF;
END $$;

COMMENT ON COLUMN public.cards.stage IS
  'Etapa de la cartilla: GROUP_STAGE (fase de grupos) o KNOCKOUT_STAGE (eliminatoria).';

-- -----------------------------------------------------------------------------
-- public.predictions.predicted_winner_team_id
-- FK bigint → public.teams(id). Nullable hasta Fase de pronósticos llaves.
-- -----------------------------------------------------------------------------
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS predicted_winner_team_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'predictions_predicted_winner_team_id_fkey'
      AND conrelid = 'public.predictions'::regclass
  ) THEN
    ALTER TABLE public.predictions
      ADD CONSTRAINT predictions_predicted_winner_team_id_fkey
      FOREIGN KEY (predicted_winner_team_id)
      REFERENCES public.teams (id);
  END IF;
END $$;

COMMENT ON COLUMN public.predictions.predicted_winner_team_id IS
  'Equipo clasificado pronosticado (eliminatoria). FK bigint a teams.id.';

-- -----------------------------------------------------------------------------
-- public.matches — columnas de eliminatoria
-- -----------------------------------------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS match_number integer,
  ADD COLUMN IF NOT EXISTS local_source_match_number integer,
  ADD COLUMN IF NOT EXISTS visitor_source_match_number integer,
  ADD COLUMN IF NOT EXISTS local_source_type text,
  ADD COLUMN IF NOT EXISTS visitor_source_type text,
  ADD COLUMN IF NOT EXISTS winner_team_id bigint,
  ADD COLUMN IF NOT EXISTS loser_team_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_match_number_key'
      AND conrelid = 'public.matches'::regclass
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_match_number_key UNIQUE (match_number);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_local_source_type_check'
      AND conrelid = 'public.matches'::regclass
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_local_source_type_check
      CHECK (local_source_type IS NULL OR local_source_type IN ('WINNER', 'LOSER'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_visitor_source_type_check'
      AND conrelid = 'public.matches'::regclass
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_visitor_source_type_check
      CHECK (visitor_source_type IS NULL OR visitor_source_type IN ('WINNER', 'LOSER'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_winner_team_id_fkey'
      AND conrelid = 'public.matches'::regclass
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_winner_team_id_fkey
      FOREIGN KEY (winner_team_id)
      REFERENCES public.teams (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_loser_team_id_fkey'
      AND conrelid = 'public.matches'::regclass
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_loser_team_id_fkey
      FOREIGN KEY (loser_team_id)
      REFERENCES public.teams (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_match_number
  ON public.matches (match_number);

CREATE INDEX IF NOT EXISTS idx_matches_phase_match_date
  ON public.matches (phase, match_date);

COMMENT ON COLUMN public.matches.match_number IS
  'Número oficial del partido en el fixture (ej. 73–104 en eliminatoria).';
COMMENT ON COLUMN public.matches.local_source_match_number IS
  'Número oficial del partido fuente para el slot local (plantillas de llave).';
COMMENT ON COLUMN public.matches.visitor_source_match_number IS
  'Número oficial del partido fuente para el slot visitante (plantillas de llave).';
COMMENT ON COLUMN public.matches.local_source_type IS
  'WINNER o LOSER del partido fuente local; NULL si equipo fijo.';
COMMENT ON COLUMN public.matches.visitor_source_type IS
  'WINNER o LOSER del partido fuente visitante; NULL si equipo fijo.';
COMMENT ON COLUMN public.matches.winner_team_id IS
  'Equipo ganador/clasificado real (eliminatoria). FK bigint a teams.id.';
COMMENT ON COLUMN public.matches.loser_team_id IS
  'Equipo perdedor real (eliminatoria). FK bigint a teams.id.';

COMMIT;
