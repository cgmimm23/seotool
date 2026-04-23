import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// POST /api/disavow/bing — push unsynced disavows to Bing Webmaster
// body: { siteId, bingSiteUrl }
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { siteId, bingSiteUrl } = await req.json()
  if (!siteId || !bingSiteUrl) return NextResponse.json({ error: 'siteId and bingSiteUrl required' }, { status: 400 })

  const { data: site } = await supabase.from('sites').select('user_id, bing_api_key').eq('id', siteId).single()
  const s = site as any
  if (!s || s.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!s.bing_api_key) return NextResponse.json({ error: 'No Bing API key for this site' }, { status: 400 })

  const { data: rows } = await supabase.from('disavowed_backlinks')
    .select('*').eq('site_id', siteId).eq('user_id', user.id).eq('synced_to_bing', false)

  const cleanSiteUrl = bingSiteUrl.replace(/\/$/, '')
  const results: any[] = []
  for (const r of rows || []) {
    try {
      const res = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/AddToLinkDisavow?apikey=${s.bing_api_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          siteUrl: cleanSiteUrl,
          disavowedLink: { DisavowedLinkType: r.scope === 'domain' ? 1 : 0, Value: r.target },
        }),
      })
      if (res.ok) {
        await supabase.from('disavowed_backlinks').update({ synced_to_bing: true }).eq('id', r.id)
        results.push({ id: r.id, target: r.target, success: true })
      } else {
        const err = await res.text()
        results.push({ id: r.id, target: r.target, success: false, error: err })
      }
    } catch (e: any) {
      results.push({ id: r.id, target: r.target, success: false, error: e.message })
    }
  }

  return NextResponse.json({ synced: results.filter(r => r.success).length, total: results.length, results })
}
