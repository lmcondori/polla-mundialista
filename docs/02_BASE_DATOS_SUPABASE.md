# 02 — Base de datos Supabase

Esquema lógico y convenciones de acceso desde el frontend. La fuente de verdad de políticas RLS y definiciones SQL está en el proyecto Supabase; este documento refleja el contrato usado por la aplicación.

---

## Tipos de identificadores (confirmado en Supabase)

| Recurso | Tipo PostgreSQL | Notas |
|---------|-----------------|-------|
| `teams.id` | `bigint` | PK |
| `matches.id` | `bigint` | PK |
| `cards.id` | `bigint` | PK |
| `predictions.id` | `bigint` | PK |
| `matches.local_team_id`, `visitor_team_id` | `bigint` | FK → `teams.id` |
| `profiles.id` | `uuid` | Coincide con `auth.users.id` |

**Regla:** referencias a equipos (`predicted_winner_team_id`, `winner_team_id`, `loser_team_id`) usan **`bigint`**, no `uuid`.

En TypeScript/JSON los `bigint` pueden serializarse como `number` o `string`; el frontend los trata como identificadores opacos.

---

## Tablas

### `profiles`

Perfil extendido de cada usuario de Auth.

| Columna | Tipo lógico | Descripción |
|---------|-------------|-------------|
| `id` | UUID | PK; coincide con `auth.users.id` |
| `full_name` | text | Nombre del participante |
| `role` | text | `admin` \| `participant` |

**Notas:**

- El registro en frontend **no** inserta en `profiles` manualmente.
- Trigger `handle_new_user` crea el perfil desde metadata de Auth (`full_name` en `options.data`).

---

### `teams`

Equipos del torneo.

| Columna | Tipo lógico | Descripción |
|---------|-------------|-------------|
| `id` | bigint | PK |
| `name` | text | Nombre del equipo |
| `fifa_code` | text | Código FIFA (opcional) |
| `flag_url` | text | URL de bandera para UI |
| `group_name` | text | Grupo A–L (nullable) |

---

### `matches`

Partidos del fixture (fase de grupos y eliminatoria).

| Columna | Tipo lógico | Descripción |
|---------|-------------|-------------|
| `id` | bigint | PK |
| `phase` | text | `GROUP_STAGE` \| `ROUND_OF_32` \| `ROUND_OF_16` \| `QUARTER_FINAL` \| `SEMI_FINAL` \| `THIRD_PLACE` \| `FINAL` |
| `group_name` | text | Grupo A–L (nullable; solo fase de grupos) |
| `local_team_id` | bigint | FK → `teams` |
| `visitor_team_id` | bigint | FK → `teams` |
| `match_date` | timestamptz | Inicio del partido (hora Perú en origen) |
| `local_score_real` | int | Goles local (null si pendiente) |
| `visitor_score_real` | int | Goles visitante (null si pendiente) |
| `status` | text | Ej. `PENDING`, `FINISHED` |
| `match_number` | integer | Número oficial del partido (ej. 73–104) |
| `local_source_match_number` | integer | Partido fuente para slot local (plantillas) |
| `visitor_source_match_number` | integer | Partido fuente para slot visitante |
| `local_source_type` | text | `WINNER` \| `LOSER` \| NULL |
| `visitor_source_type` | text | `WINNER` \| `LOSER` \| NULL |
| `winner_team_id` | bigint | Ganador real (eliminatoria); FK → `teams` |
| `loser_team_id` | bigint | Perdedor real (eliminatoria); FK → `teams` |

> Columnas de eliminatoria: Fase 1 (`001_knockout_stage_schema.sql`). Seed partidos 73–104: Fase 2 (`002_seed_knockout_matches.sql`).

---

### `cards`

Cartillas de pronósticos por usuario.

