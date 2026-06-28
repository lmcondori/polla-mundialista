# 01 — Reglas de negocio

Documento de referencia para decisiones de producto y validaciones. Cualquier cambio en estas reglas requiere **autorización explícita** del responsable del proyecto.

---

## Alcance del torneo

### Fase de grupos (implementada — no romper)

- Fixture en `matches` con `phase = 'GROUP_STAGE'`, `group_name` A–L.
- Cartillas con `cards.stage = 'GROUP_STAGE'` (valor por defecto; todas las cartillas existentes).
- Ranking en `vw_ranking_cards` (solo etapa de grupos).
- Puntaje: exacto 5 · acierta ganador/empate 3 · fallo 0.

### Etapa eliminatoria (en desarrollo por fases)

- Segunda etapa **separada** de la fase de grupos.
- Cartillas de llaves: `cards.stage = 'KNOCKOUT_STAGE'` (cartillas nuevas; no migrar las existentes).
- **No** se reutiliza la misma cartilla de grupos para llaves.
- Partidos de eliminatoria en `matches` con fases: `ROUND_OF_32`, `ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `THIRD_PLACE`, `FINAL`.
- Ranking futuro separado: `vw_ranking_cards_knockout` (Fase posterior — aún no implementada).

> La fase de grupos permanece operativa sin cambios de reglas ni de pantallas hasta completar cada fase aprobada.

---

## Cartillas (`cards`)

| Regla | Detalle |
|-------|---------|
| Creación | Participante autenticado, antes de `card_creation_deadline` |
| Deadline | Configurable por admin en `settings` (`key = card_creation_deadline`) |
| Estados | `ACTIVE` / `INACTIVE` |
| **Etapa (`stage`)** | `GROUP_STAGE` (fase de grupos, default) \| `KNOCKOUT_STAGE` (eliminatoria) |
| Cartillas existentes | Permanecen `GROUP_STAGE`; **no migrar** a llaves |
| Cartillas de llaves | Nuevas cartillas con `stage = 'KNOCKOUT_STAGE'` (futuro, Fase UI) |
| Ranking grupos | Solo `ACTIVE` + `GROUP_STAGE` en `vw_ranking_cards` |
| Ranking llaves | Futuro: `ACTIVE` + `KNOCKOUT_STAGE` en `vw_ranking_cards_knockout` |

---

## Pronósticos (`predictions`)

| Regla | Detalle |
|-------|---------|
| Quién | Solo el dueño de la cartilla |
| Cuándo editar | Mientras `now < match_date` (inicio del partido) |
| Cierre | Al llegar o superar `match_date`, el pronóstico queda cerrado (solo lectura en UI) |
| Unicidad | Un pronóstico por par `(card_id, match_id)` |
| Puntos iniciales | Al guardar, `points = 0`; cálculo en servidor al cargar resultado |

**Eliminatoria (documentado — implementación Fase 2+):** además del marcador, `predicted_winner_team_id` (bigint → `teams.id`).

---

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

### Orden oficial del ranking

1. Mayor puntaje total (`total_points` descendente)
2. Mayor cantidad de marcadores exactos (`exact_scores` descendente)
3. Mayor cantidad de aciertos de resultado (`result_hits` descendente)
4. Nombre de cartilla en orden alfabético ascendente (`card_name` ascendente)

El ranking se ordena por `total_points` desc, `exact_scores` desc, `result_hits` desc y `card_name` asc.

### Puntaje eliminatoria (documentado — RPC pendiente Fase 2)

| Resultado | Puntos |
|-----------|--------|
| Marcador exacto | **5** |
| Acierta equipo clasificado (sin marcador exacto) | **3** |
| No acierta | **0** |

El participante pronostica marcador y `predicted_winner_team_id`. El admin registra marcador real y `winner_team_id`.

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
