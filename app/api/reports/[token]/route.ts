import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Public share-link endpoint: resolved by unguessable share_token, no auth
// (intentionally cross-user — anyone with the token may view).
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const share = await prisma.report_shares.findUnique({
    where: { share_token: params.token },
    include: { audit_reports: true },
  })

  if (!share) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Report link expired' }, { status: 410 })
  }

  // Increment view count
  await prisma.report_shares.update({
    where: { id: share.id },
    data: { view_count: (share.view_count || 0) + 1 },
  })

  // Get white-label settings
  const whiteLabel = await prisma.white_label_settings.findUnique({
    where: { user_id: share.user_id },
  })

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
