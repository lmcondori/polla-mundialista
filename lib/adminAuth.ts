import type { SupabaseClient } from '@supabase/supabase-js'

export type AdminAccessState = 'checking' | 'denied' | 'allowed'

export type AdminAccessResult = {
  state: AdminAccessState
  userId: string | null
}

export async function checkAdminAccess(
  supabase: SupabaseClient
): Promise<AdminAccessResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return { state: 'checking', userId: null }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (error || profile?.role !== 'admin') {
    return { state: 'denied', userId: session.user.id }
  }

  return { state: 'allowed', userId: session.user.id }
}

export async function fetchIsAdmin(
  supabase: SupabaseClient
): Promise<boolean> {
  const { state } = await checkAdminAccess(supabase)
  return state === 'allowed'
}
