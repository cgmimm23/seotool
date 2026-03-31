import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteUrl = searchParams.get('siteUrl')

  if (!siteUrl) {
    return NextResponse.json({ error: 'siteUrl required' }, { status: 400 })
  }

  try {
    const parsed = new URL(siteUrl.startsWith('http') ? siteUrl : 'https://' + siteUrl)
    const base = `${parsed.protocol}//${parsed.hostname}`

    const [llmsRes, aiTxtRes, robotsRes] = await Promise.allSettled([
      fetch(`${base}/llms.txt`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${base}/ai.txt`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${base}/robots.txt`, { signal: AbortSignal.timeout(5000) }),
    ])

    const llmsOk = llmsRes.status === 'fulfilled' && llmsRes.value.ok
    const llmsContent = llmsOk ? await llmsRes.value.text() : null

    const aiTxtOk = aiTxtRes.status === 'fulfilled' && aiTxtRes.value.ok
    const aiTxtContent = aiTxtOk ? await aiTxtRes.value.text() : null

    const robotsOk = robotsRes.status === 'fulfilled' && robotsRes.value.ok
    const robotsText = robotsOk ? await robotsRes.value.text() : null

    return NextResponse.json({
      base,
      llms: { exists: llmsOk, content: llmsContent },
      aiTxt: { exists: aiTxtOk, content: aiTxtContent },
      robots: { exists: robotsOk, content: robotsText },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
