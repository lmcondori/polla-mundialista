# Migraciones Supabase — Polla Mundialista 2026

Scripts SQL versionados para aplicar en el proyecto Supabase (SQL Editor o CLI).

## Orden de aplicación

| Archivo | Fase | Descripción |
|---------|------|-------------|
| `001_knockout_stage_schema.sql` | Fase 1 | Columnas de etapa eliminatoria (sin seed, sin RPC, sin vistas) |

## Fase 1 — `001_knockout_stage_schema.sql`

**Aplica en Supabase:** ejecutar el script completo en el SQL Editor.

**Agrega:**

- `cards.stage` (`GROUP_STAGE` \| `KNOCKOUT_STAGE`, default `GROUP_STAGE`)
- `predictions.predicted_winner_team_id` (bigint → `teams.id`)
- `matches.match_number`, fuentes de llave, `winner_team_id`, `loser_team_id`

**No modifica:** cartillas existentes, funciones RPC, vistas de ranking, pantallas.

**Pendiente (fases siguientes, requieren aprobación):**

- Fase 2: funciones RPC y cálculo de puntos eliminatoria
- Fase 3: seed partidos 73–104
- Fase 4: vistas `vw_ranking_cards_knockout`
- Fase 5+: pantallas admin, pronósticos y ranking llaves
