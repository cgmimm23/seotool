import { createServerSupabase } from '@/lib/supabase-server'

export async function getGoogleToken(siteId?: string | null): Promise<string | null> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Prefer site-level token if a siteId is given
  if (siteId) {
    const { data: site } = await supabase
      .from('sites')
      .select('user_id, google_access_token, google_refresh_token, google_token_expires_at')
      .eq('id', siteId)
      .single()

    if (site && site.user_id === user.id && site.google_access_token) {
      const token = await refreshIfNeeded({
        accessToken: site.google_access_token,
        refreshToken: site.google_refresh_token,
        expiresAt: site.google_token_expires_at,
        save: async (access, expires) => {
          await supabase.from('sites')
            .update({ google_access_token: access, google_token_expires_at: expires })
            .eq('id', siteId)
        },
      })
      if (token) return token
    }
  }

  // Fall back to profile-level token
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile?.google_access_token) {
    // Fall back to session token
    const { data: { session } } = await supabase.auth.getSession()
    return session?.provider_token || null
  }

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() + 5 * 60 * 1000 : true

  if (!isExpired) {
    return profile.google_access_token
  }

  // Token expired — try to refresh
  if (!profile.google_refresh_token) {
    // No refresh token, fall back to session
    const { data: { session } } = await supabase.auth.getSession()
    return session?.provider_token || null
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: profile.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!res.ok) {
      // Refresh failed, fall back to session
      const { data: { session } } = await supabase.auth.getSession()
      return session?.provider_token || null
    }

    const tokens = await res.json()
    const newExpiresAt = new Date()
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 3600))

    // Save refreshed token
    await supabase.from('profiles').update({
      google_access_token: tokens.access_token,
      google_token_expires_at: newExpiresAt.toISOString(),
    }).eq('id', user.id)

    return tokens.access_token
  } catch {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.provider_token || null
  }
}

type RefreshArgs = {
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  save: (access: string, expires: string) => Promise<void>
}

async function refreshIfNeeded(args: RefreshArgs): Promise<string | null> {
  const expiresAt = args.expiresAt ? new Date(args.expiresAt) : null
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() + 5 * 60 * 1000 : true
  if (!isExpired) return args.accessToken
  if (!args.refreshToken) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: args.refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return null
    const tokens = await res.json()
    const newExpiresAt = new Date()
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 3600))
    await args.save(tokens.access_token, newExpiresAt.toISOString())
    return tokens.access_token
  } catch {
    return null
  }
}
