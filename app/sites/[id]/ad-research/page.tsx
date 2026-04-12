'use client'

import { useState } from 'react'

export default function AdResearchPage() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  async function research() {
    if (!domain) return
    setLoading(true)

    const serpKey = '/api/local-seo'
    const res = await fetch('/api/ai-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Analyze the advertising strategy for the website: ${domain}

Research and provide:
1. **Estimated Ad Spend**: Based on the industry and domain, estimate their monthly Google Ads spend range
2. **Likely Top Keywords**: List 10 keywords they're probably bidding on based on their business
3. **Ad Copy Analysis**: Write 3 example ad copies they might be running (headline + description)
4. **Landing Page Strategy**: What pages they likely send ad traffic to
5. **Competitive Positioning**: How they position themselves in paid search
6. **Opportunities**: 3-5 keyword opportunities where you could compete against them in paid search

Be specific and actionable. Format with clear headers.`,
        max_tokens: 1500,
      }),
    })

    const data = await res.json()
    setResults(data.text || 'No results')
    setLoading(false)
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', padding: '0.6rem 0.85rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Advertising Research</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>AI analyzes competitor ad strategies, estimated spend, and keyword opportunities</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px' }}>Competitor Domain</label>
            <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="competitor.com" style={inputStyle} />
          </div>
          <button onClick={research} disabled={loading || !domain} className="btn btn-accent" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            {loading ? 'Researching...' : 'Research Ads'}
          </button>
        </div>
      </div>

      {results && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#2367a0' }}>AI Ad Research Results</div>
          <div style={{ fontSize: '14px', color: '#4a6080', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{results}</div>
        </div>
      )}

      {!results && !loading && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📢</div>
          <p style={{ fontSize: '14px' }}>Enter a competitor domain to analyze their advertising strategy with AI.</p>
        </div>
      )}
    </div>
  )
}
