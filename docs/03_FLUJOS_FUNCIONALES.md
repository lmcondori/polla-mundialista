# 03 — Flujos funcionales

Descripción de flujos por actor y ruta. Refleja el comportamiento **implementado** en la aplicación.

---

## Mapa de rutas

| Ruta | Actor | Descripción |
|------|-------|-------------|
| `/` | Público | Landing con enlaces a ranking, login y registro |
| `/register` | Público | Alta de usuario |
| `/login` | Público | Inicio de sesión |
| `/dashboard` | Autenticado | Cartillas del usuario |
| `/cards/[id]` | Autenticado (dueño) | Pronósticos de una cartilla |
| `/cards/[id]/summary` | Autenticado (dueño) | Resumen detallado propio |
| `/ranking` | Público / autenticado | Ranking y podio (pestañas: fase de grupos y llaves) |
| `/cards-public/[id]` | Autenticado | Vista pública de cartilla ajena |
| `/admin/cards` | Admin | Gestión de cartillas |
| `/admin/results` | Admin | Carga de resultados |
| `/admin/settings` | Admin | Configuración global |
| `/knockout-preview` | Público | Proyección informativa de grupos/llaves (sin pronósticos) |

### Etapa eliminatoria (Fases 4–7 implementadas en repo)

| Ruta / flujo | Actor | Descripción | Estado |
|--------------|-------|-------------|--------|
| `/ranking` (pestaña Llaves) | Público | Ranking cartillas `KNOCKOUT_STAGE` vía `vw_ranking_cards_knockout` | ✅ |
| Cartilla `KNOCKOUT_STAGE` | Autenticado | Cartilla nueva separada; marcador + equipo clasificado | ✅ |
| `/cards/[id]/summary` (llaves) | Autenticado (dueño) | Resumen de pronósticos eliminatoria | ✅ |
| Admin resultados llaves | Admin | RPC `save_knockout_match_result_and_recalculate` | ✅ |

**Sin cambios en lógica de grupos:** ranking de fase de grupos intacto en pestaña dedicada; pronósticos y RPC de grupos sin modificar.

---

## Flujo 1 — Registro e inicio de sesión

```mermaid
sequenceDiagram
  participant U as Usuario
  participant App as Next.js
  participant Auth as Supabase Auth
  participant DB as PostgreSQL

  U->>App: /register (email, password, full_name)
  App->>Auth: signUp con metadata full_name
  Auth->>DB: trigger handle_new_user → profiles
  Auth-->>App: sesión o confirmación email
  App->>U: redirect /dashboard o mensaje confirmación

  U->>App: /login
  App->>Auth: signInWithPassword
  Auth-->>App: sesión
  App->>U: redirect /dashboard
```

**Archivos:** `app/register/page.tsx`, `app/login/page.tsx`

**Reglas:**

- No insertar manualmente en `profiles` desde el registro.
- Protección de rutas privadas: verificación client-side con `getSession()` (sin middleware centralizado aún).

---

## Flujo 2 — Dashboard y creación de cartillas

```mermaid
flowchart TD
  A[Usuario en /dashboard] --> B{¿Sesión activa?}
  B -->|No| C[Redirect /login]
  B -->|Sí| D[Cargar cards del user_id]
  D --> E[Cargar profiles.role]
  E --> F[Cargar settings.card_creation_deadline]
  F --> G{¿now < deadline?}
  G -->|Sí| H[Mostrar formulario nueva cartilla]
  G -->|No| I[Ocultar creación; mostrar fecha límite]
  H --> J[Insert en cards]
  J --> K[Listar cartillas con enlaces]
```

**Archivos:** `app/dashboard/page.tsx`, `components/CardForm.tsx`, `components/CardList.tsx`

**Acciones desde cartilla:**

- Ver pronósticos → `/cards/[id]`
- Ver resumen → `/cards/[id]/summary`
- Enlaces admin si `role === 'admin'`

---

## Flujo 3 — Pronósticos por partido

