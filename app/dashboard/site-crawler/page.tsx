'use client'

import { useState } from 'react'

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
}

export default function SiteCrawlerPage() {
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState(50)
  const [crawling, setCrawling] = useState(false)
  const [progress, setProgress] = useState(0)
  const [pages, setPages] = useState<PageResult[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings'>('all')
  const [sortBy, setSortBy] = useState<'url' | 'issues' | 'status'>('issues')
  const [selectedPage, setSelectedPage] = useState<PageResult | null>(null)

  async function startCrawl() {
    if (!url) return
    setCrawling(true)
    setDone(false)
    setPages([])
    setProgress(0)
    setError('')
    setSelectedPage(null)

    const claudeKey = localStorage.getItem('riq_claude_key')
    if (!claudeKey) {
      setError('Add your Anthropic API key in Settings first')
      setCrawling(false)
      return
    }

    try {
      const baseUrl = url.startsWith('http') ? url : 'https://' + url
      const visited = new Set<string>()
      const queue = [baseUrl]
      const results: PageResult[] = []
      let crawled = 0

      while (queue.length > 0 && crawled < maxPages) {
        const pageUrl = queue.shift()!
        if (visited.has(pageUrl)) continue
        visited.add(pageUrl)

        try {
          const start = Date.now()
          const res = await fetch(`https://api.anthropic.com/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': claudeKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 800,
              tools: [{ type: 'web_search_20250305', name: 'web_search' }],
              system: `You are a technical SEO crawler. Fetch the given URL and analyze its SEO. Return ONLY valid JSON, no markdown.
Schema:
{
  "url": "",
  "status": 200,
  "title": "",
  "description": "",
  "h1": "",
  "h2_count": 3,
  "word_count": 450,
  "canonical": "",
  "images_total": 5,
  "images_no_alt": 2,
  "is_redirect": false,
  "redirect_to": null,
  "internal_links": ["https://example.com/about", "https://example.com/contact"],
  "issues": ["Missing meta description", "2 images missing alt text"]
}
Check: HTTP status code, meta title (exists, length 30-60 chars), meta description (exists, length 120-160 chars), H1 (exists, only one), H2 count, word count, canonical tag, images without alt text, redirect (3xx), internal links found on page.`,
              messages: [{ role: 'user', content: `Crawl and analyze this page: ${pageUrl}` }],
            }),
          })

          const data = await res.json()
          const text = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''
          let parsed: any
          try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) }
          catch { const m = text.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]) }

          if (parsed) {
            const loadTime = Date.now() - start
            const pageResult: PageResult = {
              url: parsed.url || pageUrl,
              status: parsed.status || 200,
              title: parsed.title || null,
              description: parsed.description || null,
              h1: parsed.h1 || null,
              h2Count: parsed.h2_count || 0,
              wordCount: parsed.word_count || 0,
              canonical: parsed.canonical || null,
              images: parsed.images_total || 0,
              imagesNoAlt: parsed.images_no_alt || 0,
              isRedirect: parsed.is_redirect || false,
              redirectTo: parsed.redirect_to || null,
              loadTime,
              issues: parsed.issues || [],
            }
            results.push(pageResult)
            setPages([...results])

            // Add new internal links to queue
            const domain = new URL(baseUrl).hostname
            for (const link of parsed.internal_links || []) {
              try {
                const linkUrl = new URL(link)
                if (linkUrl.hostname === domain && !visited.has(link) && !queue.includes(link)) {
                  queue.push(link)
                }
              } catch {}
            }
          }
        } catch {}

        crawled++
        setProgress(Math.round((crawled / Math.min(maxPages, visited.size + queue.length)) * 100))
        await new Promise(r => setTimeout(r, 500))
      }

      setDone(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCrawling(false)
    }
  }

  function issueCount(page: PageResult) { return page.issues.length }

  function pageStatus(page: PageResult) {
    if (page.status >= 400) return 'error'
    if (page.isRedirect || page.issues.length > 0) return 'warning'
    return 'ok'
  }

  const sorted = [...pages].sort((a, b) => {
    if (sortBy === 'issues') return issueCount(b) - issueCount(a)
    if (sortBy === 'status') return b.status - a.status
    return a.url.localeCompare(b.url)
  })

  const filtered = sorted.filter(p => {
    if (filter === 'errors') return p.status >= 400
    if (filter === 'warnings') return p.issues.length > 0 && p.status < 400
    return true
  })

  const totalIssues = pages.reduce((a, p) => a + p.issues.length, 0)
  const errorPages = pages.filter(p => p.status >= 400).length
  const warningPages = pages.filter(p => p.issues.length > 0 && p.status < 400).length
  const cleanPages = pages.filter(p => p.issues.length === 0 && p.status < 400).length

  // Aggregate issues
  const issueMap: Record<string, number> = {}
  pages.forEach(p => p.issues.forEach(i => { issueMap[i] = (issueMap[i] || 0) + 1 }))
  const topIssues = Object.entries(issueMap).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Site Crawler</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Crawl your entire site and find SEO issues across all pages</p>
      </div>

      {/* Input */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>Website URL</div>
            <input type="text" className="form-input" placeholder="https://yoursite.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && !crawling && startCrawl()} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>Max Pages</div>
            <select value={maxPages} onChange={e => setMaxPages(+e.target.value)} className="form-input" style={{ width: 'auto' }}>
              <option value={10}>10 pages</option>
              <option value={25}>25 pages</option>
              <option value={50}>50 pages</option>
              <option value={100}>100 pages</option>
            </select>
          </div>
          <button className="btn btn-accent" onClick={startCrawl} disabled={crawling || !url}>
            {crawling ? 'Crawling...' : 'Start Crawl'}
          </button>
        </div>

        {crawling && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7a8fa8', marginBottom: '6px', fontFamily: 'Roboto Mono, monospace' }}>
              <span>Crawling {pages.length} pages found...</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: '4px', background: '#f0f4f8', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#1e90ff', borderRadius: '2px', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {pages.length > 0 && (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Pages Crawled', value: pages.length, color: '#0d1b2e' },
              { label: 'Total Issues', value: totalIssues, color: totalIssues > 0 ? '#ff4444' : '#00d084' },
              { label: 'Error Pages', value: errorPages, color: errorPages > 0 ? '#ff4444' : '#00d084' },
              { label: 'Clean Pages', value: cleanPages, color: '#00d084' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Top issues */}
            {topIssues.length > 0 && (
              <div style={card}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top Issues Across Site</div>
                {topIssues.map(([issue, count]) => (
                  <div key={issue} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', color: '#4a6080' }}>{issue}</div>
                    <span style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,68,68,0.08)', color: '#ff4444' }}>{count} pages</span>
                  </div>
                ))}
              </div>
            )}

            {/* Status breakdown */}
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Page Status Breakdown</div>
              {[
                { label: 'Clean (no issues)', value: cleanPages, color: '#00d084', pct: Math.round(cleanPages / pages.length * 100) },
                { label: 'Warnings', value: warningPages, color: '#ffa500', pct: Math.round(warningPages / pages.length * 100) },
                { label: 'Errors (4xx/5xx)', value: errorPages, color: '#ff4444', pct: Math.round(errorPages / pages.length * 100) },
                { label: 'Redirects', value: pages.filter(p => p.isRedirect).length, color: '#7a8fa8', pct: Math.round(pages.filter(p => p.isRedirect).length / pages.length * 100) },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ color: '#4a6080' }}>{s.label}</span>
                    <span style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 600, color: s.color }}>{s.value} ({s.pct}%)</span>
                  </div>
                  <div style={{ height: '4px', background: '#f0f4f8', borderRadius: '2px' }}>
                    <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pages table */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>All Pages ({filtered.length})</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['all', 'errors', 'warnings'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${filter === f ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: filter === f ? 'rgba(30,144,255,0.08)' : 'transparent', color: filter === f ? '#1e90ff' : '#7a8fa8', fontFamily: 'Open Sans, sans-serif', textTransform: 'capitalize' }}>{f}</button>
                ))}
                <div style={{ width: '1px', background: 'rgba(0,0,0,0.1)' }} />
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#f8f9fb', color: '#4a6080', fontFamily: 'Open Sans, sans-serif' }}>
                  <option value="issues">Sort by issues</option>
                  <option value="status">Sort by status</option>
                  <option value="url">Sort by URL</option>
                </select>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['URL', 'Status', 'Title', 'Desc', 'H1', 'H2s', 'Words', 'Issues'].map(h => (
                  <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((page, i) => {
                  const status = pageStatus(page)
                  const statusColor = status === 'error' ? '#ff4444' : status === 'warning' ? '#ffa500' : '#00d084'
                  return (
                    <tr key={i} onClick={() => setSelectedPage(selectedPage?.url === page.url ? null : page)} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', background: selectedPage?.url === page.url ? 'rgba(30,144,255,0.03)' : 'transparent' }}>
                      <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: '#1e90ff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '10px', background: `${statusColor}15`, color: statusColor, fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{page.status}</span>
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        {page.title ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>Missing</span>}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        {page.description ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>Missing</span>}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        {page.h1 ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>Missing</span>}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.h2Count === 0 ? '#ffa500' : '#4a6080' }}>{page.h2Count}</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.wordCount < 300 ? '#ffa500' : '#4a6080' }}>{page.wordCount}</td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        {page.issues.length > 0
                          ? <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,68,68,0.08)', color: '#ff4444', fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{page.issues.length}</span>
                          : <span style={{ fontSize: '11px', color: '#00d084' }}>Clean</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Selected page detail */}
          {selectedPage && (
            <div style={{ ...card, borderColor: 'rgba(30,144,255,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Page Details</div>
                <button onClick={() => setSelectedPage(null)} style={{ background: 'none', border: 'none', color: '#7a8fa8', cursor: 'pointer', fontSize: '18px' }}>x</button>
              </div>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#1e90ff', marginBottom: '1rem', wordBreak: 'break-all' }}>{selectedPage.url}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '1rem' }}>
                {[
                  { label: 'HTTP Status', value: selectedPage.status, color: selectedPage.status >= 400 ? '#ff4444' : '#00d084' },
                  { label: 'Word Count', value: selectedPage.wordCount, color: selectedPage.wordCount < 300 ? '#ffa500' : '#00d084' },
                  { label: 'Load Time', value: (selectedPage.loadTime / 1000).toFixed(1) + 's', color: '#0d1b2e' },
                  { label: 'Images', value: selectedPage.images, color: '#0d1b2e' },
                  { label: 'Images No Alt', value: selectedPage.imagesNoAlt, color: selectedPage.imagesNoAlt > 0 ? '#ff4444' : '#00d084' },
                  { label: 'H2 Tags', value: selectedPage.h2Count, color: selectedPage.h2Count === 0 ? '#ffa500' : '#00d084' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', marginBottom: '3px' }}>{s.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {selectedPage.title && <div style={{ marginBottom: '8px' }}><span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>TITLE: </span><span style={{ fontSize: '13px', color: '#0d1b2e' }}>{selectedPage.title}</span></div>}
              {selectedPage.description && <div style={{ marginBottom: '8px' }}><span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>DESC: </span><span style={{ fontSize: '13px', color: '#0d1b2e' }}>{selectedPage.description}</span></div>}
              {selectedPage.h1 && <div style={{ marginBottom: '8px' }}><span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>H1: </span><span style={{ fontSize: '13px', color: '#0d1b2e' }}>{selectedPage.h1}</span></div>}
              {selectedPage.canonical && <div style={{ marginBottom: '12px' }}><span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>CANONICAL: </span><span style={{ fontSize: '12px', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{selectedPage.canonical}</span></div>}
              {selectedPage.isRedirect && <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '8px', fontSize: '12px', color: '#ffa500' }}>Redirects to: {selectedPage.redirectTo}</div>}
              {selectedPage.issues.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace', marginBottom: '6px' }}>Issues ({selectedPage.issues.length})</div>
                  {selectedPage.issues.map((issue, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', padding: '6px 10px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.1)', borderRadius: '6px', marginBottom: '4px' }}>
                      <span style={{ color: '#ff4444', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>!</span>
                      <span style={{ fontSize: '13px', color: '#4a6080' }}>{issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!crawling && pages.length === 0 && !error && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>Enter a URL and click Start Crawl</div>
          <div style={{ fontSize: '13px' }}>The crawler will visit each page and check for SEO issues</div>
        </div>
      )}
    </div>
  )
}
