'use client'

import { useState } from 'react'

export default function TrafficEstimatePage() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  async function estimate() {
    if (!domain) return
    setLoading(true)
    const res = await fetch('/api/traffic-estimate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    })
    setData(await res.json())
    setLoading(false)
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', padding: '0.6rem 0.85rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
  const trendColor = { growing: '#00d084', stable: '#1e90ff', declining: '#ff4444' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Traffic Estimation</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Estimate any website&apos;s monthly traffic — no access required</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && estimate()} placeholder="example.com" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={estimate} disabled={loading || !domain} className="btn btn-accent" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            {loading ? 'Estimating...' : 'Estimate Traffic'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '12px' }}>
            {[
              { label: 'Est. Monthly Traffic', value: data.estimated_monthly_traffic?.toLocaleString() || 'N/A', color: '#1e90ff' },
              { label: 'Organic Keywords', value: data.estimated_organic_keywords?.toLocaleString() || 'N/A', color: '#00d084' },
              { label: 'Traffic Value', value: `$${data.estimated_traffic_value?.toLocaleString() || '0'}`, color: '#ffa500' },
              { label: 'Trend', value: data.traffic_trend || 'N/A', color: trendColor[data.traffic_trend as keyof typeof trendColor] || '#7a8fa8' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: s.color, fontFamily: 'Montserrat, sans-serif', textTransform: 'capitalize' }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {data.moz && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '12px' }}>
              {[
                { label: 'Domain Authority', value: data.moz.da, color: '#ffa500' },
                { label: 'Page Authority', value: data.moz.pa, color: '#1e90ff' },
                { label: 'Linking Domains', value: data.moz.linkingDomains?.toLocaleString(), color: '#0d1b2e' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: s.color, fontFamily: 'Montserrat, sans-serif' }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {data.top_traffic_sources && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Traffic Sources</div>
              {data.top_traffic_sources.map((s: any, i: number) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px' }}>{s.source}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e90ff' }}>{s.percentage}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#f0f4f8', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.percentage}%`, background: '#1e90ff', borderRadius: '3px', opacity: 0.7 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '8px 12px', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.15)', borderRadius: '8px', fontSize: '12px', color: '#7a8fa8' }}>
            Confidence: <strong style={{ color: data.confidence === 'high' ? '#00d084' : data.confidence === 'medium' ? '#ffa500' : '#ff4444', textTransform: 'capitalize' }}>{data.confidence || 'N/A'}</strong> — Traffic range: {data.traffic_range_low?.toLocaleString()} – {data.traffic_range_high?.toLocaleString()} monthly visits
          </div>
        </>
      )}
    </div>
  )
}
