-- 007_admin_global_access.sql
-- Acceso global de administrador: políticas RLS, listado de cartillas y estadísticas.

-- ---------------------------------------------------------------------------
-- Helper: verificar rol admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Retorna true si el usuario autenticado tiene role = admin en profiles.';

-- ---------------------------------------------------------------------------
-- RLS: lectura/escritura global para admin
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cards'
      AND policyname = 'cards_admin_select'
  ) THEN
    CREATE POLICY cards_admin_select
      ON public.cards
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_admin_select'
  ) THEN
    CREATE POLICY profiles_admin_select
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_admin_update'
  ) THEN
    CREATE POLICY profiles_admin_update
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'predictions'
      AND policyname = 'predictions_admin_select'
  ) THEN
    CREATE POLICY predictions_admin_select
      ON public.predictions
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- RPC: listado global de cartillas para /admin/cards
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_cards()
RETURNS TABLE (
  id bigint,
  user_id uuid,
  card_name text,
  stage text,
  status text,
  admin_note text,
  created_at timestamptz,
  updated_at timestamptz,
  participant_name text,
  participant_email text,
  whatsapp_phone text,
  prediction_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden listar cartillas.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.card_name,
    c.stage,
    c.status,
    c.admin_note,
    c.created_at,
    c.updated_at,
    COALESCE(NULLIF(trim(p.full_name), ''), 'Participante') AS participant_name,
    u.email::text AS participant_email,
    CASE
      WHEN p.whatsapp_enabled = false THEN NULL
      ELSE p.whatsapp_phone
    END AS whatsapp_phone,
    (
      SELECT count(*)::bigint
      FROM public.predictions pr
      WHERE pr.card_id = c.id
    ) AS prediction_count
  FROM public.cards c
  JOIN public.profiles p ON p.id = c.user_id
  LEFT JOIN auth.users u ON u.id = c.user_id
  ORDER BY c.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.admin_list_cards() IS
  'Listado global de cartillas con participante, email y conteo de pronósticos. Solo admin.';

GRANT EXECUTE ON FUNCTION public.admin_list_cards() TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: estadísticas del panel /admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden consultar estadísticas.';
  END IF;

  RETURN json_build_object(
    'total_users', (SELECT count(*)::bigint FROM public.profiles),
    'group_cards', (
      SELECT count(*)::bigint
      FROM public.cards
      WHERE stage = 'GROUP_STAGE'
    ),
    'knockout_cards', (
      SELECT count(*)::bigint
      FROM public.cards
      WHERE stage = 'KNOCKOUT_STAGE'
    ),
    'active_cards', (
      SELECT count(*)::bigint
      FROM public.cards
      WHERE status = 'ACTIVE'
    ),
    'total_predictions', (SELECT count(*)::bigint FROM public.predictions),
    'matches_with_result', (
      SELECT count(*)::bigint
      FROM public.matches
      WHERE status = 'FINISHED'
    )
  );
END;
$$;

COMMENT ON FUNCTION public.admin_get_dashboard_stats() IS
  'Resumen global para el panel administrador. Solo admin.';

GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_stats() TO authenticated;
