# 02 — Base de datos Supabase

Esquema lógico y convenciones de acceso desde el frontend. La fuente de verdad de políticas RLS y definiciones SQL está en el proyecto Supabase; este documento refleja el contrato usado por la aplicación.

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
| `id` | UUID | PK |
| `name` | text | Nombre del equipo |
| `fifa_code` | text | Código FIFA (opcional) |
| `flag_url` | text | URL de bandera para UI |

---

### `matches`

Partidos del fixture (fase de grupos).

| Columna | Tipo lógico | Descripción |
|---------|-------------|-------------|
| `id` | UUID | PK |
| `phase` | text | Ej. `GROUP_STAGE` |
| `group_name` | text | Grupo A–L (nullable fuera de grupos) |
| `local_team_id` | UUID | FK → `teams` |
| `visitor_team_id` | UUID | FK → `teams` |
| `match_date` | timestamptz | Inicio del partido (hora Perú en origen) |
| `local_score_real` | int | Goles local (null si pendiente) |
| `visitor_score_real` | int | Goles visitante (null si pendiente) |
| `status` | text | Ej. `PENDING`, `FINISHED` |

---

### `cards`

Cartillas de pronósticos por usuario.

| Columna | Tipo lógico | Descripción |
|---------|-------------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `profiles` / `auth.users` |
| `card_name` | text | Nombre visible |
| `status` | text | `ACTIVE` \| `INACTIVE` |
| `admin_note` | text | Nota interna del admin (nullable) |
| `created_at` | timestamptz | Creación |
| `updated_at` | timestamptz | Última actualización |

---

### `predictions`

Pronósticos por cartilla y partido.

| Columna | Tipo lógico | Descripción |
|---------|-------------|-------------|
| `id` | UUID | PK |
| `card_id` | UUID | FK → `cards` |
| `match_id` | UUID | FK → `matches` |
| `local_score_predicted` | int | Goles local pronosticados |
| `visitor_score_predicted` | int | Goles visitante pronosticados |
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

Cartillas **ACTIVE** con métricas agregadas para ranking y vista pública.

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
| `save_match_result_and_recalculate` | `p_match_id`, `p_local_score_real`, `p_visitor_score_real` | Guarda resultado y dispara recálculo de puntos |
| `admin_update_card_status` | `p_card_id`, `p_status` | Cambia `ACTIVE` / `INACTIVE` |
| `admin_update_setting` | `p_key`, `p_value` | Actualiza `settings` (admin) |

### Internas (servidor / llamadas encadenadas)

| Función | Rol |
|---------|-----|
| `calculate_prediction_points` | Calcula puntos de un pronóstico dado resultado real |
| `recalculate_match_points` | Recalcula puntos de todos los pronósticos de un partido |

El frontend **no** invoca directamente las funciones internas; usa `save_match_result_and_recalculate`.

---

## RLS — patrones de acceso

| Recurso | Participante | Admin | Notas |
|---------|--------------|-------|-------|
| `cards` (propias) | CRUD limitado | — | Solo sus filas |
| `cards` (ajenas) | ❌ | Lectura/gestión | Admin en `/admin/cards` |
| `predictions` | Upsert en sus cartillas | — | RLS por ownership |
| `matches` | Lectura | Lectura + RPC resultado | — |
| `settings` | Lectura | Escritura vía RPC | No `update` directo en UI admin |
| `vw_ranking_cards` | Lectura | Lectura | Ranking y vista pública |
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
