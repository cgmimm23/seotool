import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { exchangeCodeForToken, exchangeForLongLivedUserToken, graphFetch, META_SCOPES } from '@/lib/meta'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const stateRaw = searchParams.get('state')
  const error = searchParams.get('error_description') || searchParams.get('error')

  if (error) return NextResponse.redirect(`${origin}/sites?meta_error=${encodeURIComponent(error)}`)
  if (!code || !stateRaw) return NextResponse.redirect(`${origin}/sites?meta_error=missing_code`)

  let state: any
  try { state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString()) } catch {
    return NextResponse.redirect(`${origin}/sites?meta_error=bad_state`)
  }

  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== state.userId) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(state.returnTo || '/sites')}`)
  }

  // Verify site ownership
  const { data: site } = await supabase.from('sites').select('id, user_id').eq('id', state.siteId).single()
  if (!site || site.user_id !== user.id) {
    return NextResponse.redirect(`${origin}/sites?meta_error=bad_site`)
  }

  try {
    const redirectUri = `${origin}/api/meta/callback`
    const short = await exchangeCodeForToken(code, redirectUri)
    const long = await exchangeForLongLivedUserToken(short.access_token)

    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + (long.expires_in || 60 * 24 * 60 * 60))

    // Fetch user info
    const me = await graphFetch('/me', long.access_token, { fields: 'id,name' })

    // Fetch pages the user manages
    let pageId: string | null = null
    let pageName: string | null = null
    let pageAccessToken: string | null = null
    let igUserId: string | null = null
    let igUsername: string | null = null
    try {
      const pages = await graphFetch('/me/accounts', long.access_token, { fields: 'id,name,access_token,instagram_business_account{id,username}' })
      const firstPage = pages.data?.[0]
      if (firstPage) {
        pageId = firstPage.id
        pageName = firstPage.name
        pageAccessToken = firstPage.access_token
        if (firstPage.instagram_business_account) {
          igUserId = firstPage.instagram_business_account.id
          igUsername = firstPage.instagram_business_account.username
        }
      }
    } catch {}

    // Fetch first ad account the user has access to
    let adAccountId: string | null = null
    try {
      const ads = await graphFetch('/me/adaccounts', long.access_token, { fields: 'id,name', limit: '1' })
      adAccountId = ads.data?.[0]?.id || null
    } catch {}

    await supabase.from('sites').update({
      meta_user_id: me.id,
      meta_user_name: me.name,
      meta_user_access_token: long.access_token,
      meta_token_expires_at: expiresAt.toISOString(),
      meta_page_id: pageId,
      meta_page_name: pageName,
      meta_page_access_token: pageAccessToken,
      meta_ig_user_id: igUserId,
      meta_ig_username: igUsername,
      meta_ad_account_id: adAccountId,
      meta_scopes: META_SCOPES.join(','),
    }).eq('id', state.siteId).eq('user_id', user.id)

    return NextResponse.redirect(`${origin}${state.returnTo || '/sites'}?meta_connected=1`)
  } catch (err: any) {
    return NextResponse.redirect(`${origin}${state.returnTo || '/sites'}?meta_error=${encodeURIComponent(err.message)}`)
  }
}
