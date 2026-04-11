import { createAdminSupabase } from '@/lib/supabase-admin'
import { buildAgentScript } from '@/lib/agent-script'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
  const supabase = createAdminSupabase()

  const { data: site } = await supabase
    .from('sites')
    .select('id, agent_enabled')
    .eq('id', params.siteId)
    .single()

  if (!site || !site.agent_enabled) {
    return new NextResponse('/* AI SEO Agent: not enabled */', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    })
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.cgmimm.com'
  const script = buildAgentScript(params.siteId, apiBaseUrl)

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=300',
    },
  })
}
