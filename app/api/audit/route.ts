import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { runSeoAudit } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url, siteId } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    // Run the AI audit
    const audit = await runSeoAudit(url)

    // Save to Supabase
    const { data, error } = await supabase
      .from('audit_reports')
      .insert({
        site_id: siteId,
        user_id: user.id,
        url: audit.url || url,
        overall_score: audit.overall,
        grade: audit.grade,
        summary: audit.summary,
        categories: audit.categories,
        checks: audit.checks,
      })
      .select()
      .single()

    if (error) throw error

    // Update scan schedule
    await supabase.from('scan_schedule').upsert({
      site_id: siteId,
      user_id: user.id,
      last_scanned_at: new Date().toISOString(),
    })

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

    const query = supabase
      .from('audit_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (siteId) query.eq('site_id', siteId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ reports: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
