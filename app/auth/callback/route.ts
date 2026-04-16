import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createServerSupabase()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    // Save Google tokens to profiles so they persist across sessions
    if (data?.session?.user && data.session.provider_token) {
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + (data.session.expires_in || 3600))

      await supabase.from('profiles').upsert({
        id: data.session.user.id,
        google_access_token: data.session.provider_token,
        google_refresh_token: data.session.provider_refresh_token || null,
        google_token_expires_at: expiresAt.toISOString(),
      }, { onConflict: 'id' })
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.cgmimm.com'
  const next = searchParams.get('next')
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  return NextResponse.redirect(`${siteUrl}${safeNext}`)
}
