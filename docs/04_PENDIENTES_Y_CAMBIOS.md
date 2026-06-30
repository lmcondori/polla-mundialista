# 04 — Pendientes y cambios

Registro de trabajo futuro, restricciones explícitas y notas para agentes/desarrolladores.

---

## Restricciones explícitas (no implementar sin autorización)

| Tema | Estado | Notas |
|------|--------|-------|
| **Etapa eliminatoria** | ✅ Implementada | Rama `feature/etapa-llaves` (Fases 1–10). **No romper fase de grupos.** |
| Cambio de reglas de puntaje grupos | 🚫 Prohibido | 5 / 3 / 0 en funciones de BD para `GROUP_STAGE` |
| Puntaje eliminatoria | ✅ En repo | 5 / 3 / 0 con clasificado; `003_knockout_functions_and_views.sql` |
| Renombrar columnas/tablas | 🚫 Prohibido | Ver `01_REGLAS_NEGOCIO.md` y `02_BASE_DATOS_SUPABASE.md` |
| Recalcular puntos en frontend | 🚫 Prohibido | Usar RPC existentes |

---

## Funcionalidades implementadas (checklist)

- [x] Registro y login con Supabase Auth
- [x] Perfiles en `profiles` (trigger `handle_new_user`)
- [x] Roles `admin` y `participant`
- [x] Dashboard de cartillas
- [x] Creación de cartillas con deadline configurable
- [x] Estados de cartilla `ACTIVE` / `INACTIVE`
- [x] Pronósticos por partido con upsert
- [x] Bloqueo de pronósticos al llegar `match_date`
- [x] Fechas en Perú (`America/Lima`) en UI
- [x] `match_date` como `timestamptz`
- [x] Carga de resultados reales (admin)
- [x] Recálculo automático de puntos (RPC + funciones internas)
- [x] Ranking general y podio
- [x] Resumen de cartilla propia
- [x] Administración de cartillas (habilitar/deshabilitar)
- [x] Configuración `card_creation_deadline` en `/admin/settings`
- [x] Banderas de equipos (`teams.flag_url`)
- [x] Fixture de fase de grupos cargado
- [x] Vista pública controlada de cartillas ajenas (`/cards-public/[id]`)
- [x] Ranking de llaves (pestaña en `/ranking`)
- [x] Resumen de cartilla de llaves (`/cards/[id]/summary`)
- [x] Proyección referencial `/knockout-preview` (sin pronósticos; fuera del menú principal)
- [x] Cuadro de llaves real `/knockout` (partidos 73–104)
- [x] Revisión final etapa llaves (Fase 8)

---

## Etapa eliminatoria — plan por fases

| Fase | Alcance | Estado |
|------|---------|--------|
| **1** | Esquema BD (`cards.stage`, columnas `matches`/`predictions`) + docs | ✅ En repo |
| **2** | Seed partidos 73–104 | ✅ En repo (`002_seed_knockout_matches.sql`) |
| **3** | Funciones RPC, puntaje eliminatoria, propagación, `vw_ranking_cards_knockout` | ✅ En repo (`003_knockout_functions_and_views.sql`) |
| **4–7** | Pantallas: cartillas llaves, pronósticos, admin resultados llaves, ranking llaves, resumen llaves | ✅ En repo |
| **8** | Revisión final, navegación, textos y aislamiento grupos/llaves | ✅ En repo |
| **9** | Cuadro gráfico de llaves reales (`/knockout`) | ✅ En repo |
| **10** | Ranking oficial de llaves desde octavos (`004_knockout_ranking_from_round_of_16.sql`) | ✅ En repo |

**Decisiones oficiales:**

- Cartillas grupos y llaves **separadas** (`GROUP_STAGE` vs `KNOCKOUT_STAGE`).
- Cartillas existentes **no se migran**.
- IDs de dominio (`teams`, `matches`, `cards`, `predictions`) = **`bigint`**; FKs a equipos = **`bigint`**.
- Ranking grupos (`vw_ranking_cards`) **sin modificar**.

---

## Pendientes conocidos

| Ítem | Prioridad | Descripción |
|------|-----------|-------------|
| Pruebas automatizadas | Media | No hay suite unitaria ni e2e en el repo |
| Middleware de auth | Media | Protección actual es client-side por página |
| README del proyecto | Baja | `README.md` sigue siendo plantilla de create-next-app |
| Vista pública cartillas de llaves | Media | `/cards-public/[id]` solo soporta `GROUP_STAGE`; ranking de llaves no enlaza detalle público |
| Protección server-side | Baja | Evaluar Server Components / Route Handlers si se endurece seguridad |
| Confirmación email registro | Baja | Depende de configuración Supabase Auth |
| Etiquetas UI fases eliminatorias | ✅ Completado | Fases 4–8: dashboard, pronósticos, admin, ranking, resumen y revisión final |

---

## Deuda técnica documentada

| Tema | Detalle |
|------|---------|
| Auth en cliente | Cada página verifica sesión con `getSession()`; no hay `middleware.ts` central |
| Tipos en `lib/types.ts` | IDs como `string` en TS; BD usa `bigint` para dominio |
| Ranking móvil | Tabla con scroll horizontal; sin vista tarjeta dedicada en `RankingTable` |

---

## Protocolo para nuevos cambios

Antes de implementar cualquier feature o fix:

1. Leer `docs/` completo y `AGENTS.md`.
2. Redactar plan breve (archivos a tocar, impacto en RLS/RPC).
3. Obtener autorización si afecta reglas de negocio o lógica probada.
4. Cambiar solo archivos necesarios.
5. Ejecutar `npm run build` y corregir errores TypeScript.
6. Actualizar este documento si el cambio altera alcance o pendientes.

---

## Historial de cambios (documentación)

| Fecha | Cambio |
|-------|--------|
| 2026-05 | Creación de carpeta `docs/` y documentación interna inicial |
| 2026-05 | Vista pública `/cards-public/[id]` con ocultamiento de pronósticos futuros |
| 2026-06 | Fase 1 etapa eliminatoria: migración `001_knockout_stage_schema.sql`, docs actualizados |
| 2026-06 | Fase 2 seed eliminatoria: `002_seed_knockout_matches.sql` |
| 2026-06 | Fase 8 revisión final: navegación, textos unificados, aislamiento `GROUP_STAGE` en `fetchMatchesWithTeams` |
| 2026-06 | Fase 9 cuadro de llaves: `/knockout`, `KnockoutBracket`, menú «Llaves» |
| 2026-06 | Fase 10 ranking llaves desde octavos: vista `vw_ranking_cards_knockout`, resumen cartilla |

---

## Ideas futuras (no comprometidas)

Estas ideas **no** están aprobadas para desarrollo:

- Exportar ranking a PDF/Excel
- Notificaciones push o email de cierre de pronósticos
- Múltiples deadlines por fase
- Segunda etapa por llaves del Mundial — **implementada** (ver tabla de fases)
- Modo oscuro

Cualquier ítem de esta lista requiere definición de negocio y autorización antes de codificar.
