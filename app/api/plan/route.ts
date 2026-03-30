import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const PLAN_LIMITS: Record<string, { sites: number; label: string }> = {
  free:    { sites: 1,         label: 'Free' },
  starter: { sites: 5,         label: 'Starter' },
  pro:     { sites: 20,        label: 'Pro' },
  agency:  { sites: 999,       label: 'Agency' },
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    const plan = profile?.plan || 'free'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

    const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true }).eq('user_id', user.id)

    return NextResponse.json({
      plan,
      label: limits.label,
      siteLimit: limits.sites,
      sitesUsed: count || 0,
      canAddSite: (count || 0) < limits.sites,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
