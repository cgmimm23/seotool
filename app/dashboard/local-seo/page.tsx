'use client'

import { useState } from 'react'

type Tab = 'gbp' | 'citations' | 'rankings'

export default function LocalSEOPage() {
  const [tab, setTab] = useState<Tab>('gbp')

  // GBP state
  const [gbpQuery, setGbpQuery] = useState('')
  const [gbpLoading, setGbpLoading] = useState(false)
  const [gbpData, setGbpData] = useState<any>(null)
  const [gbpAnalysis, setGbpAnalysis] = useState<any>(null)
  const [gbpError, setGbpError] = useState('')

  // Citations state
  const [napName, setNapName] = useState('')
  const [napAddress, setNapAddress] = useState('')
  const [napPhone, setNapPhone] = useState('')
  const [napCity, setNapCity] = useState('')
  const [napState, setNapState] = useState('')
  const [citLoading, setCitLoading] = useState(false)
  const [citResults, setCitResults] = useState<any[]>([])
  const [citError, setCitError] = useState('')

  // Rankings state
  const [rankKeyword, setRankKeyword] = useState('')
  const [rankLocation, setRankLocation] = useState('')
  const [rankLoading, setRankLoading] = useState(false)
  const [rankResults, setRankResults] = useState<any[]>([])
  const [rankError, setRankError] = useState('')
  const [rankSearched, setRankSearched] = useState('')

  function scoreColor(s: number) {
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  // -- GBP CHECKER ------------------------------------------
  async function checkGBP() {
    if (!gbpQuery) return
    setGbpLoading(true)
    setGbpError('')
    setGbpData(null)
    setGbpAnalysis(null)

    try {
      // Use SerpAPI Google Maps search to find the business
      const serpKey = localStorage.getItem('riq_serp_key')
      if (!serpKey) throw new Error('Add your SerpAPI key in Settings first')

      const params = new URLSearchParams({
        engine: 'google_maps',
        q: gbpQuery,
        api_key: serpKey,
        type: 'search',
      })

      const res = await fetch(`https://serpapi.com/search.json?${params}`)
      if (!res.ok) throw new Error('SerpAPI error ' + res.status)
      const data = await res.json()
      const place = data.local_results?.[0]
      if (!place) throw new Error('No business found. Try a more specific search.')

      setGbpData(place)

      // Now use AI to analyze the listing
      const claudeKey = localStorage.getItem('riq_claude_key')
      if (!claudeKey) throw new Error('Add your Anthropic API key in Settings for AI analysis')

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a local SEO expert. Analyze a Google Business Profile listing and score it. Return ONLY valid JSON, no markdown.

Schema:
{
  "score": 72,
  "grade": "Good",
  "summary": "one sentence",
  "checks": [
    { "status": "pass|fail|warn", "title": "", "detail": "" }
  ]
}

Check for: business name completeness, category accuracy, address presence, phone number, website link, hours of operation, photos count, review count, review rating, review responses, business description, Q&A section, posts activity, attribute completeness. Score 0-100.`,
          messages: [{
            role: 'user',
            content: `Analyze this Google Business Profile listing:\n${JSON.stringify(place, null, 2)}`,
          }],
        }),
      })

      const aiData = await aiRes.json()
      const text = aiData.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''
      let analysis
      try { analysis = JSON.parse(text.replace(/```json|```/g, '').trim()) }
      catch { const m = text.match(/\{[\s\S]*\}/); if (m) analysis = JSON.parse(m[0]) }
      setGbpAnalysis(analysis)

    } catch (err: any) {
      setGbpError(err.message)
    } finally {
      setGbpLoading(false)
    }
  }

  // -- CITATION TRACKER -------------------------------------
  async function checkCitations() {
    if (!napName || !napCity) return
    setCitLoading(true)
    setCitError('')
    setCitResults([])

    try {
      const serpKey = localStorage.getItem('riq_serp_key')
      if (!serpKey) throw new Error('Add your SerpAPI key in Settings first')

      // Search for the business on major directories
      const directories = [
        { name: 'Yelp', query: `site:yelp.com "${napName}" "${napCity}"` },
        { name: 'Yellow Pages', query: `site:yellowpages.com "${napName}" "${napCity}"` },
        { name: 'BBB', query: `site:bbb.org "${napName}" "${napCity}"` },
        { name: 'Angi', query: `site:angi.com "${napName}" "${napCity}"` },
        { name: 'Facebook', query: `site:facebook.com "${napName}" "${napCity}"` },
        { name: 'Apple Maps', query: `site:maps.apple.com "${napName}" "${napCity}"` },
        { name: 'Bing Places', query: `site:bingplaces.com "${napName}"` },
        { name: 'Foursquare', query: `site:foursquare.com "${napName}" "${napCity}"` },
      ]

      const results = await Promise.allSettled(
        directories.map(async (dir) => {
          const params = new URLSearchParams({
            engine: 'google',
            q: dir.query,
            api_key: serpKey,
            num: '3',
          })
          const res = await fetch(`https://serpapi.com/search.json?${params}`)
          const data = await res.json()
          const found = (data.organic_results?.length || 0) > 0
          const result = data.organic_results?.[0]

          // Check NAP consistency if found
          let napMatch = 'unknown'
          if (found && result) {
            const snippet = (result.snippet || '').toLowerCase()
            const title = (result.title || '').toLowerCase()
            const hasName = title.includes(napName.toLowerCase()) || snippet.includes(napName.toLowerCase())
            const hasPhone = napPhone ? snippet.includes(napPhone.replace(/\D/g, '').slice(-7)) : true
            const hasCity = snippet.includes(napCity.toLowerCase()) || title.includes(napCity.toLowerCase())
            napMatch = hasName && hasCity ? (hasPhone ? 'consistent' : 'partial') : 'inconsistent'
          }

          return {
            name: dir.name,
            found,
            url: result?.link || null,
            title: result?.title || null,
            napMatch,
          }
        })
      )

      setCitResults(results.map((r, i) => r.status === 'fulfilled' ? r.value : { name: directories[i].name, found: false, url: null, napMatch: 'unknown' }))
    } catch (err: any) {
      setCitError(err.message)
    } finally {
      setCitLoading(false)
    }
  }

  // -- LOCAL RANKINGS ----------------------------------------
  async function checkLocalRankings() {
    if (!rankKeyword || !rankLocation) return
    setRankLoading(true)
    setRankError('')
    setRankResults([])

    try {
      const serpKey = localStorage.getItem('riq_serp_key')
      if (!serpKey) throw new Error('Add your SerpAPI key in Settings first')

      const params = new URLSearchParams({
        engine: 'google',
        q: rankKeyword,
        location: rankLocation,
        api_key: serpKey,
        num: '10',
        gl: 'us',
        hl: 'en',
      })

      const res = await fetch(`https://serpapi.com/search.json?${params}`)
      if (!res.ok) throw new Error('SerpAPI error ' + res.status)
      const data = await res.json()

      setRankResults(data.organic_results || [])
      setRankSearched(`"${rankKeyword}" in ${rankLocation}`)

      // Also get local pack if available
      if (data.local_results) {
        setRankResults(prev => [...(data.local_results || []).map((r: any) => ({ ...r, isLocal: true })), ...prev])
      }
    } catch (err: any) {
      setRankError(err.message)
    } finally {
      setRankLoading(false)
    }
  }

  const tabStyle = (t: Tab) => ({
    padding: '0.5rem 1.25rem',
    fontSize: '13px',
    color: tab === t ? '#1e90ff' : '#7a8fa8',
    cursor: 'pointer',
    borderBottom: `2px solid ${tab === t ? '#1e90ff' : 'transparent'}`,
    marginBottom: '-1px',
    fontWeight: tab === t ? 600 : 400,
    background: 'none',
    border: 'none',
    fontFamily: 'Open Sans, sans-serif',
  } as any)

  const cardStyle = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Local SEO</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Google Business Profile, citations, and local keyword rankings</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <button style={tabStyle('gbp')} onClick={() => setTab('gbp')}>GBP Checker</button>
        <button style={tabStyle('citations')} onClick={() => setTab('citations')}>Citation Tracker</button>
        <button style={tabStyle('rankings')} onClick={() => setTab('rankings')}>Local Rankings</button>
      </div>

      {/* -- GBP TAB -- */}
      {tab === 'gbp' && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>Search Google Business Profile</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="form-input" placeholder="Business name + city (e.g. Joe's Plumbing San Antonio TX)" value={gbpQuery} onChange={e => setGbpQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkGBP()} style={{ flex: 1 }} />
              <button className="btn btn-accent" onClick={checkGBP} disabled={gbpLoading}>{gbpLoading ? 'Searching...' : 'Check GBP'}</button>
            </div>
          </div>

          {gbpError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{gbpError}</div>}

          {gbpLoading && <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Fetching GBP data and running AI analysis...</div>}

          {gbpData && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                {gbpData.thumbnail && <img src={gbpData.thumbnail} alt="" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 700 }}>{gbpData.title}</div>
                  <div style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '2px' }}>{gbpData.type}</div>
                  <div style={{ fontSize: '13px', color: '#4a6080', marginTop: '4px' }}>{gbpData.address}</div>
                  {gbpData.phone && <div style={{ fontSize: '13px', color: '#4a6080', marginTop: '2px' }}>{gbpData.phone}</div>}
                  {gbpData.rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffa500' }}>{gbpData.rating}</span>
                      <span style={{ fontSize: '12px', color: '#7a8fa8' }}>({gbpData.reviews?.toLocaleString()} reviews)</span>
                    </div>
                  )}
                </div>
                {gbpAnalysis && (
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: `3px solid ${scoreColor(gbpAnalysis.score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(gbpAnalysis.score), lineHeight: 1 }}>{gbpAnalysis.score}</span>
                    <span style={{ fontSize: '9px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>GBP</span>
                  </div>
                )}
              </div>

              {gbpData.hours && (
                <div style={{ fontSize: '12px', color: gbpData.hours.includes('Open') ? '#00d084' : '#ff4444', marginBottom: '0.75rem', fontWeight: 600 }}>{gbpData.hours}</div>
              )}

              {gbpAnalysis && (
                <>
                  <div style={{ fontSize: '13px', color: '#4a6080', marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fb', borderRadius: '8px' }}>{gbpAnalysis.summary}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.5rem' }}>Optimization checks</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {gbpAnalysis.checks?.map((c: any, i: number) => {
                      const colors: any = { pass: '#00d084', fail: '#ff4444', warn: '#ffa500' }
                      const icons: any = { pass: 'OK', fail: 'X', warn: '!' }
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: '10px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', borderLeft: `2px solid ${colors[c.status]}`, background: '#f8f9fb' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `${colors[c.status]}18`, color: colors[c.status], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, marginTop: '1px' }}>{icons[c.status]}</div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{c.title}</div>
                            <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{c.detail}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* -- CITATIONS TAB -- */}
      {tab === 'citations' && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>Enter your NAP (Name, Address, Phone)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label className="form-label">Business Name</label>
                <input type="text" className="form-input" placeholder="Joe's Plumbing" value={napName} onChange={e => setNapName(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input type="text" className="form-input" placeholder="(210) 555-5555" value={napPhone} onChange={e => setNapPhone(e.target.value)} />
              </div>
              <div>
                <label className="form-label">City</label>
                <input type="text" className="form-input" placeholder="San Antonio" value={napCity} onChange={e => setNapCity(e.target.value)} />
              </div>
              <div>
                <label className="form-label">State</label>
                <input type="text" className="form-input" placeholder="TX" value={napState} onChange={e => setNapState(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label className="form-label">Street Address</label>
              <input type="text" className="form-input" placeholder="123 Main St" value={napAddress} onChange={e => setNapAddress(e.target.value)} />
            </div>
            <button className="btn btn-accent" onClick={checkCitations} disabled={citLoading}>{citLoading ? 'Checking directories...' : 'Check Citations'}</button>
          </div>

          {citError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{citError}</div>}

          {citLoading && <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking 8 major directories...</div>}

          {citResults.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>
                Citation Results
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#7a8fa8', marginLeft: '8px' }}>
                  {citResults.filter(r => r.found).length} of {citResults.length} directories found
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {citResults.map((r, i) => {
                  const napColors: any = {
                    consistent: { bg: 'rgba(0,208,132,0.1)', color: '#00d084', label: 'Consistent' },
                    partial: { bg: 'rgba(255,165,0,0.1)', color: '#ffa500', label: 'Partial match' },
                    inconsistent: { bg: 'rgba(255,68,68,0.1)', color: '#ff4444', label: 'Inconsistent' },
                    unknown: { bg: 'rgba(0,0,0,0.05)', color: '#7a8fa8', label: 'Not found' },
                  }
                  const nc = napColors[r.found ? r.napMatch : 'unknown']
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: '12px', alignItems: 'center', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', background: '#f8f9fb' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.name}</div>
                      <div style={{ fontSize: '12px', color: '#7a8fa8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.found ? <a href={r.url} target="_blank" style={{ color: '#1e90ff', textDecoration: 'none' }}>{r.title || r.url}</a> : 'Not found in this directory'}
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: nc.bg, color: nc.color, fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{nc.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -- LOCAL RANKINGS TAB -- */}
      {tab === 'rankings' && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>Check local keyword rankings</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label className="form-label">Keyword</label>
                <input type="text" className="form-input" placeholder="plumber near me" value={rankKeyword} onChange={e => setRankKeyword(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Location</label>
                <input type="text" className="form-input" placeholder="San Antonio, TX" value={rankLocation} onChange={e => setRankLocation(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-accent" onClick={checkLocalRankings} disabled={rankLoading}>{rankLoading ? 'Fetching...' : 'Check Rankings'}</button>
          </div>

          {rankError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{rankError}</div>}

          {rankLoading && <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Fetching local rankings for {rankKeyword}...</div>}

          {rankResults.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>
                Results for {rankSearched}
              </div>
              {rankResults.map((r: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '12px', padding: '0.85rem 0', borderBottom: i < rankResults.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: r.isLocal ? 'rgba(30,144,255,0.1)' : '#f0f4f8', border: r.isLocal ? '1px solid rgba(30,144,255,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', flexShrink: 0, marginTop: '2px', color: r.isLocal ? '#1e90ff' : '#4a6080' }}>
                    {r.isLocal ? 'MAP' : r.position || i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {r.isLocal && <div style={{ fontSize: '10px', color: '#1e90ff', fontFamily: 'Roboto Mono, monospace', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Local Pack</div>}
                    <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '2px', fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.displayed_link || r.address || ''}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e90ff', lineHeight: 1.3 }}>{r.title}</div>
                    {r.snippet && <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '3px', lineHeight: 1.5 }}>{r.snippet}</div>}
                    {r.rating && <div style={{ fontSize: '12px', color: '#ffa500', marginTop: '3px' }}>{r.rating} stars ({r.reviews} reviews)</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
