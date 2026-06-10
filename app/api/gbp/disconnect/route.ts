import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { siteId } = await request.json().catch(() => ({ siteId: null }))

    let tokenToRevoke: string | null = null

    if (siteId) {
      // Scope by owner: only the site's owner may disconnect its token.
      const site = await prisma.sites.findFirst({
        where: { id: siteId, user_id: user.id },
        select: { google_access_token: true },
      })
      if (site) {
        tokenToRevoke = site.google_access_token
        await prisma.sites.updateMany({
          where: { id: siteId, user_id: user.id },
          data: {
            google_email: null,
            google_access_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
          },
        })
      }
    } else {
      const profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { google_access_token: true },
      })
      tokenToRevoke = profile?.google_access_token || null
      await prisma.profiles.update({
        where: { id: user.id },
        data: {
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
        },
      })
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