```mermaid
flowchart TD
  A[/cards/id] --> B[Verificar sesión y ownership de cartilla]
  B --> C[Cargar matches + teams]
  C --> D[Cargar predictions de la cartilla]
  D --> E[Mostrar fixture con filtros]
  E --> F{¿match_date <= now?}
  F -->|No| G[Formulario editable]
  F -->|Sí| H[Solo lectura - Pronóstico cerrado]
  G --> I[upsert predictions]
  I --> J[points = 0 hasta resultado admin]
```

**Archivos:** `app/cards/[id]/page.tsx`, `components/MatchPredictionRow.tsx`, `lib/matches.ts`, `lib/matchPrediction.ts`

**UI:**

- Vista por grupo o por fecha (acordeones).
- Filtros: todos, pendientes, pronosticados, cerrados.
- Banderas vía `teams.flag_url`.

---

## Flujo 4 — Carga de resultados (admin)

```mermaid
sequenceDiagram
  participant A as Admin
  participant App as /admin/results
  participant RPC as save_match_result_and_recalculate
  participant DB as PostgreSQL

  A->>App: Ingresa local_score_real, visitor_score_real
  App->>RPC: p_match_id, p_local_score_real, p_visitor_score_real
  RPC->>DB: Actualiza matches
  RPC->>DB: recalculate_match_points
  DB-->>App: OK
  App-->>A: Resultado guardado y puntos recalculados
```

**Archivos:** `app/admin/results/page.tsx`, `components/AdminMatchResultRow.tsx`

**Reglas:**

- Solo `profiles.role = 'admin'`.
- No recalcular puntos en el cliente.

---

## Flujo 4b — Carga de resultados eliminatoria (admin — backend, sin pantalla)

```mermaid
sequenceDiagram
  participant A as Admin
  participant RPC as save_knockout_match_result_and_recalculate
  participant DB as PostgreSQL

  A->>RPC: p_match_number, marcador, p_winner_team_id
  RPC->>DB: Valida admin y equipos definidos
  RPC->>DB: Actualiza matches (marcador, winner, loser, FINISHED)
  RPC->>DB: recalculate_knockout_match_points
  RPC->>DB: propagate_knockout_teams
  DB-->>A: OK
```

**Estado:** RPC, funciones y pantalla admin en `/admin/results` (pestaña Llaves).

**Reglas:**

- Solo `profiles.role = 'admin'`.
- Partido debe tener `local_team_id` y `visitor_team_id` definidos.
- `p_winner_team_id` debe ser uno de los dos equipos del partido.
- Propaga ganador/perdedor a partidos plantilla (`local_source_*` / `visitor_source_*`).

---

## Flujo 5 — Ranking general

```mermaid
flowchart LR
  A[/ranking] --> B{Pestaña activa}
  B -->|Grupos| C[SELECT vw_ranking_cards]
  B -->|Llaves| D[SELECT vw_ranking_cards_knockout]
  C --> E[Ordenar: puntos, exactos, aciertos, nombre cartilla]
  D --> E
  E --> F[Podio top 3]
  E --> G[Tabla completa]
  G --> H[Ver detalle → /cards-public/card_id]
```

**Archivos:** `app/ranking/page.tsx`, `components/RankingPodium.tsx`, `components/RankingTable.tsx`, `components/RankingSummaryCards.tsx`, `lib/ranking.ts`

**Reglas:**

- Solo cartillas `ACTIVE` (las vistas ya las filtran).
- Cartillas `INACTIVE` no aparecen.
- Pestaña «Fase de grupos»: `vw_ranking_cards` (sin cambios).
- Pestaña «Llaves»: `vw_ranking_cards_knockout`; columna `result_hits` = aciertos de clasificado (puntos 3); sin enlace a vista pública (solo grupos).
- Orden oficial: `total_points` desc, `exact_scores` desc, `result_hits` desc, `card_name` asc (helper `lib/ranking.ts`).

---

## Flujo 6 — Resumen propio de cartilla

