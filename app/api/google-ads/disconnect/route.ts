import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { siteId } = await request.json().catch(() => ({ siteId: null }))

    let tokenToRevoke: string | null = null

    if (siteId) {
      const { data: site } = await supabase
        .from('sites')
        .select('user_id, google_access_token')
        .eq('id', siteId)
        .single()
      if (site && site.user_id === user.id) {
        tokenToRevoke = site.google_access_token
        await supabase.from('sites')
          .update({
            google_email: null,
            google_access_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
          })
          .eq('id', siteId)
      }
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('google_access_token')
        .eq('id', user.id)
        .single()
      tokenToRevoke = profile?.google_access_token || null
      await supabase.from('profiles')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
        })
        .eq('id', user.id)
    }

    if (tokenToRevoke) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      } catch {}
    }

    return NextResponse.json({ disconnected: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
