'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'

interface PageResult {
  url: string
  status: number
  title: string | null
  description: string | null
  h1: string | null
  h2Count: number
  wordCount: number
  canonical: string | null
  images: number
  imagesNoAlt: number
  isRedirect: boolean
  redirectTo: string | null
  loadTime: number
  issues: string[]
  internalLinks: string[]
}

// Fix suggestions for each issue type
const ISSUE_FIXES: Record<string, { title: string; steps: string[] }> = {
  'Missing meta title': {
    title: 'Add a Meta Title',
    steps: ['Open your page in your CMS or HTML editor.', 'Add a <title> tag inside the <head> section: <title>Your Page Title | Brand Name</title>', 'Keep it between 50-60 characters.', 'Include your primary keyword near the beginning.'],
  },
  'Meta title too short': {
    title: 'Expand Your Meta Title',
    steps: ['Edit your <title> tag to be at least 30 characters.', 'Add your primary keyword and brand name.', 'Aim for 50-60 characters for best click-through rates.'],
  },
  'Meta title too long': {
    title: 'Shorten Your Meta Title',
    steps: ['Edit your <title> tag to be under 60 characters.', 'Remove filler words and keep only the most important keywords.', 'Use a title length checker tool to verify.'],
  },
  'Missing meta description': {
    title: 'Add a Meta Description',
    steps: ['Add a <meta name="description" content="..."> tag inside <head>.', 'Write a compelling 120-160 character summary of the page.', 'Include your primary keyword naturally.', 'Add a call to action to improve click-through rate.'],
  },
  'Meta description too short': {
    title: 'Expand Your Meta Description',
    steps: ['Edit your meta description to be at least 120 characters.', 'Describe the page content clearly and include your target keyword.', 'Add a call to action like "Learn more" or "Get a free quote".'],
  },
  'Meta description too long': {
    title: 'Shorten Your Meta Description',
    steps: ['Edit your meta description to be under 160 characters.', 'Remove redundant phrases and focus on the key message.', 'Keep your call to action but trim the description.'],
  },
  'H1 not detected in raw HTML': {
    title: 'Verify Your H1 Tag',
    steps: ['Right-click the page and select "View Page Source".', 'Search for <h1 — if found, the H1 is likely rendered by JavaScript which is fine.', 'If not found, add an <h1> tag to your page template with your primary keyword.', 'Every page should have exactly one H1 tag.'],
  },
  'No H2 tags detected': {
    title: 'Add H2 Subheadings',
    steps: ['Break your content into sections using <h2> tags.', 'Each H2 should describe a key subtopic of the page.', 'Include secondary keywords in your H2 tags where natural.', 'Aim for at least 2-3 H2 tags on content pages.'],
  },
  'Thin content': {
    title: 'Expand Page Content',
    steps: ['Add more valuable content to the page — aim for at least 300 words.', 'Cover related subtopics and answer common user questions.', 'Add an FAQ section, how-to steps, or more detailed explanations.', 'Thin content pages rank poorly — more depth means better rankings.'],
  },
  'image': {
    title: 'Fix Missing Alt Text',
    steps: ['Find all <img> tags on the page.', 'Add a descriptive alt attribute: <img src="..." alt="Description of image">.', 'Describe what the image shows — include keywords where natural.', 'Avoid generic alt text like "image" or "photo".'],
  },
  'Unexpected redirect': {
    title: 'Fix Unexpected Redirect',
    steps: ['Check why this URL is redirecting to a different destination.', 'If intentional, update all internal links to point directly to the final URL.', 'If unintentional, fix the redirect in your server configuration or CMS.', 'Redirect chains hurt page speed and dilute link equity.'],
  },
  'Canonical points to different URL': {
    title: 'Fix Canonical Tag',
    steps: ['Review the canonical tag on this page: <link rel="canonical" href="...">.', 'If this is a duplicate page, the canonical should point to the preferred version — this is correct behavior.', 'If this is the main page, update the canonical to point to itself.', 'Make sure the canonical URL is the exact URL you want indexed.'],
  },
  '404': {
    title: 'Fix 404 Error',
    steps: ['This page returns a 404 — it either never existed or was deleted.', 'If the page was moved, set up a 301 redirect from this URL to the new location.', 'If the page should exist, recreate it or restore it from backup.', 'Update any internal links pointing to this broken URL.'],
  },
  '500': {
    title: 'Fix Server Error',
    steps: ['This page is returning a 500 server error.', 'Check your server error logs for details.', 'Common causes: database connection issues, broken PHP/JS, misconfigured server.', 'Contact your hosting provider if you cannot identify the cause.'],
  },
}

