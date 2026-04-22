import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { META_API_VERSION, META_SCOPES } from '@/lib/meta'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const returnTo = searchParams.get('returnTo') || '/sites'
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const appId = process.env.META_APP_ID
  if (!appId) return NextResponse.json({ error: 'META_APP_ID not configured' }, { status: 500 })

  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/meta/callback`

  // Pack siteId + returnTo + userId into state so we can verify on callback
  const state = Buffer.from(JSON.stringify({ siteId, returnTo, userId: user.id, t: Date.now() })).toString('base64url')

  const q = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: META_SCOPES.join(','),
    response_type: 'code',
    auth_type: 'rerequest',
  })

  return NextResponse.redirect(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${q}`)
}