**Ruta:** `/cards/[id]/summary`

1. Usuario autenticado.
2. Verificar que la cartilla pertenece al usuario (`cards` + `user_id`).
3. Según `cards.stage`:
   - **`GROUP_STAGE`:** cargar `vw_card_prediction_detail` filtrado por `card_id` (comportamiento original).
   - **`KNOCKOUT_STAGE`:** cargar `predictions` + partidos eliminatoria (`matches` con equipos); mostrar marcador, clasificado pronosticado/real y placeholders de plantilla.
4. Mostrar estadísticas y tabla con todos los pronósticos (incluidos futuros, porque es el dueño).

**Archivos:** `app/cards/[id]/summary/page.tsx`, `components/CardSummaryStats.tsx`, `components/CardSummaryTable.tsx`, `components/KnockoutCardSummaryTable.tsx`, `lib/cardSummary.ts`, `lib/knockoutCardSummary.ts`

---

## Flujo 7 — Vista pública de cartilla ajena

**Ruta:** `/cards-public/[id]`

```mermaid
flowchart TD
  A[Usuario autenticado] --> B[SELECT vw_ranking_cards WHERE card_id]
  B --> C{¿Encontrada?}
  C -->|No| D[Mensaje: no encontrada o no habilitada]
  C -->|Sí| E[Mostrar cabecera y stats desde vista]
  E --> F[SELECT vw_card_prediction_detail]
  F --> G{¿Hay pronósticos?}
  G -->|No| H[Mensaje: sin pronósticos registrados]
  G -->|Sí| I[Tabla de partidos]
  I --> J{¿match_date > now?}
  J -->|Sí| K[Ocultar pronóstico y puntos]
  J -->|No| L[Mostrar pronóstico y puntos]
```

**Archivos:** `app/cards-public/[id]/page.tsx`, `components/PublicCardSummaryStats.tsx`, `components/PublicCardSummaryTable.tsx`

**Reglas críticas:**

- **No** consultar `cards` ni `profiles` para datos ajenos.
- Fuente principal: `vw_ranking_cards` + `vw_card_prediction_detail`.
- Solo lectura; sin edición.

---

## Flujo 8 — Administración de cartillas

**Ruta:** `/admin/cards`

1. Verificar rol admin.
2. Listar todas las cartillas (`cards` con RLS admin).
3. Filtrar por estado y búsqueda.
4. Cambiar estado vía `admin_update_card_status` (`ACTIVE` / `INACTIVE`).

---

## Flujo 9 — Configuración global

**Ruta:** `/admin/settings`

1. Verificar rol admin.
2. Leer `settings` donde `key = 'card_creation_deadline'`.
3. Admin edita fecha/hora en UI (zona Perú).
4. Guardar vía `admin_update_setting` (no update directo por RLS).

**Archivos:** `app/admin/settings/page.tsx`, `lib/settingsDeadline.ts`

---

## Componentes y librerías compartidas

| Módulo | Responsabilidad |
|--------|-----------------|
| `lib/supabaseClient.ts` | Cliente Supabase |
| `lib/types.ts` | Tipos TypeScript alineados a BD |
| `lib/matchPrediction.ts` | Fechas Perú, cierre de pronósticos |
| `lib/matches.ts` | Carga de partidos `GROUP_STAGE` con equipos |
| `lib/knockoutMatches.ts` | Partidos eliminatoria, placeholders y etiquetas de equipos |
| `lib/cardSummary.ts` | Etiquetas y stats de resumen |
| `lib/settingsDeadline.ts` | Parse/build deadline Perú |
| `lib/ranking.ts` | Orden oficial de vistas de ranking (grupos y llaves) |
| `lib/knockoutCardSummary.ts` | Stats y filas de resumen eliminatoria |
| `supabase/migrations/` | Migraciones SQL (Fases 1–3 etapa eliminatoria) |
| `components/Navbar.tsx` | Navegación global |
| `components/TeamFlag.tsx` | Banderas |
