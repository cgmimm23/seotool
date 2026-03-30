'use client'

import { useState, useRef, useEffect } from 'react'

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

export default function SiteCrawlerPage() {
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState(50)
  const [crawling, setCrawling] = useState(false)
  const [pages, setPages] = useState<PageResult[]>([])
  const [currentUrl, setCurrentUrl] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings' | 'clean'>('all')
  const [sortBy, setSortBy] = useState<'issues' | 'url' | 'status' | 'words'>('issues')
  const [selectedPage, setSelectedPage] = useState<PageResult | null>(null)
  const [aiSummary, setAiSummary] = useState('')
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const stopRef = useRef(false)

  useEffect(() => { loadLastReport() }, [])

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
    setSelectedPage(null)
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

          // Add new internal links to queue
          for (const link of data.page.internalLinks || []) {
            try {
              const linkDomain = new URL(link).hostname
              if (linkDomain === domain && !visited.has(link) && !queue.includes(link)) {
                queue.push(link)
              }
            } catch {}
          }
        }

        // Small delay to be polite to the server
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
    setGeneratingSummary(true)

    const summary = {
      totalPages: pages.length,
      errorPages: pages.filter(p => p.status >= 400).length,
      missingTitles: pages.filter(p => !p.title).length,
      missingDescriptions: pages.filter(p => !p.description).length,
      missingH1: pages.filter(p => !p.h1).length,
      thinContent: pages.filter(p => p.wordCount < 300).length,
      imagesNoAlt: pages.reduce((a, p) => a + p.imagesNoAlt, 0),
      redirects: pages.filter(p => p.isRedirect).length,
      topIssues: Object.entries(
        pages.flatMap(p => p.issues).reduce((a: any, i) => { a[i] = (a[i] || 0) + 1; return a }, {})
      ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5),
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'You are a technical SEO expert. Analyze the crawl data and provide a concise 3-4 sentence executive summary of the site\'s SEO health, the most critical issues to fix first, and the expected impact of fixing them. Be specific and actionable.',
          prompt: `Site crawl results for ${url}:\n${JSON.stringify(summary, null, 2)}\n\nProvide an executive SEO summary.`,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const text = data.text || ''
      setAiSummary(text)
      saveCrawlReport(pages, url, text)
    } catch (err: any) { setError(err.message) }
    finally { setGeneratingSummary(false) }
  }

  function exportCSV() {
    const rows = [
      ['URL', 'Status', 'Title', 'Description', 'H1', 'H2s', 'Words', 'Images', 'Images No Alt', 'Load Time (ms)', 'Issues'],
      ...pages.map(p => [
        p.url, p.status, p.title || '', p.description || '', p.h1 || '',
        p.h2Count, p.wordCount, p.images, p.imagesNoAlt, p.loadTime,
        p.issues.join(' | ')
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `crawl-${new URL(url.startsWith('http') ? url : 'https://' + url).hostname}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const totalIssues = pages.reduce((a, p) => a + p.issues.length, 0)
  const errorPages = pages.filter(p => p.status >= 400).length
  const warningPages = pages.filter(p => p.issues.length > 0 && p.status < 400).length
  const cleanPages = pages.filter(p => p.issues.length === 0 && p.status < 400).length
  const progress = Math.round((pages.length / maxPages) * 100)

  const issueMap: Record<string, number> = {}
  pages.forEach(p => p.issues.forEach(i => { issueMap[i] = (issueMap[i] || 0) + 1 }))
  const topIssues = Object.entries(issueMap).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const sorted = [...pages].sort((a, b) => {
    if (sortBy === 'issues') return b.issues.length - a.issues.length
    if (sortBy === 'status') return b.status - a.status
    if (sortBy === 'words') return a.wordCount - b.wordCount
    return a.url.localeCompare(b.url)
  })

  const filtered = sorted.filter(p => {
    if (filter === 'errors') return p.status >= 400
    if (filter === 'warnings') return p.issues.length > 0 && p.status < 400
    if (filter === 'clean') return p.issues.length === 0 && p.status < 400
    return true
  })

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  function scoreColor(n: number, invert = false) {
    if (invert) return n === 0 ? '#00d084' : n < 5 ? '#ffa500' : '#ff4444'
    return n >= 80 ? '#00d084' : n >= 50 ? '#ffa500' : '#ff4444'
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Site Crawler</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Crawl your entire site and find SEO issues — no AI tokens used during crawl</p>
      </div>

      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>Website URL</div>
            <input type="text" className="form-input" placeholder="https://yoursite.com" value={url} onChange={e => setUrl(e.target.value)} disabled={crawling} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>Max Pages</div>
            <select value={maxPages} onChange={e => setMaxPages(+e.target.value)} className="form-input" style={{ width: 'auto' }} disabled={crawling}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>
          {!crawling ? (
            <button className="btn btn-accent" onClick={startCrawl} disabled={!url}>Start Crawl</button>
          ) : (
            <button className="btn btn-ghost" onClick={stopCrawl} style={{ borderColor: '#ff4444', color: '#ff4444' }}>Stop</button>
          )}
          {done && pages.length > 0 && (
            <button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize: '12px' }}>Export CSV</button>
          )}
        </div>

        {crawling && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7a8fa8', marginBottom: '6px', fontFamily: 'Roboto Mono, monospace' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{currentUrl}</span>
              <span>{pages.length} / {maxPages} pages</span>
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
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Pages Crawled', value: pages.length, color: '#0d1b2e' },
              { label: 'Total Issues', value: totalIssues, color: totalIssues > 0 ? '#ff4444' : '#00d084' },
              { label: 'Error Pages', value: errorPages, color: errorPages > 0 ? '#ff4444' : '#00d084' },
              { label: 'Clean Pages', value: cleanPages, color: cleanPages > 0 ? '#00d084' : '#7a8fa8' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          {done && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiSummary ? '1rem' : '0' }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>AI Site Health Summary</div>
                <button onClick={generateAISummary} disabled={generatingSummary} className="btn btn-accent" style={{ fontSize: '12px' }}>
                  {generatingSummary ? 'Analyzing...' : aiSummary ? 'Regenerate' : 'Generate AI Summary'}
                </button>
              </div>
              {aiSummary && <p style={{ fontSize: '14px', color: '#4a6080', lineHeight: 1.7 }}>{aiSummary}</p>}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Top issues */}
            {topIssues.length > 0 && (
              <div style={card}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top Issues Across Site</div>
                {topIssues.map(([issue, count]) => (
                  <div key={issue} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', color: '#4a6080', flex: 1, paddingRight: '8px' }}>{issue}</div>
                    <span style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,68,68,0.08)', color: '#ff4444', whiteSpace: 'nowrap' }}>{count} pages</span>
                  </div>
                ))}
              </div>
            )}

            {/* Breakdown */}
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Page Breakdown</div>
              {[
                { label: 'Clean', value: cleanPages, color: '#00d084' },
                { label: 'Warnings', value: warningPages, color: '#ffa500' },
                { label: 'Errors (4xx/5xx)', value: errorPages, color: '#ff4444' },
                { label: 'Redirects', value: pages.filter(p => p.isRedirect).length, color: '#7a8fa8' },
                { label: 'Missing Title', value: pages.filter(p => !p.title).length, color: '#ff4444' },
                { label: 'Missing Description', value: pages.filter(p => !p.description).length, color: '#ffa500' },
                { label: 'Thin Content', value: pages.filter(p => p.wordCount < 300).length, color: '#ffa500' },
                { label: 'Images No Alt', value: pages.reduce((a, p) => a + p.imagesNoAlt, 0), color: '#ffa500' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#4a6080' }}>{s.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'Roboto Mono, monospace', color: s.value === 0 ? '#00d084' : s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pages table */}
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

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr>{['URL', 'Status', 'Title', 'Desc', 'H1', 'H2', 'Words', 'Alt', 'Issues'].map(h => (
                    <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filtered.map((page, i) => (
                    <tr key={i} onClick={() => setSelectedPage(selectedPage?.url === page.url ? null : page)} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', background: selectedPage?.url === page.url ? 'rgba(30,144,255,0.03)' : i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                      <td style={{ padding: '0.55rem 0.5rem', fontSize: '11px', fontFamily: 'Roboto Mono, monospace', color: '#1e90ff', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '8px', background: page.status >= 400 ? 'rgba(255,68,68,0.1)' : page.isRedirect ? 'rgba(255,165,0,0.1)' : 'rgba(0,208,132,0.1)', color: page.status >= 400 ? '#ff4444' : page.isRedirect ? '#ffa500' : '#00d084', fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{page.status || 'ERR'}</span>
                      </td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{page.title ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>X</span>}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{page.description ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>X</span>}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{page.h1 ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>X</span>}</td>
                      <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.h2Count === 0 ? '#ffa500' : '#4a6080' }}>{page.h2Count}</td>
                      <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.wordCount < 300 ? '#ffa500' : '#4a6080' }}>{page.wordCount}</td>
                      <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.imagesNoAlt > 0 ? '#ffa500' : '#4a6080' }}>{page.imagesNoAlt}/{page.images}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>
                        {page.issues.length > 0
                          ? <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(255,68,68,0.08)', color: '#ff4444', fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{page.issues.length}</span>
                          : <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Page detail panel */}
          {selectedPage && (
            <div style={{ ...card, borderColor: 'rgba(30,144,255,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Page Details</div>
                <button onClick={() => setSelectedPage(null)} style={{ background: 'none', border: 'none', color: '#7a8fa8', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>x</button>
              </div>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#1e90ff', marginBottom: '1rem', wordBreak: 'break-all' }}>{selectedPage.url}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '1rem' }}>
                {[
                  { label: 'Status', value: selectedPage.status || 'Error', color: selectedPage.status >= 400 ? '#ff4444' : '#00d084' },
                  { label: 'Words', value: selectedPage.wordCount, color: selectedPage.wordCount < 300 ? '#ffa500' : '#00d084' },
                  { label: 'Load Time', value: selectedPage.loadTime + 'ms', color: '#0d1b2e' },
                  { label: 'Images', value: `${selectedPage.imagesNoAlt} no alt / ${selectedPage.images}`, color: selectedPage.imagesNoAlt > 0 ? '#ffa500' : '#00d084' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', marginBottom: '3px' }}>{s.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
                {selectedPage.title && <div style={{ fontSize: '12px' }}><span style={{ color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>TITLE: </span><span style={{ color: '#0d1b2e' }}>{selectedPage.title}</span></div>}
                {selectedPage.description && <div style={{ fontSize: '12px' }}><span style={{ color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>DESC: </span><span style={{ color: '#0d1b2e' }}>{selectedPage.description}</span></div>}
                {selectedPage.h1 && <div style={{ fontSize: '12px' }}><span style={{ color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>H1: </span><span style={{ color: '#0d1b2e' }}>{selectedPage.h1}</span></div>}
                {selectedPage.canonical && <div style={{ fontSize: '12px' }}><span style={{ color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>CANONICAL: </span><span style={{ color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{selectedPage.canonical}</span></div>}
              </div>
              {selectedPage.issues.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace', marginBottom: '6px' }}>Issues ({selectedPage.issues.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedPage.issues.map((issue, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', padding: '6px 10px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.1)', borderRadius: '6px' }}>
                        <span style={{ color: '#ff4444', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>!</span>
                        <span style={{ fontSize: '13px', color: '#4a6080' }}>{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!crawling && pages.length === 0 && !error && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '8px' }}>Enter a URL and click Start Crawl</div>
          <div style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '4px' }}>Crawls pages directly — no AI tokens used during crawl</div>
          <div style={{ fontSize: '13px', color: '#7a8fa8' }}>Use AI Summary at the end for site-wide insights with a single API call</div>
        </div>
      )}
    </div>
  )
}
