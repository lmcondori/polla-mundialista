import type { CardStage } from '@/lib/types'

export const WHATSAPP_DASHBOARD_URL =
  'https://polla-mundialista-ashy.vercel.app/dashboard'

const STAGE_LABEL: Record<CardStage, string> = {
  GROUP_STAGE: 'fase de grupos',
  KNOCKOUT_STAGE: 'llaves',
}

/** Normaliza a dígitos internacionales (sin +). */
export function normalizeWhatsappPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  return digits
}

export function getWhatsappStageLabel(stage: CardStage): string {
  return STAGE_LABEL[stage]
}

export function buildWhatsappReminderMessage(
  participantName: string,
  pendingCount: number,
  stage: CardStage
): string {
  const name = participantName.trim() || 'participante'
  const countLabel = pendingCount === 1 ? '1 pronóstico' : `${pendingCount} pronósticos`
  const stageLabel = getWhatsappStageLabel(stage)

  return [
    `Hola ${name}, te recordamos registrar tus pronósticos de la Polla Mundialista 2026.`,
    '',
    `Tienes ${countLabel} pendiente(s) para la etapa ${stageLabel}.`,
    '',
    `Ingresa aquí:`,
    WHATSAPP_DASHBOARD_URL,
    '',
    'Recuerda: puedes registrar o editar tu pronóstico antes del inicio de cada partido.',
  ].join('\n')
}

export function buildWhatsappMeUrl(
  phone: string,
  message: string
): string | null {
  const normalized = normalizeWhatsappPhone(phone)
  if (!normalized) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

export function formatWhatsappPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return 'Sin número registrado'
  return phone
}
