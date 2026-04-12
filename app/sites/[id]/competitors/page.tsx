'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function CompetitorsPage() {
  const params = useParams()
  const siteId = params.id as string
  const [siteUrl, setSiteUrl] = useState('')
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [gapLoading, setGapLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [gaps, setGaps] = useState<any>(null)
  const [tab, setTab] = useState<'overview' | 'content-gap'>('overview')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('sites').select('url').eq('id', siteId).single().then(({ data }) => {
      if (data) setSiteUrl(data.url)
    })
  }, [siteId])

  async function analyze() {
    if (!competitorUrl) return
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/competitor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitorUrl, siteUrl, action: 'analyze' }),
    })
    setResult(await res.json())
    setLoading(false)
  }

  async function findGaps() {
    if (!competitorUrl) return
    setGapLoading(true)
    setGaps(null)
    const res = await fetch('/api/competitor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitorUrl, siteUrl, action: 'content-gap' }),
    })
    setGaps(await res.json())
    setGapLoading(false)
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', padding: '0.6rem 0.85rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Competitor Analysis</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Compare your site against competitors — find gaps and opportunities</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px' }}>Competitor URL</label>
            <input value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)} placeholder="https://competitor.com" style={inputStyle} />
          </div>
          <button onClick={() => { analyze(); if (tab === 'content-gap') findGaps() }} disabled={loading || !competitorUrl} className="btn btn-accent" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            {loading ? 'Analyzing...' : 'Analyze Competitor'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {(['overview', 'content-gap'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'content-gap' && !gaps && competitorUrl) findGaps() }} style={{
            padding: '6px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
            border: `1px solid ${tab === t ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`,
            background: tab === t ? 'rgba(30,144,255,0.08)' : 'transparent',
            color: tab === t ? '#1e90ff' : '#7a8fa8',
          }}>{t === 'overview' ? 'Overview' : 'Content Gap'}</button>
        ))}
      </div>

      {tab === 'overview' && result && (
        <>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '12px' }}>
            {[
              { label: 'Domain Authority', value: result.competitor.da, color: '#ffa500' },
              { label: 'Page Authority', value: result.competitor.pa, color: '#1e90ff' },
              { label: 'Linking Domains', value: result.competitor.linkingDomains?.toLocaleString(), color: '#0d1b2e' },
              { label: 'Total Links', value: result.competitor.totalLinks?.toLocaleString(), color: '#0d1b2e' },
              { label: 'Spam Score', value: `${result.competitor.spamScore}%`, color: result.competitor.spamScore > 30 ? '#ff4444' : '#00d084' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: s.color, fontFamily: 'Montserrat, sans-serif' }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI Analysis */}
          {result.aiAnalysis && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: '#2367a0' }}>AI Competitive Analysis</div>
              <div style={{ fontSize: '14px', color: '#4a6080', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.aiAnalysis}</div>
            </div>
          )}

          {/* Indexed Pages */}
          {result.indexedPages?.length > 0 && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Competitor&apos;s Indexed Pages ({result.indexedPages.length})</div>
              {result.indexedPages.map((p: any, i: number) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < result.indexedPages.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e90ff' }}>{p.title}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{p.url}</div>
                  {p.snippet && <div style={{ fontSize: '12px', color: '#4a6080', marginTop: '2px' }}>{p.snippet}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'content-gap' && (
        <>
          {gapLoading && <div style={{ padding: '2rem', color: '#7a8fa8' }}>Finding content gaps...</div>}
          {gaps && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#ff4444', fontFamily: 'Montserrat, sans-serif' }}>{gaps.gaps?.length || 0}</div>
                  <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', marginTop: '4px' }}>Content Gaps</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e90ff', fontFamily: 'Montserrat, sans-serif' }}>{gaps.competitorPages}</div>
                  <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', marginTop: '4px' }}>Their Pages</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#00d084', fontFamily: 'Montserrat, sans-serif' }}>{gaps.yourPages}</div>
                  <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', marginTop: '4px' }}>Your Pages</div>
                </div>
              </div>

              {gaps.gaps?.length > 0 && (
                <div style={card}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Topics Your Competitor Covers That You Don&apos;t</div>
                  {gaps.gaps.map((g: any, i: number) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: i < gaps.gaps.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{g.title}</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{g.url}</div>
                      {g.snippet && <div style={{ fontSize: '12px', color: '#4a6080', marginTop: '2px' }}>{g.snippet}</div>}
                    </div>
                  ))}
                </div>
              )}

              {gaps.gaps?.length === 0 && (
                <div style={card}><p style={{ color: '#00d084', fontSize: '14px' }}>No content gaps found — you&apos;re covering the same topics!</p></div>
              )}
            </>
          )}

          {!gaps && !gapLoading && competitorUrl && (
            <div style={card}>
              <button onClick={findGaps} className="btn btn-accent" style={{ fontSize: '13px' }}>Find Content Gaps</button>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          Enter a competitor URL above to analyze their SEO performance and find opportunities.
        </div>
      )}
    </div>
  )
}
