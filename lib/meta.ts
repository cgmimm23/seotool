import { createServerSupabase } from '@/lib/supabase-server'

export const META_API_VERSION = 'v19.0'
export const META_GRAPH = `https://graph.facebook.com/${META_API_VERSION}`

export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_metadata',
  'ads_read',
  'read_insights',
]

export type MetaSiteTokens = {
  user_id: string | null
  user_name: string | null
  user_access_token: string | null
  token_expires_at: string | null
  page_id: string | null
  page_name: string | null
  page_access_token: string | null
  ig_user_id: string | null
  ig_username: string | null
  ad_account_id: string | null
  scopes: string | null
}

export async function getSiteMeta(siteId: string): Promise<{ site: any; tokens: MetaSiteTokens } | null> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: site } = await supabase
    .from('sites')
    .select('id, user_id, url, name, meta_user_id, meta_user_name, meta_user_access_token, meta_token_expires_at, meta_page_id, meta_page_name, meta_page_access_token, meta_ig_user_id, meta_ig_username, meta_ad_account_id, meta_scopes')
    .eq('id', siteId)
    .single()

  if (!site || site.user_id !== user.id) return null

  return {
    site,
    tokens: {
      user_id: site.meta_user_id,
      user_name: site.meta_user_name,
      user_access_token: site.meta_user_access_token,
      token_expires_at: site.meta_token_expires_at,
      page_id: site.meta_page_id,
      page_name: site.meta_page_name,
      page_access_token: site.meta_page_access_token,
      ig_user_id: site.meta_ig_user_id,
      ig_username: site.meta_ig_username,
      ad_account_id: site.meta_ad_account_id,
      scopes: site.meta_scopes,
    },
  }
}

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() < Date.now() + 5 * 60 * 1000
}

export async function graphFetch(path: string, token: string, params: Record<string, string> = {}): Promise<any> {
  const q = new URLSearchParams({ ...params, access_token: token })
  const url = `${META_GRAPH}${path.startsWith('/') ? path : '/' + path}?${q}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  const data = await res.json()
  if (!res.ok || data.error) {
    const msg = data.error?.message || `Meta API error ${res.status}`
    throw new Error(msg)
  }
  return data
}

// Exchange short-lived user token for long-lived (~60 days)
export async function exchangeForLongLivedUserToken(shortToken: string): Promise<{ access_token: string; expires_in: number }> {
  const q = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID || '',
    client_secret: process.env.META_APP_SECRET || '',
    fb_exchange_token: shortToken,
  })
  const res = await fetch(`${META_GRAPH}/oauth/access_token?${q}`)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Token exchange failed')
  return data
}

// Exchange OAuth code for short-lived user token
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{ access_token: string; expires_in: number }> {
  const q = new URLSearchParams({
    client_id: process.env.META_APP_ID || '',
    client_secret: process.env.META_APP_SECRET || '',
    redirect_uri: redirectUri,
    code,
  })
  const res = await fetch(`${META_GRAPH}/oauth/access_token?${q}`)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Code exchange failed')
  return data
}
