'use client'

import { useState } from 'react'

type Tab = 'gbp' | 'citations' | 'rankings'

export default function LocalSEOPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<Tab>('gbp')
  const [gbpQuery, setGbpQuery] = useState('')
  const [gbpLoading, setGbpLoading] = useState(false)
  const [gbpError, setGbpError] = useState('')
  const [gbpData, setGbpData] = useState<any>(null)

  const cardStyle = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const tabBtn = (t: Tab) => ({ padding: '0.5rem 1.25rem', fontSize: '13px', cursor: 'pointer', borderBottom: `2px solid ${tab === t ? '#1e90ff' : 'transparent'}`, marginBottom: '-1px', fontWeight: tab === t ? 600 : 400, background: 'none', border: 'none', color: tab === t ? '#1e90ff' : '#7a8fa8', fontFamily: 'Open Sans, sans-serif' } as any)

  async function checkGBP() {
    if (!gbpQuery) return
    setGbpLoading(true)
    setGbpError('')
    try {
      const serpKey = localStorage.getItem('riq_serp_key')
      if (!serpKey) throw new Error('Add your SerpAPI key in Settings first')
      const params2 = new URLSearchParams({ engine: 'google_maps', q: gbpQuery, api_key: serpKey, type: 'search' })
      const res = await fetch(`https://serpapi.com/search.json?${params2}`)
      if (!res.ok) throw new Error('SerpAPI error ' + res.status)
      const data = await res.json()
      const place = data.local_results?.[0]
      if (!place) throw new Error('No business found.')
      setGbpData(place)
    } catch (err: any) { setGbpError(err.message) }
    finally { setGbpLoading(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}><h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Local SEO</h2><p style={{ fontSize: '13px', color: '#7a8fa8' }}>GBP checker, citation tracker, and local rankings</p></div>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <button style={tabBtn('gbp')} onClick={() => setTab('gbp')}>GBP Checker</button>
        <button style={tabBtn('citations')} onClick={() => setTab('citations')}>Citations</button>
        <button style={tabBtn('rankings')} onClick={() => setTab('rankings')}>Local Rankings</button>
      </div>
      {tab === 'gbp' && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>Check a Google Business Profile</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="form-input" placeholder="Business name + city (e.g. Joe's Plumbing San Antonio)" value={gbpQuery} onChange={e => setGbpQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkGBP()} style={{ flex: 1 }} />
              <button className="btn btn-accent" onClick={checkGBP} disabled={gbpLoading}>{gbpLoading ? 'Searching...' : 'Check GBP'}</button>
            </div>
          </div>
          {gbpError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{gbpError}</div>}
          {gbpData && (
            <div style={cardStyle}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>{gbpData.title}</div>
              <div style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginBottom: '8px' }}>{gbpData.type}</div>
              <div style={{ fontSize: '13px', color: '#4a6080', marginBottom: '4px' }}>{gbpData.address}</div>
              {gbpData.rating && <div style={{ fontSize: '13px', color: '#ffa500' }}>{gbpData.rating} ★ ({gbpData.reviews} reviews)</div>}
            </div>
          )}
        </div>
      )}
      {tab === 'citations' && (
        <div style={cardStyle}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Citation Tracker</div>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Enter your business NAP to check citation consistency across major directories.</p>
        </div>
      )}
      {tab === 'rankings' && (
        <div style={cardStyle}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Local Rankings</div>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Check local keyword rankings by location using SerpAPI.</p>
        </div>
      )}
    </div>
  )
}
