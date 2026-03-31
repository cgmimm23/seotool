import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateStr = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://seotool-34nk9.ondigitalocean.app'}/dashboard?error=microsoft_auth_failed`)
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://seotool-34nk9.ondigitalocean.app'}/dashboard?error=no_code`)
  }

  let state = { siteId: '', returnTo: '/dashboard' }
  try {
    if (stateStr) state = JSON.parse(stateStr)
  } catch {}

  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://seotool-34nk9.ondigitalocean.app'}/auth/microsoft/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Microsoft token exchange failed:', err)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://seotool-34nk9.ondigitalocean.app'}${state.returnTo}?error=token_exchange_failed`)
    }

    const tokens = await tokenRes.json()

    // Store tokens in a cookie (httpOnly, secure)
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://seotool-34nk9.ondigitalocean.app'}${state.returnTo}?microsoft_connected=true`
    )

    // Store access token and refresh token in cookies
    response.cookies.set('ms_access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      maxAge: tokens.expires_in || 3600,
      path: '/',
      sameSite: 'lax',
    })

    if (tokens.refresh_token) {
      response.cookies.set('ms_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        sameSite: 'lax',
      })
    }

    return response
  } catch (err: any) {
    console.error('Microsoft OAuth error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://seotool-34nk9.ondigitalocean.app'}${state.returnTo}?error=oauth_failed`)
  }
}
