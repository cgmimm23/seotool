import { requireEnterprise } from '@/lib/enterprise'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const settings = await prisma.white_label_settings.findUnique({
    where: { user_id: auth.user!.id },
  })

  return NextResponse.json({ settings: settings || null })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { company_name, logo_url, primary_color, secondary_color, footer_text } = await req.json()

  const settings = await prisma.white_label_settings.upsert({
    where: { user_id: auth.user!.id },
    create: {
      user_id: auth.user!.id,
      company_name: company_name || '',
      logo_url: logo_url || null,
      primary_color: primary_color || '#2367a0',
      secondary_color: secondary_color || '#68ccd1',
      footer_text: footer_text || null,
    },
    update: {
      company_name: company_name || '',
      logo_url: logo_url || null,
      primary_color: primary_color || '#2367a0',
      secondary_color: secondary_color || '#68ccd1',
      footer_text: footer_text || null,
      updated_at: new Date(),
    },
  })

  return NextResponse.json({ settings })
}
