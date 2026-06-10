import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function getGoogleToken(siteId?: string | null): Promise<string | null> {
  const user = await getUser()
  if (!user) return null

  // Prefer site-level token if a siteId is given
  if (siteId) {
    const site = await prisma.sites.findUnique({
      where: { id: siteId },
      select: {
        user_id: true,
        google_access_token: true,
        google_refresh_token: true,
        google_token_expires_at: true,
      },
    })

    // TENANT SCOPING: only return a site's token to its owner.
    if (site && site.user_id === user.id && site.google_access_token) {
      const token = await refreshIfNeeded({
        accessToken: site.google_access_token,
        refreshToken: site.google_refresh_token,
        expiresAt: site.google_token_expires_at,
        save: async (access, expires) => {
          await prisma.sites.update({
            where: { id: siteId },
            data: { google_access_token: access, google_token_expires_at: expires },
          })
        },
      })
      if (token) return token
    }
  }

  // Fall back to profile-level token
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      google_access_token: true,
      google_refresh_token: true,
      google_token_expires_at: true,
    },
  })

  if (!profile?.google_access_token) {
    // No stored profile token; Supabase session fallback removed.
    return null
  }

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = profile.google_token_expires_at
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() + 5 * 60 * 1000 : true

  if (!isExpired) {
    return profile.google_access_token
  }

  // Token expired — try to refresh
  if (!profile.google_refresh_token) {
    // No refresh token; Supabase session fallback removed.
    return null
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
      // Refresh failed; Supabase session fallback removed.
      return null
    }

    const tokens = await res.json()
    const newExpiresAt = new Date()
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 3600))

    // Save refreshed token
    await prisma.profiles.update({
      where: { id: user.id },
      data: {
        google_access_token: tokens.access_token,
        google_token_expires_at: newExpiresAt,
      },
    })

    return tokens.access_token
  } catch {
    // Refresh threw; Supabase session fallback removed.
    return null
  }
}

type RefreshArgs = {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  save: (access: string, expires: Date) => Promise<void>
}

async function refreshIfNeeded(args: RefreshArgs): Promise<string | null> {
  const expiresAt = args.expiresAt
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
    await args.save(tokens.access_token, newExpiresAt)
    return tokens.access_token
  } catch {
    return null
  }
}
