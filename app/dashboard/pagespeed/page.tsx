'use client'

import { useState } from 'react'

export default function PageSpeedPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile')

  async function runPageSpeed() {
    if (!url) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`
      )
      if (!res.ok) throw new Error('PageSpeed API error ' + res.status)
      const json = await res.json()
      const cats = json.lighthouseResult?.categories
      const audits = json.lighthouseResult?.audits
      setData({ cats, audits, url: json.id })
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

  const keyAudits = data?.audits ? [
    { key: 'first-contentful-paint', label: 'First Contentful Paint' },
    { key: 'largest-contentful-paint', label: 'Largest Contentful Paint' },
    { key: 'total-blocking-time', label: 'Total Blocking Time' },
    { key: 'cumulative-layout-shift', label: 'Cumulative Layout Shift' },
    { key: 'speed-index', label: 'Speed Index' },
    { key: 'interactive', label: 'Time to Interactive' },
  ].map(a => ({ ...a, audit: data.audits[a.key] })).filter(a => a.audit) : []

  const failedAudits = data?.audits ? Object.values(data.audits).filter((a: any) =>
    a.score !== null && a.score < 0.9 && a.details?.type !== 'debugdata' && a.title
  ).sort((a: any, b: any) => a.score - b.score).slice(0, 10) : []

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Page Speed</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Google PageSpeed Insights — Core Web Vitals</p>
      </div>

      {/* Input */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="https://yoursite.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runPageSpeed()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-accent" onClick={runPageSpeed} disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {/* Mobile / Desktop toggle */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['mobile', 'desktop'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              style={{
                padding: '4px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                border: `1px solid ${strategy === s ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`,
                background: strategy === s ? 'rgba(30,144,255,0.08)' : 'transparent',
                color: strategy === s ? '#1e90ff' : '#7a8fa8',
                fontFamily: 'Open Sans, sans-serif', textTransform: 'capitalize',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>
          Running PageSpeed analysis on {url}... this takes ~10 seconds
        </div>
      )}

      {data && (
        <>
          {/* Category scores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {Object.entries(data.cats || {}).map(([key, cat]: any) => {
              const score = Math.round(cat.score * 100)
              return (
                <div key={key} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: `3px solid ${scoreColor(score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                    <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(score), lineHeight: 1 }}>{score}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e', fontFamily: 'Montserrat, sans-serif' }}>{cat.title}</div>
                  <div style={{ fontSize: '11px', marginTop: '3px', color: scoreColor(score), fontFamily: 'Roboto Mono, monospace' }}>{scoreLabel(score)}</div>
                </div>
              )
            })}
          </div>

          {/* Core Web Vitals */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Core Web Vitals</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {keyAudits.map(({ key, label, audit }) => {
                const score = audit.score !== null ? Math.round(audit.score * 100) : null
                return (
                  <div key={key} style={{ background: '#f8f9fb', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>{label}</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: score !== null ? scoreColor(score) : '#7a8fa8' }}>
                      {audit.displayValue || '—'}
                    </div>
                    {score !== null && (
                      <div style={{ height: '3px', background: '#e4eaf0', borderRadius: '2px', marginTop: '8px' }}>
                        <div style={{ width: `${score}%`, height: '100%', background: scoreColor(score), borderRadius: '2px' }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Opportunities */}
          {failedAudits.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Opportunities to Improve</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {failedAudits.map((a: any, i: number) => {
                  const score = a.score !== null ? Math.round(a.score * 100) : null
                  const color = score !== null ? scoreColor(score) : '#ffa500'
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: '10px', alignItems: 'start', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', borderLeft: `2px solid ${color}`, background: '#f8f9fb' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, marginTop: '1px' }}>!</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{a.title}</div>
                        <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{a.description?.replace(/\[.*?\]\(.*?\)/g, '').substring(0, 120)}</div>
                      </div>
                      {a.displayValue && (
                        <div style={{ fontSize: '11px', fontFamily: 'Roboto Mono, monospace', color, whiteSpace: 'nowrap' }}>{a.displayValue}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
