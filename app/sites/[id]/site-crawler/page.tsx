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
  const [selectedPage, setSelectedPage] = useState<PageResult | null>(null)
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGeneratingSummary(false)
    }
  }

  const sorted = [...pages].sort((a, b) => {
    if (sortBy === 'issues') return b.issues.length - a.issues.length
    if (sortBy === 'status') return b.status - a.status
    if (sortBy === 'words') return a.wordCount - b.wordCount
    return a.url.localeCompare(b.url)
  })

  const filtered = sorted.filter(p => {
    if (filter === 'errors') return p.status >= 400 || p.issues.length > 2
    if (filter === 'warnings') return p.issues.length > 0 && p.issues.length <= 2
    if (filter === 'clean') return p.issues.length === 0 && p.status < 400
    return true
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
                      <td style={{ padding: '0.55rem 0.5rem' }}><span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '8px', background: page.status >= 400 ? 'rgba(255,68,68,0.1)' : page.isRedirect ? 'rgba(255,165,0,0.1)' : 'rgba(0,208,132,0.1)', color: page.status >= 400 ? '#ff4444' : page.isRedirect ? '#ffa500' : '#00d084', fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{page.status || 'ERR'}</span></td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{page.title ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>X</span>}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{page.description ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>X</span>}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{page.h1 ? <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span> : <span style={{ fontSize: '11px', color: '#ff4444' }}>X</span>}</td>
                      <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.h2Count === 0 ? '#ffa500' : '#4a6080' }}>{page.h2Count}</td>
                      <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.wordCount < 300 ? '#ffa500' : '#4a6080' }}>{page.wordCount}</td>
                      <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: page.imagesNoAlt > 0 ? '#ffa500' : '#4a6080' }}>{page.imagesNoAlt}/{page.images}</td>
                      <td style={{ padding: '0.55rem 0.5rem' }}>{page.issues.length > 0 ? <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(255,68,68,0.08)', color: '#ff4444', fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{page.issues.length}</span> : <span style={{ fontSize: '11px', color: '#00d084' }}>OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedPage && (
            <div style={{ ...card, borderColor: 'rgba(30,144,255,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Page Details</div>
                <button onClick={() => setSelectedPage(null)} style={{ background: 'none', border: 'none', color: '#7a8fa8', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>x</button>
              </div>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#1e90ff', marginBottom: '1rem', wordBreak: 'break-all' }}>{selectedPage.url}</div>
              {selectedPage.issues.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedPage.issues.map((issue, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', padding: '6px 10px', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.1)', borderRadius: '6px' }}>
                      <span style={{ color: '#ff4444', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>!</span>
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
