# Migraciones Supabase — Polla Mundialista 2026

Scripts SQL versionados para aplicar en el proyecto Supabase (SQL Editor o CLI).

## Orden de aplicación

| Archivo | Fase | Descripción |
|---------|------|-------------|
| `001_knockout_stage_schema.sql` | Fase 1 | Columnas de etapa eliminatoria |
| `002_seed_knockout_matches.sql` | Fase 2 | Seed partidos 73–104 (16avos + plantillas) |
| `003_knockout_functions_and_views.sql` | Fase 3 | Funciones, RPC eliminatoria, vista ranking llaves |
| `004_knockout_ranking_from_round_of_16.sql` | Fase 10 | Ranking llaves desde octavos (excluye `ROUND_OF_32`) |

## Fase 1 — `001_knockout_stage_schema.sql`

**Agrega:** `cards.stage`, `predictions.predicted_winner_team_id`, columnas de llave en `matches`.

**No modifica:** cartillas existentes, funciones RPC de grupos, `vw_ranking_cards`, pantallas.

## Fase 2 — `002_seed_knockout_matches.sql`

**Agrega:** partidos 73–104 con equipos reales (16avos) y plantillas (octavos a final).

**Requiere:** migración 001 aplicada y equipos en `public.teams`.

## Fase 3 — `003_knockout_functions_and_views.sql`

**Agrega:**

- `calculate_prediction_points_v2` — puntaje grupos o eliminatoria según `matches.phase`
- `recalculate_knockout_match_points` — recálculo interno llaves
- `propagate_knockout_teams` — propagación ganador/perdedor a slots plantilla
- `save_knockout_match_result_and_recalculate` — RPC admin eliminatoria
- `vw_ranking_cards_knockout` — ranking cartillas `KNOCKOUT_STAGE`

**No modifica:** `calculate_prediction_points`, `recalculate_match_points`, `save_match_result_and_recalculate`, `vw_ranking_cards`.

## Fase 10 — `004_knockout_ranking_from_round_of_16.sql`

**Actualiza:** `vw_ranking_cards_knockout` — métricas solo desde `ROUND_OF_16` hasta `FINAL`.

**No modifica:** partidos ni pronósticos de 16avos, RPC de cálculo por partido, `vw_ranking_cards` (grupos).
