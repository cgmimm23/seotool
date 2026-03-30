'use client'

import { useState } from 'react'

export default function PageSpeedPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [mobileData, setMobileData] = useState<any>(null)
  const [desktopData, setDesktopData] = useState<any>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>('mobile')

  async function fetchStrategy(strategy: 'mobile' | 'desktop') {
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${process.env.NEXT_PUBLIC_PAGESPEED_API_KEY || ''}`
    )
    if (!res.ok) throw new Error('PageSpeed API error ' + res.status)
    const json = await res.json()
    return { cats: json.lighthouseResult?.categories, audits: json.lighthouseResult?.audits, url: json.id }
  }

  async function runPageSpeed() {
    if (!url) return
    setLoading(true)
    setError('')
    setMobileData(null)
    setDesktopData(null)
    try {
      const [mobile, desktop] = await Promise.all([
        fetchStrategy('mobile'),
        fetchStrategy('desktop'),
      ])
      setMobileData(mobile)
      setDesktopData(desktop)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function scoreColor(s: number) {
    if (s >= 90) return '#00d084'
    if (s >= 50) return '#ffa500'
    return '#ff4444'
  }

  function scoreLabel(s: number) {
    if (s >= 90) return 'Good'
    if (s >= 50) return 'Needs Work'
    return 'Poor'
  }

  const data = activeTab === 'mobile' ? mobileData : desktopData

  const keyAudits = data?.audits ? [
    { key: 'first-contentful-paint', label: 'First Contentful Paint' },
    { key: 'largest-contentful-paint', label: 'Largest Contentful Paint' },
    { key: 'total-blocking-time', label: 'Total Blocking Time' },
    { key: 'cumulative-layout-shift', label: 'Cumulative Layout Shift' },
    { key: 'speed-index', label: 'Speed Index' },
    { key: 'interactive', label: 'Time to Interactive' },
  ].map(a => ({ ...a, data: data.audits[a.key] })).filter(a => a.data) : []

  const opportunities = data?.audits ? Object.values(data.audits).filter((a: any) =>
    a.details?.type === 'opportunity' && a.score !== null && a.score < 0.9
  ).sort((a: any, b: any) => (a.score || 0) - (b.score || 0)).slice(0, 6) : []

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Page Speed</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Core Web Vitals and performance via Google PageSpeed Insights</p>
      </div>

      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
          <input type="text" className="form-input" placeholder="https://yoursite.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && runPageSpeed()} />
          <button className="btn btn-accent" onClick={runPageSpeed} disabled={loading || !url}>
            {loading ? 'Analyzing...' : 'Run Test'}
          </button>
        </div>
        {loading && <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '8px', fontFamily: 'Roboto Mono, monospace' }}>Running mobile and desktop tests simultaneously...</div>}
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {(mobileData || desktopData) && (
        <>
          {/* Score summary for both */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Mobile', data: mobileData, tab: 'mobile' as const },
              { label: 'Desktop', data: desktopData, tab: 'desktop' as const },
            ].map(({ label, data: d, tab }) => {
              const score = d ? Math.round((d.cats?.performance?.score || 0) * 100) : null
              return (
                <div key={label} onClick={() => setActiveTab(tab)} style={{ ...card, cursor: 'pointer', borderColor: activeTab === tab ? '#1e90ff' : 'rgba(0,0,0,0.08)', marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: `3px solid ${score !== null ? scoreColor(score) : '#e4eaf0'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', color: score !== null ? scoreColor(score) : '#7a8fa8', lineHeight: 1 }}>{score !== null ? score : '--'}</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 700 }}>{label}</div>
                      {score !== null && <div style={{ fontSize: '13px', color: scoreColor(score), fontWeight: 600 }}>{scoreLabel(score)}</div>}
                      {!d && <div style={{ fontSize: '12px', color: '#7a8fa8' }}>Loading...</div>}
                    </div>
                  </div>
                  {d && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginTop: '12px' }}>
                      {['performance', 'accessibility', 'best-practices', 'seo'].map(cat => {
                        const s = Math.round((d.cats?.[cat]?.score || 0) * 100)
                        return (
                          <div key={cat} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(s) }}>{s}</div>
                            <div style={{ fontSize: '9px', color: '#7a8fa8', textTransform: 'capitalize' }}>{cat.replace('-', ' ')}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1rem' }}>
            {(['mobile', 'desktop'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '0.5rem 1rem', fontSize: '13px', color: activeTab === t ? '#1e90ff' : '#7a8fa8', cursor: 'pointer', borderBottom: `2px solid ${activeTab === t ? '#1e90ff' : 'transparent'}`, marginBottom: '-1px', fontWeight: activeTab === t ? 600 : 400, background: 'none', border: 'none', fontFamily: 'Open Sans, sans-serif', textTransform: 'capitalize' as const }}>{t}</button>
            ))}
          </div>

          {data && (
            <>
              {/* Core Web Vitals */}
              <div style={card}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Core Web Vitals — {activeTab === 'mobile' ? 'Mobile' : 'Desktop'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                  {keyAudits.map(a => (
                    <div key={a.key} style={{ background: '#f8f9fb', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>{a.label}</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: a.data.score !== null ? scoreColor(Math.round(a.data.score * 100)) : '#0d1b2e' }}>{a.data.displayValue || '--'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opportunities */}
              {opportunities.length > 0 && (
                <div style={card}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Opportunities to Improve</div>
                  {(opportunities as any[]).map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < opportunities.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: scoreColor(Math.round((a.score || 0) * 100)) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: scoreColor(Math.round((a.score || 0) * 100)) }}>{Math.round((a.score || 0) * 100)}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{a.title}</div>
                        <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{a.description?.split('.')[0]}.</div>
                        {a.details?.overallSavingsMs && <div style={{ fontSize: '11px', color: '#00d084', marginTop: '2px', fontFamily: 'Roboto Mono, monospace' }}>Potential savings: {Math.round(a.details.overallSavingsMs)}ms</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {!loading && !mobileData && !desktopData && !error && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>Enter a URL and click Run Test</div>
          <div style={{ fontSize: '13px' }}>Tests mobile and desktop simultaneously — results show in seconds</div>
        </div>
      )}
    </div>
  )
}
