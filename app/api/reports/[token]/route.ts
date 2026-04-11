import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createAdminSupabase()

  const { data: share, error } = await supabase
    .from('report_shares')
    .select('*, audit_reports(*)')
    .eq('share_token', params.token)
    .single()

  if (error || !share) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Report link expired' }, { status: 410 })
  }

  // Increment view count
  await supabase
    .from('report_shares')
    .update({ view_count: (share.view_count || 0) + 1 })
    .eq('id', share.id)

  // Get white-label settings
  const { data: whiteLabel } = await supabase
    .from('white_label_settings')
    .select('*')
    .eq('user_id', share.user_id)
    .single()

  return NextResponse.json({
    report: share.audit_reports,
    client_name: share.client_name,
    branding: whiteLabel || {
      company_name: 'SEO by CGMIMM',
      primary_color: '#2367a0',
      secondary_color: '#68ccd1',
    },
  })
}
