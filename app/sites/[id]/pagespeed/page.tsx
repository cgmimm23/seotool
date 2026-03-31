'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'

function PageSpeedPageInner({ params }: { params: { id: string } }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [mobileData, setMobileData] = useState<any>(null)
  const [desktopData, setDesktopData] = useState<any>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>('mobile')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sites').select('url').eq('id', params.id).single()
      if (data?.url) setUrl(data.url)
    }
    load()
  }, [params.id])

  async function fetchStrategy(strategy: 'mobile' | 'desktop') {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${process.env.NEXT_PUBLIC_PAGESPEED_API_KEY || ''}`)
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
      const mobile = await fetchStrategy('mobile')
      setMobileData(mobile)
      await new Promise(r => setTimeout(r, 1500))
      const desktop = await fetchStrategy('desktop')
      setDesktopData(desktop)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  function scoreColor(s: number) {
    if (s >= 90) return '#00d084'
    if (s >= 50) return '#ffa500'
    return '#ff4444'
  }

  const data = activeTab === 'mobile' ? mobileData : desktopData
  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  const keyAudits = data?.audits ? [
    { key: 'first-contentful-paint', label: 'First Contentful Paint' },
    { key: 'largest-contentful-paint', label: 'Largest Contentful Paint' },
    { key: 'total-blocking-time', label: 'Total Blocking Time' },
    { key: 'cumulative-layout-shift', label: 'Cumulative Layout Shift' },
    { key: 'speed-index', label: 'Speed Index' },
    { key: 'interactive', label: 'Time to Interactive' },
  ].map(a => ({ ...a, data: data.audits[a.key] })).filter(a => a.data) : []

  const opportunities = data?.audits ? Object.values(data.audits).filter((a: any) => a.details?.type === 'opportunity' && a.score !== null && a.score < 0.9).sort((a: any, b: any) => (a.score || 0) - (b.score || 0)).slice(0, 6) : []

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Page Speed</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Core Web Vitals and performance via Google PageSpeed Insights</p>
      </div>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
          <input type="text" className="form-input" placeholder="https://yoursite.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && runPageSpeed()} />
          <button className="btn btn-accent" onClick={runPageSpeed} disabled={loading || !url}>{loading ? 'Analyzing...' : 'Run Test'}</button>
        </div>
      </div>
      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      {(mobileData || desktopData) && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {[{ label: 'Mobile', data: mobileData, tab: 'mobile' as const }, { label: 'Desktop', data: desktopData, tab: 'desktop' as const }].map(({ label, data: d, tab }) => {
              const score = d ? Math.round((d.cats?.performance?.score || 0) * 100) : null
              return (
                <div key={label} onClick={() => setActiveTab(tab)} style={{ ...card, cursor: 'pointer', borderColor: activeTab === tab ? '#1e90ff' : 'rgba(0,0,0,0.08)', marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: `3px solid ${score !== null ? scoreColor(score) : '#e4eaf0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', color: score !== null ? scoreColor(score) : '#7a8fa8', lineHeight: 1 }}>{score !== null ? score : '--'}</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 700 }}>{label}</div>
                      {score !== null && <div style={{ fontSize: '13px', color: scoreColor(score), fontWeight: 600 }}>{score >= 90 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor'}</div>}
                      {!d && <div style={{ fontSize: '12px', color: '#7a8fa8' }}>Loading...</div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {data && keyAudits.length > 0 && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Core Web Vitals</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {keyAudits.map(a => (
                  <div key={a.key} style={{ background: '#f8f9fb', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>{a.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: a.data.score !== null ? scoreColor(Math.round(a.data.score * 100)) : '#0d1b2e' }}>{a.data.displayValue || '--'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {!loading && !mobileData && !desktopData && !error && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>Enter a URL and click Run Test</div>
          <div style={{ fontSize: '13px' }}>Tests mobile and desktop simultaneously</div>
        </div>
      )}
    </div>
  )
}

export default function PageSpeedPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <PageSpeedPageInner params={params} />
    </Suspense>
  )
}
