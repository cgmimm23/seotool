import { authenticateApiKey } from '@/lib/api-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { siteId: string; fixId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { status, applied_by, plugin_version, error_message } = await req.json()

  if (!status || !['applied', 'failed', 'skipped', 'manual_review'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Must be: applied, failed, skipped, manual_review' }, { status: 400 })
  }

  const supabase = createAdminSupabase()

  // Verify ownership
  const { data: fix } = await supabase
    .from('fix_instructions')
    .select('id, site_id')
    .eq('id', params.fixId)
    .eq('site_id', params.siteId)
    .single()

  if (!fix) return NextResponse.json({ error: 'Fix not found' }, { status: 404 })

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', params.siteId)
    .eq('user_id', auth.userId)
    .single()

  if (!site) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const updates: any = {
    status,
    applied_by: applied_by || null,
    plugin_version: plugin_version || null,
  }

  if (status === 'applied') updates.applied_at = new Date().toISOString()
  if (status === 'failed') updates.error_message = error_message || null

  const { error } = await supabase
    .from('fix_instructions')
    .update(updates)
    .eq('id', params.fixId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
