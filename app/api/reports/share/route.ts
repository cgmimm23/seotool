import { requireEnterprise } from '@/lib/enterprise'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('report_shares')
    .select('id, audit_report_id, share_token, client_name, expires_at, view_count, created_at')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ shares: data })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { audit_report_id, client_name, expires_in_days } = await req.json()
  if (!audit_report_id) return NextResponse.json({ error: 'audit_report_id required' }, { status: 400 })

  const shareToken = crypto.randomBytes(6).toString('hex')
  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
    : null

  const { data, error } = await auth.supabase.from('report_shares').insert({
    user_id: auth.user!.id,
    audit_report_id,
    share_token: shareToken,
    client_name: client_name || null,
    expires_at: expiresAt,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.cgmimm.com'
  return NextResponse.json({
    share: data,
    url: `${siteUrl}/reports/${shareToken}`,
  }, { status: 201 })
}
