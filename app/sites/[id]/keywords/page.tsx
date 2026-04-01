'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'

type ImportSource = 'gsc' | 'bing' | 'manual'

function KeywordsPageInner({ params }: { params: { id: string } }) {
  const [pages, setPages] = useState<any[]>([])
  const [selectedPage, setSelectedPage] = useState<string>('/')
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [siteUrl, setSiteUrl] = useState('')

  // Import panel state
  const [showImport, setShowImport] = useState(false)
  const [importSource, setImportSource] = useState<ImportSource>('gsc')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [importKeywords, setImportKeywords] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importSearch, setImportSearch] = useState('')
  const [manualImport, setManualImport] = useState('')
  const [gscSiteUrl, setGscSiteUrl] = useState('')
  const [gscSites, setGscSites] = useState<string[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url').eq('id', params.id).single()
      if (site?.url) setSiteUrl(site.url)

      const res = await fetch(`/api/keywords?siteId=${params.id}`)
      const data = await res.json()
      const pageMap: any = {}
      for (const kw of data.keywords || []) {
        if (!pageMap[kw.page_path]) pageMap[kw.page_path] = []
        pageMap[kw.page_path].push(kw.keyword)
      }
      const pageList = Object.keys(pageMap).map(path => ({ path, keywords: pageMap[path] }))
      if (pageList.length === 0) pageList.push({ path: '/', keywords: [] })
      setPages(pageList)
      setSelectedPage(pageList[0].path)
      setKeywords(pageList[0].keywords)
    }
    load()
  }, [params.id])

  // Load GSC sites when import panel opens on GSC tab
  useEffect(() => {
    if (showImport && importSource === 'gsc' && gscSites.length === 0) {
      loadGscSites()
    }
  }, [showImport, importSource])

  async function loadGscSites() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.provider_token) return
      const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { 'Authorization': `Bearer ${session.provider_token}` }
      })
      const data = await res.json()
      const sites = (data.siteEntry || []).map((s: any) => s.siteUrl)
      setGscSites(sites)
      if (sites.length > 0) setGscSiteUrl(sites[0])
    } catch {}
  }

  async function fetchImportKeywords() {
    setImportLoading(true)
    setImportError('')
    setImportKeywords([])
    setSelected(new Set())

    try {
      if (importSource === 'gsc') {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.provider_token) throw new Error('Google not connected. Connect Google in Search Console first.')

        const url = gscSiteUrl || siteUrl
        const res = await fetch(`/api/search-console?siteUrl=${encodeURIComponent(url)}&days=90`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        setImportKeywords((data.keywords || []).map((k: any) => ({
          keyword: k.keyword,
          position: k.position,
          clicks: k.clicks,
          impressions: k.impressions,
          source: 'gsc',
        })))
      }

      if (importSource === 'bing') {
        const res = await fetch(`/api/bing-webmaster?endpoint=keywords&siteUrl=${encodeURIComponent(siteUrl)}`)
        const data = await res.json()
        if (data.error === 'not_connected') throw new Error('Bing not connected. Connect Microsoft in Bing Webmaster first.')
        if (data.error) throw new Error(data.error)

        const rows = data.d?.KeywordStats || data.KeywordStats || []
        setImportKeywords(rows.map((k: any) => ({
          keyword: k.Query,
          position: k.AvgPosition?.toFixed(1),
          clicks: k.Clicks,
          impressions: k.Impressions,
          source: 'bing',
        })))
      }
    } catch (err: any) {
      setImportError(err.message)
    } finally {
      setImportLoading(false)
    }
  }

  function toggleSelect(kw: string) {
    const next = new Set(selected)
    if (next.has(kw)) next.delete(kw)
    else next.add(kw)
    setSelected(next)
  }

  function selectAll() {
    const filtered = importKeywords.filter(k => !importSearch || k.keyword.includes(importSearch.toLowerCase()))
    setSelected(new Set(filtered.map(k => k.keyword)))
  }

  function selectNone() { setSelected(new Set()) }

  async function importSelected() {
    const toImport = Array.from(selected)
    if (!toImport.length) return
    setImporting(true)
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: params.id,
          siteUrl,
          pagePath: selectedPage,
          keywords: Array.from(new Set([...keywords, ...toImport])),
          action: 'save',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const merged = Array.from(new Set([...keywords, ...toImport]))
      setKeywords(merged)
      setPages(prev => {
        const exists = prev.find(p => p.path === selectedPage)
        if (exists) return prev.map(p => p.path === selectedPage ? { ...p, keywords: merged } : p)
        return [...prev, { path: selectedPage, keywords: merged }]
      })
      setShowImport(false)
      setSelected(new Set())
    } catch (err: any) { setImportError(err.message) }
    finally { setImporting(false) }
  }

  function selectPage(path: string) {
    setSelectedPage(path)
    const page = pages.find(p => p.path === path)
    setKeywords(page?.keywords || [])
    setAnalysis(null)
  }

  function addKeyword() {
    const kw = newKeyword.trim().toLowerCase()
    if (!kw || keywords.includes(kw)) return
    setKeywords([...keywords, kw])
    setNewKeyword('')
  }

  function removeKeyword(kw: string) { setKeywords(keywords.filter(k => k !== kw)) }

  async function saveKeywords() {
    if (!keywords.length) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: params.id, siteUrl, pagePath: selectedPage, keywords, action: 'save' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      setPages(prev => {
        const exists = prev.find(p => p.path === selectedPage)
        if (exists) return prev.map(p => p.path === selectedPage ? { ...p, keywords } : p)
        return [...prev, { path: selectedPage, keywords }]
      })
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function analyze() {
    if (!keywords.length) return
    setAnalyzing(true)
    setError('')
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: params.id, siteUrl, pagePath: selectedPage, keywords, action: 'analyze' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAnalysis(data.analysis)
    } catch (err: any) { setError(err.message) }
    finally { setAnalyzing(false) }
  }

  function addPage() {
    const path = prompt('Enter page path (e.g. /pricing)')
    if (!path) return
    const normalized = path.startsWith('/') ? path : '/' + path
    if (pages.find(p => p.path === normalized)) return
    setPages([...pages, { path: normalized, keywords: [] }])
    setSelectedPage(normalized)
    setKeywords([])
    setAnalysis(null)
  }

  function scoreColor(s: number) {
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  function posColor(p: string) {
    const n = parseFloat(p)
    if (n <= 3) return '#00d084'
    if (n <= 10) return '#ffa500'
    return '#ff4444'
  }

  const filteredImport = importKeywords.filter(k =>
    !importSearch || k.keyword.toLowerCase().includes(importSearch.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Page Optimizer</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Optimize every page for your target keywords</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={() => { setShowImport(!showImport); setImportKeywords([]); setImportError('') }} style={{ fontSize: '13px' }}>
            {showImport ? '× Close Import' : '↓ Import Keywords'}
          </button>
          <button className="btn btn-accent" onClick={addPage} style={{ fontSize: '13px' }}>+ Add Page</button>
        </div>
      </div>

      {/* Import Panel */}
      {showImport && (
        <div style={{ background: '#fff', border: '1px solid rgba(30,144,255,0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Import Keywords</div>

          {/* Source tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
            {([
              { key: 'gsc', label: 'Google Search Console' },
              { key: 'bing', label: 'Bing Webmaster' },
              { key: 'manual', label: 'Enter Manually' },
            ] as const).map(s => (
              <button key={s.key} onClick={() => { setImportSource(s.key); setImportKeywords([]); setImportError('') }} style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${importSource === s.key ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: importSource === s.key ? 'rgba(30,144,255,0.08)' : 'transparent', color: importSource === s.key ? '#1e90ff' : '#7a8fa8', fontFamily: 'Open Sans, sans-serif', fontWeight: importSource === s.key ? 600 : 400 }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* GSC site selector */}
          {importSource === 'gsc' && gscSites.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <select value={gscSiteUrl} onChange={e => setGscSiteUrl(e.target.value)} className="form-input" style={{ flex: 1, fontSize: '12px', fontFamily: 'Roboto Mono, monospace' }}>
                {gscSites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={fetchImportKeywords} disabled={importLoading} className="btn btn-accent" style={{ fontSize: '12px' }}>
                {importLoading ? 'Loading...' : 'Fetch Keywords'}
              </button>
            </div>
          )}

          {/* Bing fetch */}
          {importSource === 'bing' && (
            <div style={{ marginBottom: '10px' }}>
              <button onClick={fetchImportKeywords} disabled={importLoading} className="btn btn-accent" style={{ fontSize: '12px' }}>
                {importLoading ? 'Loading...' : 'Fetch from Bing'}
              </button>
            </div>
          )}

          {/* Manual entry */}
          {importSource === 'manual' && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '6px' }}>Enter keywords, one per line</div>
              <textarea
                value={manualImport}
                onChange={e => setManualImport(e.target.value)}
                placeholder="dumpster rental san antonio&#10;roll off dumpster&#10;cheap dumpster rental"
                rows={5}
                style={{ width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Roboto Mono, monospace', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <button
                onClick={() => {
                  const kws = manualImport.split('\n').map(k => k.trim().toLowerCase()).filter(k => k.length > 0)
                  setImportKeywords(kws.map(k => ({ keyword: k, source: 'manual' })))
                  setSelected(new Set(kws))
                }}
                className="btn btn-ghost"
                style={{ fontSize: '12px', marginTop: '8px' }}
              >
                Preview Keywords
              </button>
            </div>
          )}

          {importError && <div style={{ color: '#ff4444', fontSize: '13px', marginBottom: '10px' }}>{importError}</div>}

          {/* Keyword list */}
          {filteredImport.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <input type="text" placeholder="Search keywords..." value={importSearch} onChange={e => setImportSearch(e.target.value)} style={{ flex: 1, background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '12px', outline: 'none', color: '#0d1b2e' }} />
                <button onClick={selectAll} style={{ fontSize: '11px', color: '#1e90ff', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Select All</button>
                <button onClick={selectNone} style={{ fontSize: '11px', color: '#7a8fa8', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Clear</button>
                <span style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{selected.size} selected</span>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', marginBottom: '10px' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 80px 60px 80px', gap: '8px', padding: '6px 10px', background: '#f8f9fb', borderBottom: '1px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0 }}>
                  {['', 'Keyword', 'Position', 'Clicks', 'Impressions'].map(h => (
                    <div key={h} style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
                  ))}
                </div>
                {filteredImport.map((k, i) => (
                  <div key={i} onClick={() => toggleSelect(k.keyword)} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 80px 60px 80px', gap: '8px', alignItems: 'center', padding: '7px 10px', borderBottom: i < filteredImport.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', cursor: 'pointer', background: selected.has(k.keyword) ? 'rgba(30,144,255,0.04)' : 'transparent' }}>
                    <input type="checkbox" checked={selected.has(k.keyword)} onChange={() => toggleSelect(k.keyword)} style={{ cursor: 'pointer' }} onClick={e => e.stopPropagation()} />
                    <div style={{ fontSize: '13px', color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.keyword}</div>
                    <div style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: k.position ? posColor(k.position) : '#7a8fa8' }}>{k.position ? `#${k.position}` : '—'}</div>
                    <div style={{ fontSize: '12px', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{k.clicks?.toLocaleString() || '—'}</div>
                    <div style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{k.impressions?.toLocaleString() || '—'}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#7a8fa8' }}>Import to page:</span>
                <select value={selectedPage} onChange={e => setSelectedPage(e.target.value)} className="form-input" style={{ width: 'auto', fontSize: '12px', fontFamily: 'Roboto Mono, monospace' }}>
                  {pages.map(p => <option key={p.path} value={p.path}>{p.path}</option>)}
                </select>
                <button onClick={importSelected} disabled={importing || selected.size === 0} className="btn btn-accent" style={{ fontSize: '13px' }}>
                  {importing ? 'Importing...' : `Import ${selected.size} Keywords`}
                </button>
              </div>
            </>
          )}

          {/* GSC not fetched yet prompt */}
          {importSource === 'gsc' && !importLoading && importKeywords.length === 0 && !importError && gscSites.length === 0 && (
            <div style={{ fontSize: '13px', color: '#7a8fa8', padding: '1rem 0' }}>Google not connected. <a href={`/sites/${params.id}/search-console`} style={{ color: '#1e90ff', textDecoration: 'none' }}>Connect in Search Console →</a></div>
          )}
          {importSource === 'bing' && !importLoading && importKeywords.length === 0 && !importError && (
            <div style={{ fontSize: '13px', color: '#7a8fa8', padding: '1rem 0' }}>Click "Fetch from Bing" to load keywords. Make sure Bing Webmaster is connected.</div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '12px', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.6rem' }}>Pages</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {pages.map(p => (
              <div key={p.path} onClick={() => selectPage(p.path)} style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${selectedPage === p.path ? 'rgba(30,144,255,0.3)' : 'rgba(0,0,0,0.08)'}`, background: selectedPage === p.path ? 'rgba(30,144,255,0.06)' : '#fff' }}>
                <div style={{ fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: selectedPage === p.path ? '#1e90ff' : '#4a6080' }}>{p.path}</div>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '2px' }}>{p.keywords.length} keywords</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{selectedPage}</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '1rem' }}>Keywords tracked for this page</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', background: '#f8f9fb', minHeight: '42px', marginBottom: '0.75rem' }}>
              {keywords.map(kw => (
                <span key={kw} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(30,144,255,0.1)', border: '1px solid rgba(30,144,255,0.2)', color: '#1e90ff', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', fontFamily: 'Roboto Mono, monospace' }}>
                  {kw}<span onClick={() => removeKeyword(kw)} style={{ cursor: 'pointer', fontSize: '14px', opacity: 0.6, lineHeight: 1 }}>×</span>
                </span>
              ))}
              <input type="text" placeholder="Type keyword and press Enter..." value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#0d1b2e', minWidth: '180px', flex: 1, fontFamily: 'Open Sans, sans-serif' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={saveKeywords} disabled={saving} style={{ fontSize: '13px' }}>{saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Keywords'}</button>
              <button className="btn btn-accent" onClick={analyze} disabled={analyzing || !keywords.length} style={{ fontSize: '13px' }}>{analyzing ? 'Analyzing...' : 'Analyze Page'}</button>
            </div>
          </div>

          {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

          {analysis && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(analysis.score) }}>{analysis.score}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d1b2e' }}>Keyword Optimization Score</div>
                  <div style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '2px' }}>{analysis.verdict}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analysis.fixes?.map((fix: any) => (
                  <div key={fix.priority} style={{ display: 'flex', gap: '10px', padding: '0.75rem 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(30,144,255,0.1)', border: '1px solid rgba(30,144,255,0.2)', color: '#1e90ff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{fix.priority}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{fix.title}</div>
                      <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '3px', lineHeight: 1.5 }}>{fix.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function KeywordsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8' }}>Loading...</div>}>
      <KeywordsPageInner params={params} />
    </Suspense>
  )
}
