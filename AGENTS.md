<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Polla Mundialista 2026 — Guía estricta para agentes

Este archivo define el **contrato de trabajo** para cualquier agente o desarrollador que modifique el proyecto. Es obligatorio cumplirlo en su totalidad.

---

## Reglas estrictas (obligatorias)

1. **Antes de modificar código, leer `docs/`** — Empezar por [docs/00_CONTEXTO_PROYECTO.md](./docs/00_CONTEXTO_PROYECTO.md) y los documentos relacionados con el cambio.
2. **No cambiar nombres de tablas ni columnas** — Usar el esquema documentado en [docs/02_BASE_DATOS_SUPABASE.md](./docs/02_BASE_DATOS_SUPABASE.md). Prohibido `home_*`, `away_*`, `home_goals`, `away_goals`.
3. **No modificar lógica probada sin autorización explícita** — Ver sección [Lógica protegida](#lógica-protegida) y [docs/01_REGLAS_NEGOCIO.md](./docs/01_REGLAS_NEGOCIO.md).
4. **Antes de implementar, explicar el plan** — Qué archivos se tocarán, por qué, y qué impacto hay en RLS/RPC.
5. **Cambiar solo los archivos necesarios** — Sin refactors colaterales ni “mejoras” no solicitadas.
6. **Ejecutar `npm run build` al final** — Obligatorio antes de dar por terminado cualquier cambio de código.
7. **Si hay error de TypeScript, corregirlo antes de finalizar** — No entregar cambios que no compilen.
8. **Segunda etapa por llaves** — Implementada en rama `feature/etapa-llaves` (Fases 1–8). La fase de grupos **no debe romperse**. Ver [docs/04_PENDIENTES_Y_CAMBIOS.md](./docs/04_PENDIENTES_Y_CAMBIOS.md).

---

## Documentación interna (`docs/`)

| Archivo | Contenido |
|---------|-----------|
| [docs/00_CONTEXTO_PROYECTO.md](./docs/00_CONTEXTO_PROYECTO.md) | Resumen, stack, estructura, roles |
| [docs/01_REGLAS_NEGOCIO.md](./docs/01_REGLAS_NEGOCIO.md) | Puntaje, cartillas, pronósticos, privacidad |
| [docs/02_BASE_DATOS_SUPABASE.md](./docs/02_BASE_DATOS_SUPABASE.md) | Tablas, vistas, RPC, RLS |
| [docs/03_FLUJOS_FUNCIONALES.md](./docs/03_FLUJOS_FUNCIONALES.md) | Flujos por ruta y actor |
| [docs/04_PENDIENTES_Y_CAMBIOS.md](./docs/04_PENDIENTES_Y_CAMBIOS.md) | Pendientes, restricciones, historial |

---

## Resumen del proyecto

**Polla Mundialista 2026** — aplicación web recreativa para pronósticos del Mundial 2026.

**Fase de grupos (implementada):** cartillas `GROUP_STAGE`, pronósticos de marcador, ranking en `vw_ranking_cards`.

**Etapa eliminatoria (implementada, fase activa):** cartillas separadas `KNOCKOUT_STAGE`, pronósticos de marcador + equipo clasificado, ranking en `vw_ranking_cards_knockout` (pestaña Llaves por defecto en `/ranking`), admin de resultados con propagación, resumen propio. Fase de grupos permanece disponible como historial.

- **UI:** español.
- **Zona horaria:** Perú (`America/Lima`).

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Backend | Supabase (Auth, PostgreSQL, RLS, RPC, vistas) |
| Despliegue | Vercel |
| IDE / agentes | Cursor |

**Variables de entorno** (`.env.local`, no commitear): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Scripts:** `npm run dev` · `npm run build` (obligatorio) · `npm run lint`

---

## Estructura de carpetas

**No existe carpeta `src/`.**

```
polla-mundialista/
├── app/              # Rutas Next.js
├── components/       # Componentes React
├── lib/              # Supabase, tipos, utilidades
├── public/           # Assets estáticos
├── docs/             # Documentación interna
├── AGENTS.md         # Este archivo
└── CLAUDE.md         # → AGENTS.md
```

Imports con alias `@/` (ej. `@/lib/types`).

---

## Lógica protegida

**No alterar sin autorización explícita:**

| Área | Regla |
|------|-------|
| Cierre de pronósticos | `now >= match_date` → sin edición (`lib/matchPrediction.ts`) |
| Guardado pronósticos | `upsert` a `predictions`, `points: 0` inicial |
| Cálculo de puntos grupos | Solo en BD: `calculate_prediction_points`, `recalculate_match_points`, RPC `save_match_result_and_recalculate` |
| Cálculo de puntos llaves | `calculate_prediction_points_v2`, `recalculate_knockout_match_points`, RPC `save_knockout_match_result_and_recalculate` |
| Registro | Perfil vía trigger `handle_new_user`; no insert manual en `profiles` |
| Deadline cartillas | `settings.card_creation_deadline`; formato Perú (`lib/settingsDeadline.ts`) |
| Vista pública | `vw_ranking_cards` + `vw_card_prediction_detail`; ocultar si `match_date > now` |
| Admin | `role === 'admin'`; escritura sensible vía RPC |
| Ranking grupos | Solo cartillas `ACTIVE` con `stage = 'GROUP_STAGE'` (`vw_ranking_cards`); orden: `total_points` desc; empates comparten posición; ranking denso |
| Ranking llaves | Cartillas `ACTIVE` con `stage = 'KNOCKOUT_STAGE'` (`vw_ranking_cards_knockout`); mismo criterio de posición; **solo octavos en adelante** |
| Puntaje grupos | Exacto = 5 · Resultado = 3 · Fallo = 0 |
| Puntaje llaves | Marcador exacto = 3 · Clasificado = 2 · Máx 5 por partido (`calculate_prediction_points_v2`) |

---

## Base de datos — referencia rápida

### Tablas

`profiles` · `teams` · `matches` · `cards` · `predictions` · `settings`

### Vistas

- `vw_ranking_cards` — ranking fase de grupos y cabecera vista pública
- `vw_ranking_cards_knockout` — ranking eliminatoria
- `vw_card_prediction_detail` — detalle de pronósticos

### RPC (frontend)

| RPC | Uso |
|-----|-----|
| `save_match_result_and_recalculate` | Admin: resultado grupos + recálculo |
| `save_knockout_match_result_and_recalculate` | Admin: resultado llaves + recálculo + propagación |
| `admin_update_card_status` | Admin: `ACTIVE` / `INACTIVE` |
| `admin_update_setting` | Admin: configuración global |

### RPC / funciones internas (solo BD)

`calculate_prediction_points` · `recalculate_match_points` · `calculate_prediction_points_v2` · `recalculate_knockout_match_points` · `propagate_knockout_teams`

### Tipos de ID (confirmado en Supabase)

| Tabla / columna | Tipo |
|-----------------|------|
| `teams.id` | `bigint` |
| `matches.id` | `bigint` |
| `cards.id` | `bigint` |
| `predictions.id` | `bigint` |
| `matches.local_team_id`, `visitor_team_id` | `bigint` |
| `profiles.id` | `uuid` (Auth) |

FKs a equipos usan **`bigint`**, no `uuid`.

### Columnas nuevas — etapa eliminatoria (Fase 1)

| Tabla | Columna | Tipo |
|-------|---------|------|
| `cards` | `stage` | `text` NOT NULL DEFAULT `'GROUP_STAGE'` |
| `predictions` | `predicted_winner_team_id` | `bigint` → `teams.id` |
| `matches` | `match_number` | `integer` |
| `matches` | `local_source_match_number`, `visitor_source_match_number` | `integer` |
| `matches` | `local_source_type`, `visitor_source_type` | `text` (`WINNER` \| `LOSER` \| NULL) |
| `matches` | `winner_team_id`, `loser_team_id` | `bigint` → `teams.id` |

Migraciones: `001_knockout_stage_schema.sql` · `002_seed_knockout_matches.sql` · `003_knockout_functions_and_views.sql` · `004_knockout_ranking_from_round_of_16.sql`

### Columnas — usar siempre nombres reales

| ✅ Correcto | ❌ Prohibido |
|-------------|-------------|
| `local_team_id`, `visitor_team_id` | `home_team_id`, `away_team_id` |
| `local_score_predicted`, `visitor_score_predicted` | `home_goals`, `away_goals` |
| `local_score_real`, `visitor_score_real` | alias inventados |

Detalle completo: [docs/02_BASE_DATOS_SUPABASE.md](./docs/02_BASE_DATOS_SUPABASE.md).

---

## Flujo de trabajo obligatorio

```
1. Leer docs/ + AGENTS.md
2. Proponer plan (archivos, impacto RLS/RPC)
3. Implementar cambio mínimo
4. npm run build → corregir TypeScript
5. Actualizar docs/ si cambia alcance o reglas de negocio
```

**Restricciones adicionales:**

- No commitear sin que el usuario lo pida.
- No commitear `.env.local` ni secretos.
- No ampliar alcance (tests, README, refactors) salvo que se pidan.

---

## Rutas implementadas

| Ruta | Acceso | Datos principales |
|------|--------|-------------------|
| `/` | Público | — |
| `/login`, `/register` | Público | Supabase Auth |
| `/dashboard` | Autenticado | `cards`, `profiles`, `settings` |
| `/cards/[id]` | Dueño | `cards`, `matches`, `predictions` |
| `/cards/[id]/summary` | Dueño | `vw_card_prediction_detail` (grupos) o `predictions` + `matches` (llaves) |
| `/ranking` | Público | `vw_ranking_cards_knockout` por defecto (`?stage=knockout`); grupos en `?stage=groups` |
| `/knockout` | Público | Cuadro de llaves real (`matches` 73–104) |
| `/cards-public/[id]` | Autenticado | `vw_ranking_cards`, `vw_card_prediction_detail` |
| `/admin/*` | Admin | `cards`, `matches`, RPCs, recordatorios WhatsApp (`/admin/reminders`) |

Flujos detallados: [docs/03_FLUJOS_FUNCIONALES.md](./docs/03_FLUJOS_FUNCIONALES.md).

---

## Funcionalidades implementadas

Autenticación · perfiles y roles · dashboard · cartillas ACTIVE/INACTIVE · pronósticos con bloqueo por fecha · resultados admin · recálculo de puntos · ranking y podio (grupos y llaves) · resumen propio (grupos y llaves) · admin cartillas/settings · banderas · fixture grupos · vista pública controlada · cartillas y pronósticos de llaves · cuadro de llaves (`/knockout`).

Lista completa: [docs/04_PENDIENTES_Y_CAMBIOS.md](./docs/04_PENDIENTES_Y_CAMBIOS.md).

---

## Pendientes y fuera de alcance

- Pendientes técnicos: tests, middleware auth, README — ver [docs/04_PENDIENTES_Y_CAMBIOS.md](./docs/04_PENDIENTES_Y_CAMBIOS.md).
- **Etapa eliminatoria:** Fases 1–10 en repo (`feature/etapa-llaves`). Vista pública de cartillas de llaves (`/cards-public/[id]`) pendiente.

---

*Documentación alineada con Polla Mundialista 2026 — fase de grupos, Supabase, Next.js App Router.*
