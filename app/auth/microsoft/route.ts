import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId') || ''
  const returnTo = searchParams.get('returnTo') || `/sites/${siteId}/bing-webmaster`

  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://seotool-34nk9.ondigitalocean.app'}/auth/microsoft/callback`

  const scopes = [
    'openid',
    'profile',
    'email',
    'offline_access',
    'https://webmaster.bing.com/api.readwrite',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    response_mode: 'query',
    state: JSON.stringify({ siteId, returnTo }),
  })

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`

  return NextResponse.redirect(authUrl)
}
