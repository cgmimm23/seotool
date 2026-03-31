'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'

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
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url').eq('id', params.id).single()
      if (site?.url) setSiteUrl(site.url)

      const res = await fetch('/api/keywords')
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
    try {
      await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: params.id, siteUrl, pagePath: selectedPage, keywords, action: 'save' }),
      })
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Keywords</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Set target keywords per page — get exact fixes</p>
        </div>
        <button className="btn btn-accent" onClick={addPage}>+ Add Page</button>
      </div>

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
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '1rem' }}>Add the keywords you want this page to rank for</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', background: '#f8f9fb', minHeight: '42px', marginBottom: '0.75rem' }}>
              {keywords.map(kw => (
                <span key={kw} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(30,144,255,0.1)', border: '1px solid rgba(30,144,255,0.2)', color: '#1e90ff', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', fontFamily: 'Roboto Mono, monospace' }}>
                  {kw}<span onClick={() => removeKeyword(kw)} style={{ cursor: 'pointer', fontSize: '14px', opacity: 0.6, lineHeight: 1 }}>×</span>
                </span>
              ))}
              <input type="text" placeholder="Add keyword and press Enter..." value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#0d1b2e', minWidth: '180px', flex: 1, fontFamily: 'Open Sans, sans-serif' }} />
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
