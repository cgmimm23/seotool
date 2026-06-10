import { requireEnterprise } from '@/lib/enterprise'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const data = await prisma.report_shares.findMany({
    where: { user_id: auth.user!.id },
    select: {
      id: true, audit_report_id: true, share_token: true, client_name: true,
      expires_at: true, view_count: true, created_at: true,
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ shares: data })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { audit_report_id, client_name, expires_in_days } = await req.json()
  if (!audit_report_id) return NextResponse.json({ error: 'audit_report_id required' }, { status: 400 })

  // Scope: only allow sharing an audit the caller owns.
  const audit = await prisma.audit_reports.findFirst({
    where: { id: audit_report_id, user_id: auth.user!.id },
    select: { id: true },
  })
  if (!audit) return NextResponse.json({ error: 'Audit report not found' }, { status: 404 })

  const shareToken = crypto.randomBytes(6).toString('hex')
  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400000)
    : null

  const data = await prisma.report_shares.create({
    data: {
      user_id: auth.user!.id,
      audit_report_id,
      share_token: shareToken,
      client_name: client_name || null,
      expires_at: expiresAt,
    },
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.cgmimm.com'
  return NextResponse.json({
    share: data,
    url: `${siteUrl}/reports/${shareToken}`,
  }, { status: 201 })
}
