'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'

function OnPageOptimizerInner({ params }: { params: { id: string } }) {
  const [siteUrl, setSiteUrl] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [keyword, setKeyword] = useState('')
  const [secondary, setSecondary] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [competitors, setCompetitors] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url').eq('id', params.id).single()
      if (site?.url) {
        setSiteUrl(site.url)
        if (!pageUrl) setPageUrl(site.url)
      }
      const res = await fetch(`/api/page-optimizer?siteId=${params.id}`)
      if (res.ok) {
        const json = await res.json()
        setReports(json.reports || [])
      }
    }
    load()
  }, [params.id])

  async function runAnalysis() {
    if (!pageUrl || !keyword) return
    setLoading(true)
    setError('')
    setAnalysis(null)
    try {
      const secondaryKeywords = secondary.split(',').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/page-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: params.id, pageUrl, keyword, secondaryKeywords }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAnalysis(data.analysis)
      setCompetitors(data.competitors || [])
      // Refresh reports list
      const listRes = await fetch(`/api/page-optimizer?siteId=${params.id}`)
      if (listRes.ok) {
        const json = await listRes.json()
        setReports(json.reports || [])
      }
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

  function impactColor(i: string) {
    if (i === 'high') return '#ff4444'
    if (i === 'medium') return '#ffa500'
    return '#7a8fa8'
  }

  function loadReport(r: any) {
    setPageUrl(r.page_url)
    setKeyword(r.keyword)
    setSecondary((r.secondary_keywords || []).join(', '))
    setAnalysis({ optimization_score: r.optimization_score, summary: r.summary, ideas: r.ideas })
    setCompetitors(r.competitors || [])
    setExpanded(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>On-Page Optimizer</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Score a specific page against a target keyword and get categorized ideas to move up in search</p>
      </div>

      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Page URL</div>
            <input type="text" className="form-input" placeholder="https://yoursite.com/page" value={pageUrl} onChange={e => setPageUrl(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Target keyword</div>
            <input type="text" className="form-input" placeholder="e.g. roofing company chicago" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && runAnalysis()} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Secondary keywords (optional, comma-separated)</div>
          <input type="text" className="form-input" placeholder="commercial roofing, flat roof repair" value={secondary} onChange={e => setSecondary(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-accent" onClick={runAnalysis} disabled={loading || !pageUrl || !keyword}>
            {loading ? 'Analyzing...' : 'Analyze Page'}
          </button>
          {loading && <span style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', alignSelf: 'center' }}>Fetching page, pulling SERP, scoring…</span>}
        </div>
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {analysis && (
        <>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: `3px solid ${scoreColor(analysis.optimization_score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(analysis.optimization_score), lineHeight: 1 }}>{analysis.optimization_score}</span>
              <span style={{ fontSize: '9px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginTop: '2px' }}>SCORE</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#1e90ff', marginBottom: '4px' }}>{pageUrl} · "{keyword}"</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 600 }}>{analysis.summary}</div>
            </div>
          </div>

          <div style={card}>
            {Object.entries(analysis.ideas || {}).map(([category, ideas]: [string, any]) => {
              const items: any[] = Array.isArray(ideas) ? ideas : []
              if (!items.length) return null
              return (
                <div key={category} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.5rem' }}>{category} ({items.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {items.map((idea: any, i: number) => {
                      const key = `${category}-${i}`
                      const isOpen = expanded === key
                      const color = impactColor(idea.impact)
                      return (
                        <div key={i} style={{ borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', borderLeft: `2px solid ${color}`, background: '#f8f9fb', overflow: 'hidden' }}>
                          <div onClick={() => setExpanded(isOpen ? null : key)} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'start', padding: '10px 14px', cursor: 'pointer' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{idea.title}</div>
                              <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{idea.detail}</div>
                            </div>
                            <div style={{ fontSize: '10px', fontFamily: 'Roboto Mono, monospace', color, border: `1px solid ${color}40`, padding: '1px 7px', borderRadius: '10px', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{idea.impact}</div>
                            <div style={{ fontSize: '14px', color: '#7a8fa8', userSelect: 'none' }}>{isOpen ? '▾' : '▸'}</div>
                          </div>
                          {isOpen && idea.how_to_fix && (
                            <div style={{ padding: '0 14px 14px 14px', background: '#f8f9fb' }}>
                              <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>How to fix</div>
                              <div style={{ fontSize: '13px', color: '#0d1b2e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{idea.how_to_fix}</div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {competitors.length > 0 && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top 10 SERP Competitors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {competitors.map((c: any) => (
                  <div key={c.position} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: '10px', padding: '8px 12px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#1e90ff' }}>#{c.position}</div>
                    <div>
                      <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e', textDecoration: 'none' }}>{c.title}</a>
                      <div style={{ fontSize: '11px', color: '#1e90ff', fontFamily: 'Roboto Mono, monospace', marginTop: '2px' }}>{c.link}</div>
                      {c.snippet && <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '4px', lineHeight: 1.5 }}>{c.snippet}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {reports.length > 0 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Recent Analyses</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {reports.map((r: any) => (
              <div key={r.id} onClick={() => loadReport(r)} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '10px', alignItems: 'center', padding: '10px 12px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(r.optimization_score) }}>{r.optimization_score}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{r.keyword}</div>
                  <div style={{ fontSize: '11px', color: '#1e90ff', fontFamily: 'Roboto Mono, monospace', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.page_url}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !analysis && reports.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>No analyses yet</div>
          <div style={{ fontSize: '13px' }}>Enter a page URL and target keyword, then click Analyze</div>
        </div>
      )}
    </div>
  )
}

export default function OnPageOptimizerPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <OnPageOptimizerInner params={params} />
    </Suspense>
  )
}