| Columna | Tipo lógico | Descripción |
|---------|-------------|-------------|
| `id` | bigint | PK |
| `user_id` | uuid | FK → `profiles` / `auth.users` |
| `card_name` | text | Nombre visible |
| `status` | text | `ACTIVE` \| `INACTIVE` |
| `stage` | text | `GROUP_STAGE` (default) \| `KNOCKOUT_STAGE` |
| `admin_note` | text | Nota interna del admin (nullable) |
| `created_at` | timestamptz | Creación |
| `updated_at` | timestamptz | Última actualización |

**Notas etapa:**

- Cartillas existentes: `stage = 'GROUP_STAGE'` (default de migración Fase 1).
- Cartillas de llaves: nuevas filas con `stage = 'KNOCKOUT_STAGE'` (sin migrar existentes).

---

### `predictions`

Pronósticos por cartilla y partido.

| Columna | Tipo lógico | Descripción |
|---------|-------------|-------------|
| `id` | bigint | PK |
| `card_id` | bigint | FK → `cards` |
| `match_id` | bigint | FK → `matches` |
| `local_score_predicted` | int | Goles local pronosticados |
| `visitor_score_predicted` | int | Goles visitante pronosticados |
| `predicted_winner_team_id` | bigint | Equipo clasificado pronosticado (eliminatoria); FK → `teams` |
| `points` | int | Puntos calculados (0 hasta resultado) |

**Restricción de unicidad:** `(card_id, match_id)` — upsert con `onConflict: 'card_id,match_id'`.

---

### `settings`

Configuración global clave-valor.

| Columna | Tipo lógico | Descripción |
|---------|-------------|-------------|
| `key` | text | PK lógica (ej. `card_creation_deadline`) |
| `value` | text | Valor (ISO datetime para deadlines) |
| `description` | text | Descripción legible |
| `updated_at` | timestamptz | Última modificación |

---

## Vistas

### `vw_ranking_cards`

Cartillas **ACTIVE** con `stage = 'GROUP_STAGE'` y métricas agregadas de fase de grupos.

> **Fase 1:** la vista existente en Supabase **no se modifica** en esta fase. En Fase posterior se acotará explícitamente a partidos `GROUP_STAGE` y cartillas `GROUP_STAGE`.

| Columna | Descripción |
|---------|-------------|
| `card_id` | ID de cartilla |
| `card_name` | Nombre |
| `user_id` | Dueño |
| `full_name` | Nombre del participante |
| `total_points` | Suma de puntos |
| `total_predictions` | Cantidad de pronósticos |
| `exact_scores` | Cantidad `SCORE_EXACTO` |
| `result_hits` | Cantidad `RESULTADO_ACERTADO` |
| `status` | Estado de cartilla |

**Orden oficial** (aplicado en consultas del frontend vía `lib/ranking.ts`):

```sql
ORDER BY
  total_points DESC,
  exact_scores DESC,
  result_hits DESC,
  card_name ASC
```

El ranking se ordena por `total_points` desc, `exact_scores` desc, `result_hits` desc y `card_name` asc.

**Uso en frontend:** `/ranking`, `/` (ranking destacado), `/cards-public/[id]` (cabecera y stats; consulta por `card_id` sin orden de listado).

> No consultar `cards` directamente para ver cartillas ajenas: RLS lo impide.

---

### `vw_ranking_cards_knockout`

