export const KNOCKOUT_RULES_TITLE = 'Polla Mundialista 2026 – Fase de Llaves'

export const KNOCKOUT_RULES_INTRO =
  'La etapa de llaves se juega desde octavos de final hasta la final.'

export const KNOCKOUT_RULES_PREDICTIONS = [
  'Marcador',
  'Equipo clasificado',
] as const

export const KNOCKOUT_RULES_SCORING = [
  {
    label: 'Marcador exacto + clasificado correcto',
    points: 5,
  },
  {
    label: 'Marcador exacto, pero clasificado incorrecto',
    points: 3,
  },
  {
    label: 'Clasificado correcto, sin marcador exacto',
    points: 2,
  },
  {
    label: 'Clasificado incorrecto y marcador no exacto',
    points: 0,
  },
] as const

export const KNOCKOUT_RULES_TIE_NOTE =
  'Si el marcador pronosticado es empate, se debe indicar qué equipo clasifica.'

export const KNOCKOUT_RULES_RANKING =
  'El ranking es acumulado hasta la final. Los puestos pueden ser compartidos según el puntaje obtenido.'

export const KNOCKOUT_RULES_ROUND_OF_32_NOTE =
  'Los 16avos forman parte del fixture y de los pronósticos, pero no suman al ranking oficial (desde octavos).'
