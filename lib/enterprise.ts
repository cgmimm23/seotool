import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export function isEnterprise(plan: string): boolean {
  return plan === 'enterprise'
}

export async function requireEnterprise() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null, profile: null, supabase: null as any }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.plan !== 'enterprise') {
    return { error: NextResponse.json({ error: 'Enterprise plan required' }, { status: 403 }), user: null, profile: null, supabase: null as any }
  }

  return { error: null, user, profile, supabase }
}
