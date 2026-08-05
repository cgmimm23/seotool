'use client'

import { useState, useEffect } from 'react'

export default function CgmBacklinksPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'dofollow' | 'nofollow'>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/sites').then(r => r.json()).then(d => {
      const first = d.sites?.[0]
      if (first?.url) { setInput(first.url); run(first.url) }
    }).catch(() => {})
  }, [])

  async function run(url: string) {
    if (!url) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/cgm-backlinks?siteUrl=${encodeURIComponent(url)}&limit=200`)
      const d = await res.json()
      if (d.error) { setError(d.error); setData(null) } else { setData(d) }
    } catch (e: any) { setError(e.message); setData(null) }
    setLoading(false)
  }

  const m = data?.metrics
  const stats = m ? [
    { label: 'Domain Rating', value: m.dr != null ? String(m.dr) : '—', color: '#7b2ff7' },
    { label: 'Backlinks', value: (m.totalLinks || 0).toLocaleString(), color: '#1e90ff' },
    { label: 'Referring Domains', value: (m.linkingDomains || 0).toLocaleString(), color: '#0d1b2e' },
    { label: 'Dofollow', value: (m.dofollow || 0).toLocaleString(), color: '#00d084' },
  ] : []
  const links = data?.backlinks || []
  const filtered = filter === 'all' ? links : links.filter((b: any) => b.type === filter)

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>CGM Backlinks</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Backlinks discovered by our own crawler (CGM Search) — no third-party API</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); run(input) }} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a domain, e.g. sinkinlaw.com"
          style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '14px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#1e90ff', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Check</button>
      </form>

      {loading && <div style={{ padding: '2rem', color: '#7a8fa8' }}>Loading backlink data…</div>}
      {error && <div style={{ padding: '1rem', background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.15)', borderRadius: '10px', fontSize: '13px', color: '#ff4444', marginBottom: '1rem' }}>{error}</div>}

      {data && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {data.topAnchors?.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '0.75rem' }}>Top Anchor Text</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {data.topAnchors.map((a: any, i: number) => (
                  <span key={i} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(30,144,255,0.06)', color: '#4a6080', border: '1px solid rgba(30,144,255,0.12)' }}>
                    {a.anchor} <span style={{ color: '#7a8fa8' }}>· {a.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Backlinks ({filtered.length}{links.length >= 200 ? '+' : ''})</div>
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

            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 90px 110px', gap: '12px', padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {['DR', 'Referring Page', 'Anchor', 'Type', 'Last Seen'].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>
                No backlinks found yet. The crawler is still discovering — check back as coverage grows.
              </div>
            )}

            {filtered.map((b: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 90px 110px', gap: '12px', alignItems: 'center', padding: '0.75rem 0.5rem', borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: '#7b2ff7' }}>{b.dr != null ? b.dr : '—'}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{b.domain}</div>
                  <a href={b.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#1e90ff', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{b.sourceUrl}</a>
                </div>
                <div style={{ fontSize: '12px', color: '#4a6080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.anchor || <span style={{ color: '#c0ccd8' }}>—</span>}</div>
                <div style={{ fontSize: '12px', color: b.type === 'dofollow' ? '#00d084' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{b.type}</div>
                <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{b.lastSeen}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
