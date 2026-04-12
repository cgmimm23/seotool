import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, topic, keywords, content, targetLength } = await req.json()

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })

  let prompt = ''

  if (action === 'outline') {
    prompt = `Create a detailed SEO-optimized content outline for the topic: "${topic}"
Target keywords: ${(keywords || []).join(', ') || 'none specified'}
Target length: ${targetLength || 1500} words

Provide:
1. Suggested title tag (under 60 characters)
2. Suggested meta description (under 160 characters)
3. H1 heading
4. Full outline with H2 and H3 headings
5. Key points to cover under each heading
6. Suggested internal/external links
7. Recommended word count per section

Format as a clear, structured outline.`
  } else if (action === 'write') {
    prompt = `Write a fully SEO-optimized article on the topic: "${topic}"
Target keywords: ${(keywords || []).join(', ') || 'none specified'}
Target length: ${targetLength || 1500} words

Requirements:
- Use the primary keyword in the title, first paragraph, and naturally throughout
- Include H2 and H3 headings with keywords where natural
- Write in a clear, engaging, authoritative tone
- Include actionable tips and examples
- End with a conclusion and call to action
- Optimize for readability (short paragraphs, bullet points where appropriate)

Write the full article in HTML format with proper heading tags.`
  } else if (action === 'analyze') {
    prompt = `Analyze this content for SEO quality:

${content?.substring(0, 3000) || 'No content provided'}

Target keywords: ${(keywords || []).join(', ') || 'none specified'}

Score and analyze:
1. Keyword usage (density, placement in headings/first paragraph) — score /10
2. Readability (sentence length, paragraph length, complexity) — score /10
3. Structure (heading hierarchy, use of lists/bullets) — score /10
4. Length (is it comprehensive enough?) — score /10
5. Engagement (hooks, questions, CTAs) — score /10
6. Overall SEO score — /50

Provide specific, actionable improvements for each category.`
  } else {
    return NextResponse.json({ error: 'Invalid action. Use: outline, write, or analyze' }, { status: 400 })
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
  })

  if (!res.ok) return NextResponse.json({ error: 'AI request failed' }, { status: 500 })

  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  return NextResponse.json({ result: text, action })
}
