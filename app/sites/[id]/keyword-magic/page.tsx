'use client'

import { useState } from 'react'

const diffColor = (d: number) => d >= 70 ? '#ff4444' : d >= 40 ? '#ffa500' : '#00d084'
const intentColor: Record<string, string> = { informational: '#1e90ff', commercial: '#ffa500', transactional: '#00d084', navigational: '#7a8fa8' }

export default function KeywordMagicPage() {
  const [seed, setSeed] = useState('')
  const [loading, setLoading] = useState(false)
  const [keywords, setKeywords] = useState<any[]>([])
  const [sort, setSort] = useState<'volume' | 'difficulty' | 'cpc'>('volume')
  const [intentFilter, setIntentFilter] = useState('')

  async function search() {
    if (!seed) return
    setLoading(true)
    const res = await fetch('/api/keyword-magic', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed }),
    })
    const data = await res.json()
    setKeywords(data.keywords || [])
    setLoading(false)
  }

  const filtered = keywords
    .filter(k => !intentFilter || k.intent === intentFilter)
    .sort((a, b) => sort === 'volume' ? b.volume - a.volume : sort === 'difficulty' ? a.difficulty - b.difficulty : b.cpc - a.cpc)

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', padding: '0.6rem 0.85rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Keyword Magic Tool</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Enter a seed keyword to discover related keywords with volume, difficulty, and CPC</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={seed} onChange={e => setSeed(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Enter a seed keyword..." style={{ ...inputStyle, flex: 1 }} />
          <button onClick={search} disabled={loading || !seed} className="btn btn-accent" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            {loading ? 'Generating...' : 'Find Keywords'}
          </button>
        </div>
      </div>

      {keywords.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#7a8fa8' }}>Sort:</span>
            {(['volume', 'difficulty', 'cpc'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${sort === s ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: sort === s ? 'rgba(30,144,255,0.08)' : 'transparent', color: sort === s ? '#1e90ff' : '#7a8fa8', textTransform: 'capitalize' }}>{s}</button>
            ))}
            <span style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)' }} />
            <span style={{ fontSize: '12px', color: '#7a8fa8' }}>Intent:</span>
            {['', 'informational', 'commercial', 'transactional'].map(i => (
              <button key={i} onClick={() => setIntentFilter(i)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${intentFilter === i ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: intentFilter === i ? 'rgba(30,144,255,0.08)' : 'transparent', color: intentFilter === i ? '#1e90ff' : '#7a8fa8', textTransform: 'capitalize' }}>{i || 'All'}</button>
            ))}
          </div>

          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 100px', gap: '12px', padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {['Keyword', 'Volume', 'Difficulty', 'CPC', 'Intent'].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
              ))}
            </div>
            {filtered.map((k, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 100px', gap: '12px', padding: '0.65rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.04)', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: '#0d1b2e', fontWeight: 500 }}>{k.keyword}</div>
                <div style={{ fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: '#0d1b2e' }}>{k.volume?.toLocaleString()}</div>
                <div><span style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', padding: '2px 8px', borderRadius: '20px', background: `${diffColor(k.difficulty)}15`, color: diffColor(k.difficulty), fontWeight: 600 }}>{k.difficulty}</span></div>
                <div style={{ fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: '#00d084' }}>${k.cpc?.toFixed(2)}</div>
                <div><span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: `${intentColor[k.intent] || '#7a8fa8'}15`, color: intentColor[k.intent] || '#7a8fa8', fontWeight: 600, textTransform: 'capitalize' }}>{k.intent}</span></div>
              </div>
            ))}
            <div style={{ padding: '8px 0', fontSize: '12px', color: '#7a8fa8' }}>{filtered.length} keywords</div>
          </div>
        </>
      )}
    </div>
  )
}
