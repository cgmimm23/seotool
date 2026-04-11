'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function BacklinksPage() {
  const [filter, setFilter] = useState<'all' | 'dofollow' | 'nofollow'>('all')
  const [siteUrl, setSiteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)
  const [backlinks, setBacklinks] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('sites').select('url').eq('user_id', session.user.id).limit(1).single().then(({ data }) => {
        if (data?.url) { setSiteUrl(data.url); fetchBacklinks(data.url) }
      })
    })
  }, [])

  async function fetchBacklinks(url: string) {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/backlinks?siteUrl=${encodeURIComponent(url)}&limit=50`)
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setMetrics(data.metrics)
    setBacklinks(data.backlinks || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? backlinks : backlinks.filter(b => b.type === filter)

  function daColor(da: number) {
    if (da >= 70) return { bg: 'rgba(0,208,132,0.1)', color: '#00d084' }
    if (da >= 40) return { bg: 'rgba(255,165,0,0.1)', color: '#ffa500' }
    return { bg: 'rgba(255,68,68,0.1)', color: '#ff4444' }
  }

  function typeColor(type: string) {
    if (type === 'dofollow') return '#00d084'
    return '#7a8fa8'
  }

  const stats = metrics ? [
    { label: 'Domain Authority', value: metrics.da, color: '#ffa500' },
    { label: 'Page Authority', value: metrics.pa, color: '#1e90ff' },
    { label: 'Linking Domains', value: metrics.linkingDomains?.toLocaleString() || '0', color: '#0d1b2e' },
    { label: 'Spam Score', value: `${metrics.spamScore}%`, color: metrics.spamScore > 30 ? '#ff4444' : '#00d084' },
  ] : []

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Backlinks</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Live backlink data powered by Moz</p>
      </div>

      {loading && <div style={{ padding: '2rem', color: '#7a8fa8' }}>Loading backlink data...</div>}
      {error && <div style={{ padding: '1rem', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.15)', borderRadius: '10px', fontSize: '13px', color: '#ff4444', marginBottom: '1rem' }}>{error}</div>}

      {metrics && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Referring Domains ({filtered.length})</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['all', 'dofollow', 'nofollow'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                    border: `1px solid ${filter === f ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`,
                    background: filter === f ? 'rgba(30,144,255,0.08)' : 'transparent',
                    color: filter === f ? '#1e90ff' : '#7a8fa8',
                  }}>{f}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 80px 80px 120px', gap: '12px', padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {['Domain', 'DA', 'PA', 'Spam', 'Type', 'Last Crawled'].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 && !loading && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>No backlinks found</div>
            )}

            {filtered.map((b, i) => {
              const da = daColor(b.da)
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 80px 80px 120px', gap: '12px', alignItems: 'center', padding: '0.75rem 0.5rem', borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{b.domain}</div>
                    {b.anchor && <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '2px' }}>{b.anchor}</div>}
                  </div>
                  <div><span style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: da.bg, color: da.color }}>{b.da}</span></div>
                  <div style={{ fontSize: '13px', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{b.pa}</div>
                  <div style={{ fontSize: '12px', color: b.spamScore > 30 ? '#ff4444' : '#00d084', fontFamily: 'Roboto Mono, monospace' }}>{b.spamScore}%</div>
                  <div style={{ fontSize: '12px', color: typeColor(b.type), fontFamily: 'Roboto Mono, monospace' }}>{b.type}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{b.lastCrawled}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
