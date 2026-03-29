'use client'

import { useState } from 'react'

const MOCK_BACKLINKS = [
  { domain: 'techcrunch.com', da: 92, links: 3, type: 'dofollow', last_seen: '2 days ago' },
  { domain: 'producthunt.com', da: 88, links: 1, type: 'dofollow', last_seen: '5 days ago' },
  { domain: 'seoguide.io', da: 54, links: 7, type: 'dofollow', last_seen: '1 week ago' },
  { domain: 'wordpress-help.net', da: 41, links: 2, type: 'nofollow', last_seen: '2 weeks ago' },
  { domain: 'marketingblogs.co', da: 38, links: 4, type: 'dofollow', last_seen: '3 weeks ago' },
  { domain: 'spammy-links.xyz', da: 8, links: 4, type: 'toxic', last_seen: 'Flagged as toxic' },
]

export default function BacklinksPage() {
  const [filter, setFilter] = useState<'all' | 'dofollow' | 'nofollow' | 'toxic'>('all')

  const filtered = filter === 'all' ? MOCK_BACKLINKS : MOCK_BACKLINKS.filter(b => b.type === filter)

  function daColor(da: number) {
    if (da >= 70) return { bg: 'rgba(0,208,132,0.1)', color: '#00d084' }
    if (da >= 40) return { bg: 'rgba(255,165,0,0.1)', color: '#ffa500' }
    return { bg: 'rgba(255,68,68,0.1)', color: '#ff4444' }
  }

  function typeColor(type: string) {
    if (type === 'dofollow') return '#00d084'
    if (type === 'nofollow') return '#7a8fa8'
    return '#ff4444'
  }

  const stats = [
    { label: 'Total Backlinks', value: '2,841', delta: '▲ 38 this month', up: true },
    { label: 'Referring Domains', value: '318', delta: '▲ 5 new', up: true },
    { label: 'Domain Authority', value: '41', delta: '▲ 2 pts', up: true },
    { label: 'Toxic Links', value: '12', delta: 'needs review', up: false },
  ]

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Backlinks</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Domains linking to your site</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.label === 'Toxic Links' ? '#ff4444' : s.label === 'Domain Authority' ? '#ffa500' : '#0d1b2e' }}>{s.value}</div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: s.up ? '#00d084' : '#ff4444' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Referring Domains</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'dofollow', 'nofollow', 'toxic'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                  border: `1px solid ${filter === f ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`,
                  background: filter === f ? 'rgba(30,144,255,0.08)' : 'transparent',
                  color: filter === f ? '#1e90ff' : '#7a8fa8',
                  fontFamily: 'Open Sans, sans-serif',
                }}
              >{f}</button>
            ))}
          </div>
        </div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 80px 120px', gap: '12px', padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          {['Domain', 'DA', 'Links', 'Type', 'Last Seen'].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
          ))}
        </div>

        {filtered.map((b, i) => {
          const da = daColor(b.da)
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 80px 120px', gap: '12px', alignItems: 'center', padding: '0.75rem 0.5rem', borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{b.domain}</div>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '2px', fontFamily: 'Roboto Mono, monospace' }}>{b.last_seen}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: da.bg, color: da.color }}>{b.da}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#4a6080' }}>{b.links}</div>
              <div style={{ fontSize: '12px', color: typeColor(b.type), fontFamily: 'Roboto Mono, monospace' }}>{b.type}</div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{b.last_seen}</div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '12px', padding: '1rem', background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '10px', fontSize: '13px', color: '#4a6080' }}>
        <strong style={{ color: '#1e90ff' }}>Coming soon:</strong> Live backlink data via a backlink API. Currently showing sample data. Connect a DataForSEO or Ahrefs API key in Settings to see real backlinks.
      </div>
    </div>
  )
}
