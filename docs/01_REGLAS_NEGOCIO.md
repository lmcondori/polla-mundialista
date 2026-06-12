# 01 — Reglas de negocio

Documento de referencia para decisiones de producto y validaciones. Cualquier cambio en estas reglas requiere **autorización explícita** del responsable del proyecto.

---

## Alcance del torneo

- Solo **fase de grupos** del Mundial 2026.
- El fixture de grupos está cargado en `matches` (`phase = 'GROUP_STAGE'`, `group_name` A–L).
- **No implementar** la segunda etapa por llaves (octavos, cuartos, semifinal, final) salvo solicitud explícita.

---

## Cartillas (`cards`)

| Regla | Detalle |
|-------|---------|
| Creación | Cualquier participante autenticado puede crear cartillas **antes** de `card_creation_deadline` |
| Deadline | Configurable por admin en `settings` (`key = card_creation_deadline`) |
| Estados | `ACTIVE` — habilitada para participar; `INACTIVE` — inhabilitada por admin |
| Ranking | Solo cartillas `ACTIVE` aparecen en `vw_ranking_cards` y en el ranking general |
| Inactivas | Cartillas `INACTIVE` no participan en ranking ni en la vista pública habilitada |

---

## Pronósticos (`predictions`)

| Regla | Detalle |
|-------|---------|
| Quién | Solo el dueño de la cartilla |
| Cuándo editar | Mientras `now < match_date` (inicio del partido) |
| Cierre | Al llegar o superar `match_date`, el pronóstico queda cerrado (solo lectura en UI) |
| Unicidad | Un pronóstico por par `(card_id, match_id)` |
| Puntos iniciales | Al guardar pronóstico, `points = 0`; el cálculo real ocurre en servidor al cargar resultado |

### Privacidad entre participantes

- **No revelar** pronósticos de otros usuarios para partidos **futuros** (`match_date > now`).
- En la vista pública (`/cards-public/[id]`) se muestra el mensaje: *"Pronóstico oculto hasta el inicio del partido"*.
- Para partidos ya iniciados o finalizados, el pronóstico ajeno sí es visible en la vista pública.

---

## Sistema de puntaje

El cálculo se realiza en **Supabase** (funciones `calculate_prediction_points`, `recalculate_match_points`, invocadas vía RPC). El frontend **no** recalcula puntos.

| Resultado | Puntos | Código en vista |
|-----------|--------|-----------------|
| Marcador exacto (local y visitante) | **5** | `SCORE_EXACTO` |
| Acierta ganador o empate (sin marcador exacto) | **3** | `RESULTADO_ACERTADO` |
| No acierta resultado | **0** | `NO_ACERTADO` |
| Partido sin resultado oficial aún | — | `PENDIENTE_RESULTADO` |

### Criterio de desempate en ranking (orden habitual)

1. `total_points` (descendente)
2. `exact_scores` (descendente)
3. `result_hits` (descendente)

---

## Resultados reales (`matches`)

| Regla | Detalle |
|-------|---------|
| Quién carga | Solo usuarios con `profiles.role = 'admin'` |
| Cómo | RPC `save_match_result_and_recalculate` desde `/admin/results` |
| Efecto | Actualiza `local_score_real`, `visitor_score_real`, recalcula `predictions.points` del partido |
| Estado | `status` del partido (p. ej. `PENDING`, `FINISHED`) |

---

## Administración

Solo **admin** puede:

- Registrar o actualizar resultados de partidos.
- Habilitar o inhabilitar cartillas (`admin_update_card_status`).
- Modificar configuración global (`admin_update_setting`), incluido el deadline de creación de cartillas.

---

## Fechas y zona horaria

| Concepto | Regla |
|----------|-------|
| Almacenamiento | `timestamptz` en PostgreSQL |
| Hora de referencia | Perú (`-05:00` / `America/Lima`) |
| Visualización | Siempre formatear con `timeZone: 'America/Lima'` |
| Cierre de pronósticos | Comparación de instante UTC: `new Date() >= new Date(match_date)` |
| Deadline cartillas | ISO con offset fijo `-05:00` (ver `lib/settingsDeadline.ts`) |

---

## Equipos y banderas

- Datos en tabla `teams`: `name`, `fifa_code`, `flag_url`.
- La UI muestra banderas desde `flag_url` (componentes `TeamFlag`, `TeamWithFlag`).
- Convención de local/visitante: `local_team_id` / `visitor_team_id` (nunca `home` / `away`).

---

## Restricciones de nombres (negocio ↔ BD)

Usar **siempre** los nombres reales de columnas. No inventar alias:

| ❌ Prohibido | ✅ Correcto |
|-------------|-------------|
| `home_team_id` | `local_team_id` |
| `away_team_id` | `visitor_team_id` |
| `home_goals` | `local_score_predicted` / `local_score_real` |
| `away_goals` | `visitor_score_predicted` / `visitor_score_real` |
