import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null, supabase: null as any }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }), user: null, supabase: null as any }
  }

  return { error: null, user, supabase }
}
