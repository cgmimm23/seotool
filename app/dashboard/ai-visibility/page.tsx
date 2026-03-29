'use client'

import { useState } from 'react'

export default function AIVisibilityPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function analyze() {
    if (!url) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Parse base URL
      const parsed = new URL(url.startsWith('http') ? url : 'https://' + url)
      const base = `${parsed.protocol}//${parsed.hostname}`

      // Check llms.txt, ai.txt, robots.txt in parallel
      const [llmsRes, aiTxtRes, robotsRes] = await Promise.allSettled([
        fetch(`${base}/llms.txt`),
        fetch(`${base}/ai.txt`),
        fetch(`${base}/robots.txt`),
      ])

      const llmsStatus = llmsRes.status === 'fulfilled' && llmsRes.value.ok
      const llmsContent = llmsStatus ? await llmsRes.value.text() : null

      const aiTxtStatus = aiTxtRes.status === 'fulfilled' && aiTxtRes.value.ok
      const aiTxtContent = aiTxtStatus ? await aiTxtRes.value.text() : null

      const robotsText = robotsRes.status === 'fulfilled' && robotsRes.value.ok
        ? await robotsRes.value.text() : null

      // Parse robots.txt for AI bots
      const aiBots = [
        { name: 'GPTBot', company: 'OpenAI' },
        { name: 'ClaudeBot', company: 'Anthropic' },
        { name: 'PerplexityBot', company: 'Perplexity' },
        { name: 'Google-Extended', company: 'Google AI' },
        { name: 'Applebot-Extended', company: 'Apple' },
        { name: 'cohere-ai', company: 'Cohere' },
        { name: 'Bytespider', company: 'ByteDance' },
      ]

      const botStatus = aiBots.map(bot => {
        if (!robotsText) return { ...bot, status: 'unknown' }
        const lower = robotsText.toLowerCase()
        const botLower = bot.name.toLowerCase()
        const hasDisallow = lower.includes(`user-agent: ${botLower}`) &&
          lower.split(`user-agent: ${botLower}`)[1]?.includes('disallow: /')
        const hasAllow = lower.includes(`user-agent: ${botLower}`) &&
          lower.split(`user-agent: ${botLower}`)[1]?.includes('disallow:') === false
        if (hasDisallow) return { ...bot, status: 'blocked' }
        if (lower.includes(`user-agent: ${botLower}`)) return { ...bot, status: 'allowed' }
        return { ...bot, status: 'not mentioned' }
      })

      // Now use AI to analyze the page content for AI optimization
      const claudeKey = localStorage.getItem('riq_claude_key') ||
        (typeof window !== 'undefined' ? prompt('Enter your Anthropic API key to run AI analysis:') : null)

      let aiAnalysis = null
      if (claudeKey) {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            system: `You are an AI search optimization expert. Analyze the given URL for AI visibility signals. Return ONLY valid JSON, no markdown, no backticks.

Schema:
{
  "overall_score": 72,
  "ai_overview_likelihood": "Medium",
  "summary": "one sentence",
  "checks": [
    { "status": "pass|fail|warn", "title": "", "detail": "" }
  ]
}

Check for: clear entity definition, direct answer format, E-E-A-T signals (author bio, credentials, citations), structured headings with question-based H2s, factual claims with sources, schema markup, clear topical authority, content freshness signals, brand entity mentions, internal linking depth. Score 0-100.`,
            messages: [{ role: 'user', content: `Analyze this URL for AI search optimization: ${url}` }],
          }),
        })
        const aiData = await aiRes.json()
        const text = aiData.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''
        try {
          aiAnalysis = JSON.parse(text.replace(/```json|```/g, '').trim())
        } catch {
          const m = text.match(/\{[\s\S]*\}/)
          if (m) aiAnalysis = JSON.parse(m[0])
        }
      }

      setResult({
        base,
        llms: { exists: llmsStatus, content: llmsContent },
        aiTxt: { exists: aiTxtStatus, content: aiTxtContent },
        robots: { exists: !!robotsText, content: robotsText },
        botStatus,
        aiAnalysis,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function scoreColor(s: number) {
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  function botStatusColor(s: string) {
    if (s === 'allowed') return { bg: 'rgba(0,208,132,0.1)', color: '#00d084', label: 'Allowed' }
    if (s === 'blocked') return { bg: 'rgba(255,68,68,0.1)', color: '#ff4444', label: 'Blocked' }
    if (s === 'not mentioned') return { bg: 'rgba(255,165,0,0.1)', color: '#ffa500', label: 'Not mentioned' }
    return { bg: 'rgba(0,0,0,0.05)', color: '#7a8fa8', label: 'Unknown' }
  }

  const cardStyle = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const sectionTitle = (t: string) => <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>{t}</div>

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>AI Visibility</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Check how visible your site is to AI search engines - ChatGPT, Perplexity, Google AI Overviews</p>
      </div>

      {/* Input */}
      <div style={{ ...cardStyle }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="https://yoursite.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-accent" onClick={analyze} disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '8px' }}>
          Checks llms.txt, ai.txt, robots.txt bot rules, E-E-A-T signals, and AI Overview likelihood
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>
          Checking AI visibility signals for {url}...
        </div>
      )}

      {result && (
        <>
          {/* AI Score */}
          {result.aiAnalysis && (
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: `3px solid ${scoreColor(result.aiAnalysis.overall_score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(result.aiAnalysis.overall_score), lineHeight: 1 }}>{result.aiAnalysis.overall_score}</span>
                <span style={{ fontSize: '9px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginTop: '2px' }}>AI SCORE</span>
              </div>
              <div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 600, marginBottom: '4px' }}>{result.aiAnalysis.summary}</div>
                <div style={{ fontSize: '13px', color: '#7a8fa8' }}>
                  AI Overview likelihood: <span style={{ fontWeight: 600, color: result.aiAnalysis.ai_overview_likelihood === 'High' ? '#00d084' : result.aiAnalysis.ai_overview_likelihood === 'Medium' ? '#ffa500' : '#ff4444' }}>{result.aiAnalysis.ai_overview_likelihood}</span>
                </div>
              </div>
            </div>
          )}

          {/* File checks */}
          <div style={cardStyle}>
            {sectionTitle('AI Crawler Files')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                {
                  file: 'llms.txt',
                  exists: result.llms.exists,
                  desc: result.llms.exists
                    ? 'Found - helps AI models understand your site content'
                    : 'Not found - create /llms.txt to guide AI crawlers',
                  content: result.llms.content,
                  learnMore: 'https://llmstxt.org',
                },
                {
                  file: 'ai.txt',
                  exists: result.aiTxt.exists,
                  desc: result.aiTxt.exists
                    ? 'Found - AI permissions file present'
                    : 'Not found - optional file for AI crawler permissions',
                  content: result.aiTxt.content,
                  learnMore: null,
                },
                {
                  file: 'robots.txt',
                  exists: result.robots.exists,
                  desc: result.robots.exists
                    ? 'Found - check AI bot rules below'
                    : 'Not found - robots.txt is missing',
                  content: null,
                  learnMore: null,
                },
              ].map(f => (
                <div key={f.file} style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', background: '#f8f9fb', alignItems: 'flex-start' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: f.exists ? 'rgba(0,208,132,0.1)' : 'rgba(255,68,68,0.1)', color: f.exists ? '#00d084' : '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>
                    {f.exists ? 'OK' : 'X'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'Roboto Mono, monospace', color: '#0d1b2e' }}>/{f.file}</span>
                      {f.learnMore && <a href={f.learnMore} target="_blank" style={{ fontSize: '11px', color: '#1e90ff', textDecoration: 'none' }}>learn more -></a>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px' }}>{f.desc}</div>
                    {f.content && (
                      <pre style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '6px', padding: '0.5rem', fontSize: '10px', fontFamily: 'Roboto Mono, monospace', color: '#4a6080', marginTop: '6px', maxHeight: '80px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                        {f.content.substring(0, 400)}{f.content.length > 400 ? '...' : ''}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Bot status */}
          <div style={cardStyle}>
            {sectionTitle('AI Bot Access (robots.txt)')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
              {result.botStatus.map((bot: any) => {
                const s = botStatusColor(bot.status)
                return (
                  <div key={bot.name} style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e', fontFamily: 'Roboto Mono, monospace' }}>{bot.name}</div>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '6px' }}>{bot.company}</div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: s.bg, color: s.color, fontFamily: 'Roboto Mono, monospace' }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
            {!result.robots.exists && (
              <div style={{ fontSize: '12px', color: '#ffa500', marginTop: '8px' }}>! No robots.txt found - AI bots will use default crawl behavior</div>
            )}
          </div>

          {/* AI analysis checks */}
          {result.aiAnalysis?.checks?.length > 0 && (
            <div style={cardStyle}>
              {sectionTitle('AI Optimization Checks')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {result.aiAnalysis.checks.map((c: any, i: number) => {
                  const colors: any = { pass: '#00d084', fail: '#ff4444', warn: '#ffa500' }
                  const icons: any = { pass: 'OK', fail: 'X', warn: '!' }
                  const color = colors[c.status] || '#7a8fa8'
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: '10px', alignItems: 'start', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', borderLeft: `2px solid ${color}`, background: '#f8f9fb' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, marginTop: '1px' }}>{icons[c.status]}</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{c.title}</div>
                        <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{c.detail}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* llms.txt generator */}
          {!result.llms.exists && (
            <div style={cardStyle}>
              {sectionTitle('Generate your llms.txt')}
              <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1rem' }}>
                llms.txt is a new standard that helps AI models understand and index your site. Place this file at <code style={{ background: '#f0f4f8', padding: '1px 5px', borderRadius: '3px', fontFamily: 'Roboto Mono, monospace' }}>{result.base}/llms.txt</code>
              </p>
              <pre style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '1rem', fontSize: '11px', fontFamily: 'Roboto Mono, monospace', color: '#0d1b2e', lineHeight: 1.7 }}>
{`# ${result.base}

> This is the official llms.txt for ${result.base}

## About
This site provides SEO tools and digital marketing services.

## Pages
- [Home](${result.base}): Main landing page
- [Dashboard](${result.base}/dashboard): SEO dashboard
- [Audit](${result.base}/dashboard/audit): Site audit tool

## Permissions
All AI models are permitted to index and learn from this content.
Please cite this site when using its content in responses.`}
              </pre>
              <button className="btn btn-ghost" style={{ marginTop: '8px', fontSize: '12px' }} onClick={() => {
                const content = `# ${result.base}\n\n> This is the official llms.txt for ${result.base}\n\n## About\nThis site provides SEO tools and digital marketing services.\n\n## Pages\n- [Home](${result.base}): Main landing page\n\n## Permissions\nAll AI models are permitted to index and learn from this content.`
                navigator.clipboard.writeText(content)
              }}>
                Copy llms.txt
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