Cartillas **ACTIVE** con `stage = 'KNOCKOUT_STAGE'` y métricas agregadas solo de partidos desde **octavos** (`ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `THIRD_PLACE`, `FINAL`). `ROUND_OF_32` no suma.

**Migraciones:** `003_knockout_functions_and_views.sql`, `004_knockout_ranking_from_round_of_16.sql`

| Columna | Descripción |
|---------|-------------|
| `card_id` | ID de cartilla |
| `card_name` | Nombre |
| `user_id` | Dueño |
| `full_name` | Nombre del participante |
| `total_points` | Suma de puntos (octavos a final) |
| `total_predictions` | Cantidad de pronósticos oficiales (octavos a final) |
| `exact_scores` | Cantidad con `points = 5` |
| `result_hits` | Cantidad con `points = 3` |
| `status` | Estado de cartilla (`ACTIVE`) |
| `stage` | Etapa (`KNOCKOUT_STAGE`) |

**Orden oficial** (mismo criterio que grupos; aplicar en frontend):

```sql
ORDER BY
  total_points DESC,
  exact_scores DESC,
  result_hits DESC,
  card_name ASC
```

**Uso en frontend:** pestaña «Llaves» en `/ranking` (Fase 7).

> `vw_ranking_cards` (grupos) **no se modifica** en esta fase.

---

### `vw_card_prediction_detail`

Detalle de pronósticos con datos de partido, equipos y resultado calculado.

Campos principales (ver `lib/types.ts` → `CardPredictionDetail`):

- Identificadores: `card_id`, `prediction_id`, `match_id`, `user_id`
- Pronóstico: `local_score_predicted`, `visitor_score_predicted`, `points`
- Partido: `match_date`, `group_name`, `phase`, `match_status`
- Resultado real: `local_score_real`, `visitor_score_real`
- Equipos: `local_team_name`, `local_team_code`, `local_team_flag_url`, `visitor_team_*`
- Clasificación: `prediction_result` (`SCORE_EXACTO`, `RESULTADO_ACERTADO`, `NO_ACERTADO`, `PENDIENTE_RESULTADO`)

**Uso en frontend:** `/cards/[id]/summary`, `/cards-public/[id]` (tabla de partidos).

---

## Funciones RPC

### Expuestas al cliente (frontend)

| RPC | Parámetros | Descripción |
|-----|------------|-------------|
| `save_match_result_and_recalculate` | `p_match_id`, `p_local_score_real`, `p_visitor_score_real` | Admin: resultado fase de grupos + recálculo |
| `save_knockout_match_result_and_recalculate` | `p_match_number`, `p_local_score_real`, `p_visitor_score_real`, `p_winner_team_id` | Admin: resultado eliminatoria + recálculo + propagación |
| `admin_update_card_status` | `p_card_id`, `p_status` | Cambia `ACTIVE` / `INACTIVE` |
| `admin_update_setting` | `p_key`, `p_value` | Actualiza `settings` (admin) |

### Internas (servidor / llamadas encadenadas)

| Función | Rol |
|---------|-----|
| `calculate_prediction_points` | Puntaje fase de grupos (sin cambios) |
| `recalculate_match_points` | Recálculo grupos (sin cambios) |
| `calculate_prediction_points_v2` | Puntaje unificado: detecta `GROUP_STAGE` vs eliminatoria |
| `recalculate_knockout_match_points` | Recálculo de pronósticos de un partido eliminatoria |
| `propagate_knockout_teams` | Propaga `winner_team_id`/`loser_team_id` a slots plantilla |

El frontend **no** invoca directamente las funciones internas; usa `save_match_result_and_recalculate` (grupos) o `save_knockout_match_result_and_recalculate` (llaves).

---

## RLS — patrones de acceso

| Recurso | Participante | Admin | Notas |
|---------|--------------|-------|-------|
| `cards` (propias) | CRUD limitado | — | Solo sus filas |
| `cards` (ajenas) | ❌ | Lectura/gestión | Admin en `/admin/cards` |
| `predictions` | Upsert en sus cartillas | — | RLS por ownership |
| `matches` | Lectura | Lectura + RPC resultado | — |
| `settings` | Lectura | Escritura vía RPC | No `update` directo en UI admin |
| `vw_ranking_cards` | Lectura | Lectura | Ranking fase de grupos |
| `vw_ranking_cards_knockout` | Lectura | Lectura | Ranking eliminatoria |
| `vw_card_prediction_detail` | Lectura | Lectura | Resúmenes |

---

## Trigger relevante

| Trigger | Efecto |
|---------|--------|
| `handle_new_user` | Crea fila en `profiles` al registrarse usuario en Auth |

---

## Cliente Supabase en frontend

Archivo único: `lib/supabaseClient.ts`

```ts
createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

Todas las consultas del navegador están sujetas a RLS con la sesión del usuario autenticado.
