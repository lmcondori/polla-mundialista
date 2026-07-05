-- Fase 11: campos WhatsApp en perfiles para recordatorios manuales (wa.me).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.whatsapp_phone IS
  'Número WhatsApp internacional sin +, ej. 51999999999';

COMMENT ON COLUMN public.profiles.whatsapp_enabled IS
  'Si es false, el admin no debe enviar recordatorios a este participante.';
