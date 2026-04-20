'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AIVisibilityPage({ params }: { params: { id: string } }) {
  const [url, setUrl] = useState('')
  const [siteName, setSiteName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [bingSubmitting, setBingSubmitting] = useState(false)
  const [bingResult, setBingResult] = useState<'success' | 'error' | null>(null)
  const [copiedLlms, setCopiedLlms] = useState(false)
  const [copiedRobots, setCopiedRobots] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const supabase = createClient()

  const storageKey = `ai_visibility_${params.id}`

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sites').select('url, name').eq('id', params.id).single()
      if (data?.url) setUrl(data.url)
      if (data?.name) setSiteName(data.name)

      // Load last report from localStorage first (reliable, per-browser)
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.result) setResult(parsed.result)
          if (parsed.lastScanned) setLastScanned(parsed.lastScanned)
        }
      } catch {}

      // Also try Supabase (cross-device history)
      const { data: report } = await supabase
        .from('ai_visibility_reports')
        .select('*')
        .eq('site_id', params.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (report) {
        setLastScanned(report.created_at)
        setResult({
          llms: { exists: report.llms_exists },
          aiTxt: { exists: false },
          robots: { exists: report.robots_exists },
          botStatus: report.bot_status,
          aiAnalysis: {
            overall_score: report.overall_score,
            ai_overview_likelihood: report.ai_overview_likelihood,
            summary: report.summary,
            checks: report.checks,
          },
        })
      }
    }
    load()
  }, [params.id])

  async function analyze() {
    if (!url) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const filesRes = await fetch(`/api/ai-visibility?siteUrl=${encodeURIComponent(url)}`)
      const filesData = await filesRes.json()
      if (filesData.error) throw new Error(filesData.error)
      const { base, llms, aiTxt, robots } = filesData
      const robotsText = robots.content
      const aiBots = [
        // Training-data bots: blocking these is OPTIONAL — it opts your content
        // out of being used to train AI models. Does NOT affect AI search visibility.
        { name: 'GPTBot', company: 'OpenAI', purpose: 'training' },
        { name: 'ClaudeBot', company: 'Anthropic', purpose: 'training' },
        { name: 'anthropic-ai', company: 'Anthropic', purpose: 'training' },
        { name: 'Google-Extended', company: 'Google AI', purpose: 'training' },
        { name: 'Applebot-Extended', company: 'Apple', purpose: 'training' },
        { name: 'cohere-ai', company: 'Cohere', purpose: 'training' },
        { name: 'Bytespider', company: 'ByteDance', purpose: 'training' },
        { name: 'Amazonbot', company: 'Amazon', purpose: 'training' },
        // Search / answer bots: blocking these REMOVES you from AI search results.
        // Should almost always be allowed.
        { name: 'OAI-SearchBot', company: 'OpenAI (ChatGPT Search)', purpose: 'search' },
        { name: 'ChatGPT-User', company: 'OpenAI (ChatGPT browsing)', purpose: 'search' },
        { name: 'PerplexityBot', company: 'Perplexity', purpose: 'search' },
        { name: 'Perplexity-User', company: 'Perplexity (user-triggered)', purpose: 'search' },
        { name: 'Claude-Web', company: 'Anthropic (Claude browsing)', purpose: 'search' },
      ]
      const botStatus = aiBots.map(bot => {
        if (!robotsText) return { ...bot, status: 'unknown' }
        const lower = robotsText.toLowerCase()
        const botLower = bot.name.toLowerCase()
        const hasDisallow = lower.includes(`user-agent: ${botLower}`) && lower.split(`user-agent: ${botLower}`)[1]?.includes('disallow: /')
        if (hasDisallow) return { ...bot, status: 'blocked' }
        if (lower.includes(`user-agent: ${botLower}`)) return { ...bot, status: 'allowed' }
        return { ...bot, status: 'not mentioned' }
      })
      let aiAnalysis = null
      const aiRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          system: `You are an AI search optimization expert. Analyze the given URL for AI visibility signals. Return ONLY valid JSON, no markdown, no backticks.

IMPORTANT: Treat "blocking training bots" (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, cohere-ai, Bytespider, anthropic-ai, Amazonbot) as a NEUTRAL content-licensing choice — it does NOT hurt AI search visibility. Only flag blocked bots as a problem when they are AI SEARCH bots (OAI-SearchBot, PerplexityBot, ChatGPT-User, Perplexity-User, Claude-Web). Never conflate training-data crawling with search-index crawling in your checks.

Schema:
{
  "overall_score": 72,
  "ai_overview_likelihood": "Medium",
  "summary": "one sentence",
  "checks": [
    { "status": "pass|fail|warn", "title": "", "detail": "" }
  ]
}`,
          messages: [{ role: 'user', content: `Analyze this URL for AI search optimization: ${url}` }],
        }),
      })
      const aiData = await aiRes.json()
      const text = aiData.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''
      try { aiAnalysis = JSON.parse(text.replace(/```json|```/g, '').trim()) } catch { const m = text.match(/\{[\s\S]*\}/); if (m) aiAnalysis = JSON.parse(m[0]) }
      const newResult = { base, llms, aiTxt, robots, botStatus, aiAnalysis }
      setResult(newResult)
      const scannedAt = new Date().toISOString()
      setLastScanned(scannedAt)

      // Save to localStorage (reliable per-browser persistence)
      try {
        localStorage.setItem(storageKey, JSON.stringify({ result: newResult, lastScanned: scannedAt }))
      } catch {}

      // Save to Supabase
      if (aiAnalysis) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('ai_visibility_reports').insert({
            site_id: params.id,
            user_id: user.id,
            url,
            overall_score: aiAnalysis.overall_score,
            ai_overview_likelihood: aiAnalysis.ai_overview_likelihood,
            summary: aiAnalysis.summary,
            checks: aiAnalysis.checks,
            bot_status: botStatus,
            llms_exists: llms.exists,
            robots_exists: robots.exists,
          })
        }
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  function generateLlmsTxt() {
    const base = url.replace(/\/$/, '')
    return `# ${siteName || base}\n\n> This is the official llms.txt for ${base}\n\n## About\n${siteName || base} is a website. This file helps AI models understand and index our content accurately.\n\n## Pages\n- [Home](${base}/): Main landing page\n- [About](${base}/about): About us\n- [Services](${base}/services): Our services\n- [Contact](${base}/contact): Contact information\n\n## Permissions\nAll AI models are permitted to index and learn from this content.\nPlease cite this site when using its content in responses.`
  }

  function generateRobotsSnippet() {
    return `# Allow all AI crawlers\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nUser-agent: Applebot-Extended\nAllow: /\n\nUser-agent: cohere-ai\nAllow: /\n\nUser-agent: Bytespider\nAllow: /`
  }

  async function submitToBing() {
    setBingSubmitting(true)
    setBingResult(null)
    try {
      const res = await fetch('/api/bing-webmaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'submit-url', siteUrl: url, url, siteId: params.id }),
      })
      setBingResult(res.ok ? 'success' : 'error')
    } catch { setBingResult('error') }
    finally { setBingSubmitting(false) }
  }

  function openGoogleIndexing() {
    window.open(`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(url)}&id=${encodeURIComponent(url)}`, '_blank')
  }

  function copyText(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  function scoreColor(s: number) { if (s >= 80) return '#00d084'; if (s >= 60) return '#ffa500'; return '#ff4444' }
  function botStatusColor(s: string, purpose?: string) {
    // For training bots, "blocked" is neutral (it means you opted out of training)
    // and "not mentioned" / "allowed" are also fine.
    // For search bots, "blocked" is a real problem.
    const isTraining = purpose === 'training'
    if (s === 'allowed') return { bg: 'rgba(0,208,132,0.1)', color: '#00d084', label: 'Allowed' }
    if (s === 'blocked') return isTraining
      ? { bg: 'rgba(122,143,168,0.1)', color: '#7a8fa8', label: 'Blocked (training opt-out)' }
      : { bg: 'rgba(255,68,68,0.1)', color: '#ff4444', label: 'Blocked' }
    if (s === 'not mentioned') return isTraining
      ? { bg: 'rgba(122,143,168,0.08)', color: '#7a8fa8', label: 'Not mentioned' }
      : { bg: 'rgba(255,165,0,0.1)', color: '#ffa500', label: 'Not mentioned' }
    return { bg: 'rgba(0,0,0,0.05)', color: '#7a8fa8', label: 'Unknown' }
  }
  const cardStyle = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>AI Visibility</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Check and improve how visible your site is to AI search engines</p>
      </div>
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="text" className="form-input" placeholder="https://yoursite.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()} style={{ flex: 1 }} />
          <button className="btn btn-accent" onClick={analyze} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze'}</button>
          {lastScanned && !loading && (
            <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>
              Last scan: {(() => { const diff = Date.now() - new Date(lastScanned).getTime(); const days = Math.floor(diff / 86400000); const hours = Math.floor(diff / 3600000); return days > 0 ? days + 'd ago' : hours > 0 ? hours + 'h ago' : 'Just now' })()}
            </span>
          )}
        </div>
      </div>
      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      {loading && <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px' }}>Checking AI visibility signals for {url}...</div>}
      {result && (
        <>
          {result.aiAnalysis && (
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: `3px solid ${scoreColor(result.aiAnalysis.overall_score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(result.aiAnalysis.overall_score), lineHeight: 1 }}>{result.aiAnalysis.overall_score}</span>
                <span style={{ fontSize: '9px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginTop: '2px' }}>AI SCORE</span>
              </div>
              <div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 600, marginBottom: '4px' }}>{result.aiAnalysis.summary}</div>
                <div style={{ fontSize: '13px', color: '#7a8fa8' }}>AI Overview likelihood: <span style={{ fontWeight: 600, color: result.aiAnalysis.ai_overview_likelihood === 'High' ? '#00d084' : result.aiAnalysis.ai_overview_likelihood === 'Medium' ? '#ffa500' : '#ff4444' }}>{result.aiAnalysis.ai_overview_likelihood}</span></div>
              </div>
            </div>
          )}
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>AI Crawler Files</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { file: 'llms.txt', exists: result.llms.exists, desc: result.llms.exists ? 'Found — helps AI models understand your site content' : 'Not found — create /llms.txt to guide AI crawlers', content: result.llms.content, learnMore: 'https://llmstxt.org' },
                { file: 'ai.txt', exists: result.aiTxt.exists, desc: result.aiTxt.exists ? 'Found — AI permissions file present' : 'Not found — optional file for AI crawler permissions', content: null, learnMore: null },
                { file: 'robots.txt', exists: result.robots.exists, desc: result.robots.exists ? 'Found — check AI bot rules below' : 'Not found — robots.txt is missing', content: null, learnMore: null },
              ].map(f => (
                <div key={f.file} style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', background: '#f8f9fb', alignItems: 'flex-start' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: f.exists ? 'rgba(0,208,132,0.1)' : 'rgba(255,68,68,0.1)', color: f.exists ? '#00d084' : '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>{f.exists ? 'OK' : 'X'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'Roboto Mono, monospace', color: '#0d1b2e' }}>/{f.file}</span>
                      {f.learnMore && <a href={f.learnMore} target="_blank" style={{ fontSize: '11px', color: '#1e90ff', textDecoration: 'none' }}>learn more</a>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px' }}>{f.desc}</div>
                    {f.content && <pre style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '6px', padding: '0.5rem', fontSize: '10px', fontFamily: 'Roboto Mono, monospace', color: '#4a6080', marginTop: '6px', maxHeight: '80px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{f.content.substring(0, 400)}{f.content.length > 400 ? '...' : ''}</pre>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Search / Answer bots — blocking these hurts AI search visibility */}
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>AI Search & Answer Bots</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '1rem', lineHeight: 1.5 }}>
              These bots power AI search results (ChatGPT Search, Perplexity, Claude browsing). Blocking them removes you from AI answers. <strong style={{ color: '#0d1b2e' }}>Should almost always be Allowed or Not mentioned.</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {result.botStatus.filter((b: any) => b.purpose === 'search').map((bot: any) => {
                const s = botStatusColor(bot.status, bot.purpose)
                return (
                  <div key={bot.name} style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e', fontFamily: 'Roboto Mono, monospace' }}>{bot.name}</div>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '6px' }}>{bot.company}</div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: s.bg, color: s.color, fontFamily: 'Roboto Mono, monospace' }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Training bots — blocking is a choice, not a problem */}
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>AI Training Bots</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '1rem', lineHeight: 1.5 }}>
              These bots collect content to train AI models (not for search). Blocking them <strong style={{ color: '#0d1b2e' }}>does NOT affect AI search visibility</strong> — it only opts your content out of being used as training data. Cloudflare users can toggle this on in one click under <strong style={{ color: '#0d1b2e' }}>Security → Bots → Block AI Scrapers</strong>.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {result.botStatus.filter((b: any) => b.purpose === 'training').map((bot: any) => {
                const s = botStatusColor(bot.status, bot.purpose)
                return (
                  <div key={bot.name} style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e', fontFamily: 'Roboto Mono, monospace' }}>{bot.name}</div>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '6px' }}>{bot.company}</div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: s.bg, color: s.color, fontFamily: 'Roboto Mono, monospace' }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
            {!result.robots.exists && <div style={{ fontSize: '12px', color: '#ffa500', marginTop: '8px' }}>! No robots.txt found — AI bots will use default crawl behavior</div>}
          </div>
          {result.aiAnalysis?.checks?.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>AI Optimization Checks</div>
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

          {/* Submit to AI Section */}
          <div style={{ ...cardStyle, border: '1px solid rgba(30,144,255,0.2)', background: 'rgba(30,144,255,0.02)' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 700, marginBottom: '4px', color: '#0d1b2e' }}>Submit to AI Search Engines</div>
            <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1.25rem', lineHeight: 1.6 }}>Complete these steps to maximize your site's visibility to AI crawlers and search engines.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Step 1 llms.txt */}
              <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: result.llms.exists ? 'rgba(0,208,132,0.1)' : 'rgba(30,144,255,0.1)', color: result.llms.exists ? '#00d084' : '#1e90ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{result.llms.exists ? '✓' : '1'}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>Add llms.txt to your site</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa8' }}>Tells AI models what your site is about and how to use it</div>
                    </div>
                  </div>
                  <button onClick={() => copyText(generateLlmsTxt(), setCopiedLlms)} style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(30,144,255,0.3)', background: 'rgba(30,144,255,0.06)', color: '#1e90ff', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', whiteSpace: 'nowrap' }}>
                    {copiedLlms ? '✓ Copied!' : 'Copy llms.txt'}
                  </button>
                </div>
                <pre style={{ background: '#f8f9fb', borderRadius: '6px', padding: '0.75rem', fontSize: '10px', fontFamily: 'Roboto Mono, monospace', color: '#4a6080', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap', margin: 0 }}>{generateLlmsTxt()}</pre>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '6px' }}>Copy this, create a file called <code style={{ background: '#f0f4f8', padding: '1px 4px', borderRadius: '3px' }}>llms.txt</code> and upload it to your site root.</div>
              </div>

              {/* Step 2 robots.txt */}
              <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(30,144,255,0.1)', color: '#1e90ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>2</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>Allow AI bots in robots.txt</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa8' }}>Add this to your robots.txt to explicitly allow all AI crawlers</div>
                    </div>
                  </div>
                  <button onClick={() => copyText(generateRobotsSnippet(), setCopiedRobots)} style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(30,144,255,0.3)', background: 'rgba(30,144,255,0.06)', color: '#1e90ff', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', whiteSpace: 'nowrap' }}>
                    {copiedRobots ? '✓ Copied!' : 'Copy snippet'}
                  </button>
                </div>
                <pre style={{ background: '#f8f9fb', borderRadius: '6px', padding: '0.75rem', fontSize: '10px', fontFamily: 'Roboto Mono, monospace', color: '#4a6080', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap', margin: 0 }}>{generateRobotsSnippet()}</pre>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '6px' }}>Paste this into your existing robots.txt file on your server.</div>
              </div>

              {/* Step 3 Bing */}
              <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: bingResult === 'success' ? 'rgba(0,208,132,0.1)' : 'rgba(30,144,255,0.1)', color: bingResult === 'success' ? '#00d084' : '#1e90ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{bingResult === 'success' ? '✓' : '3'}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>Submit to Bing / Microsoft Copilot</div>
                    <div style={{ fontSize: '11px', color: '#7a8fa8' }}>Bing powers Copilot and multiple AI engines. <a href="https://www.bing.com/webmasters" target="_blank" style={{ color: '#1e90ff', textDecoration: 'none' }}>Get your API key →</a></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={submitToBing} disabled={bingSubmitting} style={{ padding: '0.5rem 14px', borderRadius: '8px', fontSize: '12px', border: 'none', background: bingResult === 'success' ? '#00d084' : '#1e90ff', color: '#fff', cursor: bingSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'Open Sans, sans-serif', fontWeight: 600, opacity: bingSubmitting ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                    {bingSubmitting ? 'Submitting...' : bingResult === 'success' ? 'Submitted!' : bingResult === 'error' ? 'Try Again' : 'Submit to Bing'}
                  </button>
                  <span style={{ fontSize: '11px', color: '#7a8fa8', alignSelf: 'center' }}>Uses the Bing key connected on this site&apos;s Bing Webmaster tab</span>
                </div>
                {bingResult === 'error' && <div style={{ fontSize: '11px', color: '#ff4444', marginTop: '6px' }}>Submission failed. Check your API key and try again.</div>}
              </div>

              {/* Step 4 Google */}
              <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(30,144,255,0.1)', color: '#1e90ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>4</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>Submit to Google Search Console</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa8' }}>Request indexing — powers Google AI Overviews</div>
                    </div>
                  </div>
                  <button onClick={openGoogleIndexing} style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#4a6080', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Open Google Search Console
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '8px', paddingLeft: '34px' }}>Click the button, paste your URL in the inspection box, and click "Request Indexing".</div>
              </div>

            </div>
          </div>

          {/* Next Steps */}
          <div style={{ ...cardStyle, borderLeft: '3px solid #1e90ff' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>What to do next</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {!result.llms.exists && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', padding: '10px 14px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>Publish /llms.txt</div>
                    <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>Copy the generated llms.txt snippet above and upload it to your site root</div>
                  </div>
                </div>
              )}
              {result.botStatus.filter((b: any) => b.purpose === 'search' && b.status === 'blocked').length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', padding: '10px 14px', background: '#fff4f4', borderRadius: '8px', border: '1px solid rgba(255,68,68,0.2)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#ff4444' }}>Unblock AI search bots in robots.txt</div>
                    <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>You&apos;re blocking search bots (ChatGPT Search, Perplexity). This removes you from AI answers.</div>
                  </div>
                </div>
              )}
              <a href={`/sites/${params.id}/audit`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', padding: '10px 14px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>Run Site Audit for E-E-A-T signals</div>
                    <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>AI engines rank authoritative content higher — the audit checks author bios, schema, and trust signals</div>
                  </div>
                  <span style={{ fontSize: '18px', color: '#1e90ff', userSelect: 'none' }}>→</span>
                </div>
              </a>
              <a href={`/sites/${params.id}/keyword-strategy`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', padding: '10px 14px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>Generate Keyword Strategy</div>
                    <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>AI answers favor clear topical authority — a strategy helps you build that systematically</div>
                  </div>
                  <span style={{ fontSize: '18px', color: '#1e90ff', userSelect: 'none' }}>→</span>
                </div>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
