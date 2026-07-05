# 01 — Reglas de negocio

Documento de referencia para decisiones de producto y validaciones. Cualquier cambio en estas reglas requiere **autorización explícita** del responsable del proyecto.

---

## Alcance del torneo

### Fase de grupos (implementada — no romper)

- Fixture en `matches` con `phase = 'GROUP_STAGE'`, `group_name` A–L.
- Cartillas con `cards.stage = 'GROUP_STAGE'` (valor por defecto; todas las cartillas existentes).
- Ranking en `vw_ranking_cards` (solo etapa de grupos).
- Puntaje: exacto 5 · acierta ganador/empate 3 · fallo 0.

### Etapa eliminatoria (implementada)

- Segunda etapa **separada** de la fase de grupos.
- Cartillas de llaves: `cards.stage = 'KNOCKOUT_STAGE'` (cartillas nuevas; no migrar las existentes).
- **No** se reutiliza la misma cartilla de grupos para llaves.
- Partidos de eliminatoria en `matches` con fases: `ROUND_OF_32`, `ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `THIRD_PLACE`, `FINAL`.
- Ranking separado: `vw_ranking_cards_knockout` (pestaña «Llaves» en `/ranking`).

> La fase de grupos permanece operativa sin cambios de reglas ni de pantallas.

---

## Cartillas (`cards`)

| Regla | Detalle |
|-------|---------|
| Creación | Participante autenticado, antes de `card_creation_deadline` |
| Deadline | Configurable por admin en `settings` (`key = card_creation_deadline`) |
| Estados | `ACTIVE` / `INACTIVE` |
| **Etapa (`stage`)** | `GROUP_STAGE` (fase de grupos, default) \| `KNOCKOUT_STAGE` (eliminatoria) |
| Cartillas existentes | Permanecen `GROUP_STAGE`; **no migrar** a llaves |
| Cartillas de llaves | Nuevas cartillas con `stage = 'KNOCKOUT_STAGE'` |
| Ranking grupos | Solo `ACTIVE` + `GROUP_STAGE` en `vw_ranking_cards` |
| Ranking llaves | `ACTIVE` + `KNOCKOUT_STAGE` en `vw_ranking_cards_knockout`; pestaña «Llaves» en `/ranking`; **solo octavos en adelante** (`ROUND_OF_16` … `FINAL`) |

---

## Pronósticos (`predictions`)

| Regla | Detalle |
|-------|---------|
| Quién | Solo el dueño de la cartilla |
| Cuándo editar | Mientras `now < match_date` (inicio del partido) |
| Cierre | Al llegar o superar `match_date`, el pronóstico queda cerrado (solo lectura en UI) |
| Unicidad | Un pronóstico por par `(card_id, match_id)` |
| Puntos iniciales | Al guardar, `points = 0`; cálculo en servidor al cargar resultado |

**Eliminatoria:** además del marcador, `predicted_winner_team_id` (bigint → `teams.id`).

---

### Privacidad entre participantes

- **No revelar** pronósticos de otros usuarios para partidos **futuros** (`match_date > now`).
- En la vista pública (`/cards-public/[id]`) se muestra el mensaje: *"Pronóstico oculto hasta el inicio del partido"*.
- Para partidos ya iniciados o finalizados, el pronóstico ajeno sí es visible en la vista pública.

---

## Sistema de puntaje

El cálculo se realiza en **Supabase** (funciones de BD invocadas vía RPC). El frontend **no** recalcula puntos.

- **Grupos:** `calculate_prediction_points`, `recalculate_match_points`, RPC `save_match_result_and_recalculate`.
- **Llaves:** `calculate_prediction_points_v2`, `recalculate_knockout_match_points`, RPC `save_knockout_match_result_and_recalculate`.

| Resultado | Puntos | Código en vista |
|-----------|--------|-----------------|
| Marcador exacto (local y visitante) | **5** | `SCORE_EXACTO` |
| Acierta ganador o empate (sin marcador exacto) | **3** | `RESULTADO_ACERTADO` |
| No acierta resultado | **0** | `NO_ACERTADO` |
| Partido sin resultado oficial aún | — | `PENDIENTE_RESULTADO` |

### Orden oficial del ranking

1. Mayor puntaje total (`total_points` descendente).
2. **Empates:** si dos o más cartillas tienen el mismo `total_points`, comparten la misma posición.
3. **Ranking denso:** la numeración de puestos es 1, 1, 2, 2, 3 (no 1, 1, 3, 3, 5).
4. `exact_scores`, `result_hits` y `total_predictions` son **solo estadísticas informativas**; no desempatan.

El ranking se ordena por puntos totales. En caso de empate, las cartillas comparten la misma posición. La numeración de puestos usa ranking denso: 1, 1, 2, 2, 3.

Para estabilidad visual dentro del mismo puntaje, el listado puede ordenar alfabéticamente por `card_name` asc; eso **no** afecta el puesto.

### Puntaje eliminatoria

La etapa de llaves se juega desde **octavos de final** hasta la final. Por cada partido se pronostica **marcador** y **equipo clasificado**.

| Escenario | Puntos |
|-----------|--------|
| Marcador exacto + clasificado correcto | **5** |
| Marcador exacto, pero clasificado incorrecto | **3** |
| Clasificado correcto, sin marcador exacto | **2** |
| Clasificado incorrecto y marcador no exacto | **0** |

Componentes en BD: marcador exacto = **3** pts + clasificado correcto = **2** pts (máximo **5** por partido).

Si el marcador pronosticado es empate, se debe indicar qué equipo clasifica. Puede haber empate en el marcador real; siempre debe existir un equipo clasificado (`winner_team_id`).

El ranking es acumulado hasta la final. Los puestos pueden ser compartidos según el puntaje obtenido (ranking denso por `total_points`).

**Ranking y resumen oficial de llaves:** el puntaje acumulado considera solo partidos desde **octavos de final** (`ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `THIRD_PLACE`, `FINAL`). Los **16avos** (`ROUND_OF_32`) permanecen en el fixture, pronósticos y cuadro gráfico, pero **no suman** al ranking ni al total de la cartilla de llaves.

El participante pronostica marcador y `predicted_winner_team_id`. El admin registra marcador real, `winner_team_id` y `loser_team_id` (calculado) vía RPC `save_knockout_match_result_and_recalculate`.

**Migración:** `006_fix_knockout_points_composite.sql`.

---

## Resultados reales (`matches`)

| Regla | Detalle |
|-------|---------|
| Quién carga | Solo usuarios con `profiles.role = 'admin'` |
| Cómo (grupos) | RPC `save_match_result_and_recalculate` desde `/admin/results` |
| Cómo (llaves) | RPC `save_knockout_match_result_and_recalculate` desde `/admin/results` (pestaña Llaves) |
| Efecto grupos | Actualiza marcador real, recalcula `predictions.points` |
| Efecto llaves | Actualiza marcador, `winner_team_id`, `loser_team_id`, recalcula puntos y propaga equipos a partidos plantilla |
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
