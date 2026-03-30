import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { system, prompt, useSearch, model } = await request.json()
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

    const tools: any[] = useSearch ? [{ type: 'web_search_20250305', name: 'web_search' }] : []

    const message = await client.messages.create({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      ...(tools.length > 0 ? { tools } : {}),
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    return NextResponse.json({ text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
