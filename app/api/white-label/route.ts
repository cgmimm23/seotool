import { requireEnterprise } from '@/lib/enterprise'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { data } = await auth.supabase
    .from('white_label_settings')
    .select('*')
    .eq('user_id', auth.user!.id)
    .single()

  return NextResponse.json({ settings: data || null })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { company_name, logo_url, primary_color, secondary_color, footer_text } = await req.json()

  const { data, error } = await auth.supabase
    .from('white_label_settings')
    .upsert({
      user_id: auth.user!.id,
      company_name: company_name || '',
      logo_url: logo_url || null,
      primary_color: primary_color || '#2367a0',
      secondary_color: secondary_color || '#68ccd1',
      footer_text: footer_text || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ settings: data })
}
