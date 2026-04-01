import { createServerSupabase } from '@/lib/supabase-server'

export async function getGoogleToken(): Promise<string | null> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get stored tokens
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
