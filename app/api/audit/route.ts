import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { runSeoAudit } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url, siteId, siteType: siteTypeOverride, platform: platformOverride } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    let resolvedSiteId = siteId
    let resolvedSiteType: string | null = siteTypeOverride || null
    let resolvedPlatform: string | null = platformOverride || null
    let resolvedAuditNotes: string | null = null

    if (!resolvedSiteId) {
      const cleanUrl = url.replace(/^https?:\/\//, '').split('/')[0]
      const baseUrl = url.startsWith('http') ? url.split('/').slice(0, 3).join('/') : 'https://' + cleanUrl

      const { data: existing } = await supabase
        .from('sites')
        .select('id, site_type, platform, audit_notes')
        .eq('user_id', user.id)
        .ilike('url', `%${cleanUrl}%`)
        .limit(1)
        .single()

      if (existing) {
        resolvedSiteId = existing.id
        if (!resolvedSiteType) resolvedSiteType = existing.site_type
        if (!resolvedPlatform) resolvedPlatform = existing.platform
        resolvedAuditNotes = existing.audit_notes || null
      } else {
        const { data: newSite } = await supabase
          .from('sites')
          .insert({
            user_id: user.id,
            url: baseUrl,
            name: cleanUrl,
            active: true,
            site_type: resolvedSiteType,
            platform: resolvedPlatform,
          })
          .select()
          .single()
        if (newSite) resolvedSiteId = newSite.id
      }
    } else {
      const { data: siteRow } = await supabase
        .from('sites')
        .select('site_type, platform, audit_notes')
        .eq('id', resolvedSiteId)
        .single()
      if (!resolvedSiteType) resolvedSiteType = siteRow?.site_type || null
      if (!resolvedPlatform) resolvedPlatform = siteRow?.platform || null
      resolvedAuditNotes = siteRow?.audit_notes || null
    }

    // Persist any overrides the caller sent
    if (resolvedSiteId && (siteTypeOverride || platformOverride)) {
      const updates: any = {}
      if (siteTypeOverride) updates.site_type = siteTypeOverride
      if (platformOverride) updates.platform = platformOverride
      await supabase.from('sites').update(updates).eq('id', resolvedSiteId).eq('user_id', user.id)
    }

    const audit = await runSeoAudit(url, resolvedSiteType, resolvedPlatform, resolvedAuditNotes)

    // Save audit report
    const { data, error } = await supabase
      .from('audit_reports')
      .insert({
        site_id: resolvedSiteId,
        user_id: user.id,
        url: audit.url || url,
        overall_score: audit.overall_score,
        grade: audit.grade,
        summary: audit.summary,
        categories: audit.categories,
        checks: audit.checks,
      })
      .select()
      .single()

    if (error) throw error

    // Update scan schedule
    if (resolvedSiteId) {
      await supabase.from('scan_schedule').upsert({
        site_id: resolvedSiteId,
        user_id: user.id,
        last_scanned_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ report: data, audit })
  } catch (err: any) {
    console.error('Audit error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    let query = supabase
      .from('audit_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (siteId) query = query.eq('site_id', siteId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ reports: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