function getFixForIssue(issue: string): { title: string; steps: string[] } {
  for (const [key, fix] of Object.entries(ISSUE_FIXES)) {
    if (issue.toLowerCase().includes(key.toLowerCase())) return fix
  }
  return {
    title: 'How to Fix',
    steps: ['Review the issue description carefully.', 'Check your CMS or HTML source for the relevant element.', 'Make the necessary changes and re-crawl to verify the fix.'],
  }
}

function SiteCrawlerPageInner({ params }: { params: { id: string } }) {
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState(50)
  const [crawling, setCrawling] = useState(false)
  const [pages, setPages] = useState<PageResult[]>([])
  const [currentUrl, setCurrentUrl] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings' | 'clean'>('all')
  const [sortBy, setSortBy] = useState<'issues' | 'url' | 'status' | 'words'>('issues')
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null)
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState('')
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const stopRef = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sites').select('url').eq('id', params.id).single()
      if (data?.url) setUrl(data.url)
      loadLastReport()
    }
    load()
  }, [params.id])

  async function loadLastReport() {
    try {
      const res = await fetch('/api/crawl-report?full=true')
      const data = await res.json()
      if (data.reports?.[0]?.pages?.length > 0) {
        const r = data.reports[0]
        setPages(r.pages)
        setUrl(r.url)
        setAiSummary(r.summary || '')
        setDone(true)
      }
    } catch {}
  }

  async function saveCrawlReport(crawledPages: any[], crawlUrl: string, summary: string) {
    try {
      await fetch('/api/crawl-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: crawlUrl, pages: crawledPages, summary }),
      })
    } catch {}
  }

  async function startCrawl() {
    if (!url) return
    const baseUrl = url.startsWith('http') ? url.replace(/\/$/, '') : 'https://' + url.replace(/\/$/, '')
    setCrawling(true)
    setDone(false)
    setPages([])
    setError('')
    setExpandedUrl(null)
    setAiSummary('')
    stopRef.current = false

    const visited = new Set<string>()
    const queue = [baseUrl]
    const results: PageResult[] = []

    try {
      const domain = new URL(baseUrl).hostname
      while (queue.length > 0 && results.length < maxPages && !stopRef.current) {
        const pageUrl = queue.shift()!
        if (visited.has(pageUrl)) continue
        visited.add(pageUrl)
        setCurrentUrl(pageUrl)

        const res = await fetch('/api/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: pageUrl }),
        })

        const data = await res.json()
        if (data.page) {
          results.push(data.page)
          setPages([...results])
          for (const link of data.page.internalLinks || []) {
            try {
              const linkDomain = new URL(link).hostname
              if (linkDomain === domain && !visited.has(link) && !queue.includes(link)) queue.push(link)
            } catch {}
          }
        }
        await new Promise(r => setTimeout(r, 300))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCrawling(false)
      setDone(true)
      setCurrentUrl('')
      saveCrawlReport(results, baseUrl, '')
    }
  }

  function stopCrawl() {
    stopRef.current = true
    setCrawling(false)
    setDone(true)
    setCurrentUrl('')
  }

  async function generateAISummary() {
    if (!pages.length) return
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: 'You are an SEO expert. Analyze crawl data and give a concise 3-5 sentence summary of the site\'s SEO health, top issues, and priorities. Plain text only.',
          messages: [{ role: 'user', content: `Crawl results for ${url}: ${pages.length} pages crawled. Issues: ${pages.filter(p => p.issues.length > 0).length} pages with problems. Missing titles: ${pages.filter(p => !p.title).length}. Missing descriptions: ${pages.filter(p => !p.description).length}. Thin content (<300 words): ${pages.filter(p => p.wordCount < 300).length}. Error pages: ${pages.filter(p => p.status >= 400).length}.` }],
        }),
      })
      const data = await res.json()
      const text = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''
      setAiSummary(text)
      saveCrawlReport(pages, url, text)
    } catch (err: any) { setError(err.message) }
    finally { setGeneratingSummary(false) }
  }

  const filtered = pages.filter(p => {
    if (filter === 'errors') return p.status >= 400
    if (filter === 'warnings') return p.issues.length > 0 && p.status < 400
    if (filter === 'clean') return p.issues.length === 0 && p.status < 400
    return true
  }).sort((a, b) => {
    if (sortBy === 'issues') return b.issues.length - a.issues.length
    if (sortBy === 'status') return b.status - a.status
    if (sortBy === 'words') return a.wordCount - b.wordCount
    return a.url.localeCompare(b.url)
  })

  const errorPages = pages.filter(p => p.status >= 400).length
  const warningPages = pages.filter(p => p.issues.length > 0 && p.status < 400).length
  const cleanPages = pages.filter(p => p.issues.length === 0 && p.status < 400).length
  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Site Crawler</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Crawl every page and find SEO issues automatically</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input type="text" className="form-input" placeholder="https://yoursite.com" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} />
          <select value={maxPages} onChange={e => setMaxPages(+e.target.value)} className="form-input" style={{ width: 'auto' }}>
            {[10, 25, 50, 100, 250].map(n => <option key={n} value={n}>{n} pages</option>)}
          </select>
          {!crawling
            ? <button className="btn btn-accent" onClick={startCrawl} disabled={!url}>Start Crawl</button>
            : <button className="btn btn-ghost" onClick={stopCrawl}>Stop</button>
          }
        </div>
        {crawling && <div style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Crawling: {currentUrl} ({pages.length} pages found)</div>}
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {pages.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Pages Crawled', value: pages.length, color: '#0d1b2e' },
              { label: 'Errors', value: errorPages, color: '#ff4444' },
              { label: 'Warnings', value: warningPages, color: '#ffa500' },
              { label: 'Clean', value: cleanPages, color: '#00d084' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {done && !aiSummary && (
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', color: '#4a6080' }}>Generate an AI summary of this crawl</div>
              <button className="btn btn-accent" onClick={generateAISummary} disabled={generatingSummary} style={{ fontSize: '12px' }}>
                {generatingSummary ? 'Generating...' : 'AI Summary'}
              </button>
            </div>
          )}

          {aiSummary && (
            <div style={{ ...card, borderColor: 'rgba(30,144,255,0.2)', background: 'rgba(30,144,255,0.03)' }}>
              <div style={{ fontSize: '11px', color: '#1e90ff', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>AI Summary</div>
              <p style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.7 }}>{aiSummary}</p>
            </div>
          )}

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>All Pages ({filtered.length})</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(['all', 'errors', 'warnings', 'clean'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${filter === f ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: filter === f ? 'rgba(30,144,255,0.08)' : 'transparent', color: filter === f ? '#1e90ff' : '#7a8fa8', fontFamily: 'Open Sans, sans-serif', textTransform: 'capitalize' }}>{f}</button>
                ))}
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#f8f9fb', color: '#4a6080', fontFamily: 'Open Sans, sans-serif' }}>
                  <option value="issues">Sort: Issues</option>
                  <option value="status">Sort: Status</option>
                  <option value="words">Sort: Word count</option>
                  <option value="url">Sort: URL</option>
                </select>
              </div>
            </div>

            {/* Accordion rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 50px 50px 50px 50px 60px 60px 60px', gap: '8px', padding: '0.4rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#f8f9fb', borderRadius: '8px 8px 0 0' }}>
                {['URL', 'Status', 'Title', 'Desc', 'H1', 'H2', 'Words', 'Alt', 'Issues'].map(h => (
                  <div key={h} style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
                ))}
              </div>

              {filtered.map((page, i) => {
                const isExpanded = expandedUrl === page.url
                return (
                  <div key={i}>
                    {/* Row */}
                    <div
                      onClick={() => setExpandedUrl(isExpanded ? null : page.url)}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 60px 50px 50px 50px 50px 60px 60px 60px', gap: '8px', alignItems: 'center', padding: '0.6rem 0.75rem', borderBottom: isExpanded ? 'none' : '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', background: isExpanded ? 'rgba(30,144,255,0.04)' : i % 2 === 0 ? 'transparent' : '#fafbfc', borderLeft: isExpanded ? '3px solid #1e90ff' : '3px solid transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontSize: '13px', color: isExpanded ? '#1e90ff' : '#7a8fa8', flexShrink: 0 }}>{isExpanded ? '▼' : '▶'}</span>
                        <span style={{ fontSize: '11px', fontFamily: 'Roboto Mono, monospace', color: '#1e90ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</span>
                      </div>
                      <div><span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '8px', background: page.status >= 400 ? 'rgba(255,68,68,0.1)' : page.isRedirect ? 'rgba(255,165,0,0.1)' : 'rgba(0,208,132,0.1)', color: page.status >= 400 ? '#ff4444' : page.isRedirect ? '#ffa500' : '#00d084', fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{page.status || 'ERR'}</span></div>
                      <div>{page.title ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>✕</span>}</div>
                      <div>{page.description ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>✕</span>}</div>
                      <div>{page.h1 ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ffa500' }}>?</span>}</div>
                      <div style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.h2Count === 0 ? '#ffa500' : '#4a6080' }}>{page.h2Count}</div>
                      <div style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.wordCount < 300 ? '#ffa500' : '#4a6080' }}>{page.wordCount}</div>
                      <div style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.imagesNoAlt > 0 ? '#ffa500' : '#4a6080' }}>{page.imagesNoAlt}/{page.images}</div>
                      <div>{page.issues.length > 0 ? <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(255,68,68,0.08)', color: '#ff4444', fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{page.issues.length}</span> : <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span>}</div>
                    </div>

                    {/* Accordion content */}
                    {isExpanded && (
                      <div style={{ background: 'rgba(30,144,255,0.02)', borderLeft: '3px solid #1e90ff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '1rem 1.25rem' }}>
                        <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#1e90ff', marginBottom: '0.75rem', wordBreak: 'break-all' }}>{page.url}</div>

                        {page.issues.length === 0 ? (
                          <div style={{ fontSize: '13px', color: '#00d084' }}>✓ No issues found on this page.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {page.issues.map((issue, j) => {
                              const fix = getFixForIssue(issue)
                              const issueKey = `${page.url}:${j}`
                              const isFixOpen = expandedIssue === issueKey
                              return (
                                <div key={j} style={{ borderRadius: '8px', border: '1px solid rgba(255,68,68,0.15)', overflow: 'hidden' }}>
                                  {/* Issue header */}
                                  <div
                                    onClick={() => setExpandedIssue(isFixOpen ? null : issueKey)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,68,68,0.04)', cursor: 'pointer' }}
                                  >
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <span style={{ color: '#ff4444', fontSize: '11px', fontWeight: 700 }}>!</span>
                                      <span style={{ fontSize: '13px', color: '#4a6080' }}>{issue}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '11px', color: '#1e90ff', fontFamily: 'Open Sans, sans-serif', whiteSpace: 'nowrap' }}>{isFixOpen ? 'Hide fix ▲' : 'How to fix ▼'}</span>
                                    </div>
                                  </div>

                                  {/* Fix steps */}
                                  {isFixOpen && (
                                    <div style={{ padding: '12px 14px', background: '#fff', borderTop: '1px solid rgba(30,144,255,0.1)' }}>
                                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e', marginBottom: '8px', fontFamily: 'Montserrat, sans-serif' }}>{fix.title}</div>
                                      <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {fix.steps.map((step, k) => (
                                          <li key={k} style={{ fontSize: '12px', color: '#4a6080', lineHeight: 1.6 }}>{step}</li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Page metadata */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginTop: '12px' }}>
                          {[
                            { label: 'Title', value: page.title || 'Missing' },
                            { label: 'Description', value: page.description ? page.description.substring(0, 80) + (page.description.length > 80 ? '...' : '') : 'Missing' },
                            { label: 'H1', value: page.h1 || 'Not detected' },
                            { label: 'Load Time', value: `${page.loadTime}ms` },
                            { label: 'Canonical', value: page.canonical ? page.canonical.replace(/^https?:\/\/[^/]+/, '') || '/' : 'None' },
                            { label: 'Word Count', value: `${page.wordCount} words` },
                          ].map(f => (
                            <div key={f.label} style={{ background: '#f8f9fb', borderRadius: '6px', padding: '6px 10px' }}>
                              <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace', marginBottom: '2px' }}>{f.label}</div>
                              <div style={{ fontSize: '12px', color: '#4a6080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {!crawling && pages.length === 0 && !error && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '8px' }}>Enter a URL and click Start Crawl</div>
          <div style={{ fontSize: '13px', color: '#7a8fa8' }}>Crawls pages directly — no AI tokens used during crawl</div>
        </div>
      )}
    </div>
  )
}

export default function SiteCrawlerPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <SiteCrawlerPageInner params={params} />
    </Suspense>
  )
}
