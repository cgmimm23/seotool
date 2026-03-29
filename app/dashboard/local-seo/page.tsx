'use client'

import { useState } from 'react'

type Tab = 'gbp' | 'citations' | 'rank'

const CITATION_DIRECTORIES = [
  { name: 'Google Business Profile', url: 'google.com/maps', tier: 1 },
  { name: 'Yelp', url: 'yelp.com', tier: 1 },
  { name: 'Facebook', url: 'facebook.com', tier: 1 },
  { name: 'Apple Maps', url: 'maps.apple.com', tier: 1 },
  { name: 'Bing Places', url: 'bingplaces.com', tier: 1 },
  { name: 'Yellow Pages', url: 'yellowpages.com', tier: 1 },
  { name: 'BBB', url: 'bbb.org', tier: 1 },
  { name: 'Foursquare', url: 'foursquare.com', tier: 2 },
  { name: 'Angi', url: 'angi.com', tier: 2 },
  { name: 'Thumbtack', url: 'thumbtack.com', tier: 2 },
  { name: 'Houzz', url: 'houzz.com', tier: 2 },
  { name: 'HomeAdvisor', url: 'homeadvisor.com', tier: 2 },
  { name: 'Alignable', url: 'alignable.com', tier: 2 },
  { name: 'Manta', url: 'manta.com', tier: 2 },
  { name: 'Superpages', url: 'superpages.com', tier: 3 },
  { name: 'MerchantCircle', url: 'merchantcircle.com', tier: 3 },
  { name: 'EZlocal', url: 'ezlocal.com', tier: 3 },
]

const POPULAR_LOCATIONS = [
  'San Antonio, TX', 'Houston, TX', 'Dallas, TX', 'Austin, TX',
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Phoenix, AZ',
]

export default function LocalSEOPage() {
  const [tab, setTab] = useState<Tab>('gbp')

  // GBP state
  const [gbpName, setGbpName] = useState('')
  const [gbpCity, setGbpCity] = useState('')
  const [gbpLoading, setGbpLoading] = useState(false)
  const [gbpResult, setGbpResult] = useState<any>(null)
  const [gbpError, setGbpError] = useState('')

  // Citation state
  const [citName, setCitName] = useState('')
  const [citPhone, setCitPhone] = useState('')
  const [citAddress, setCitAddress] = useState('')
  const [citCity, setCitCity] = useState('')
  const [citLoading, setCitLoading] = useState(false)
  const [citResults, setCitResults] = useState<any[]>([])
  const [citNapScore, setCitNapScore] = useState(0)
  const [citAnalyzed, setCitAnalyzed] = useState(false)
  const [citError, setCitError] = useState('')

  // Rank state
  const [rankKeyword, setRankKeyword] = useState('')
  const [rankLocation, setRankLocation] = useState('')
  const [rankDomain, setRankDomain] = useState('')
  const [rankLoading, setRankLoading] = useState(false)
  const [rankResults, setRankResults] = useState<any[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [rankSearched, setRankSearched] = useState({ keyword: '', location: '' })
  const [rankError, setRankError] = useState('')

  function scoreColor(s: number) {
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  function getClaudeKey() {
    const key = localStorage.getItem('riq_claude_key')
    if (!key) throw new Error('Add your Anthropic API key in Settings first')
    return key
  }

  function getSerpKey() {
    const key = localStorage.getItem('riq_serp_key')
    if (!key) throw new Error('Add your SerpAPI key in Settings first')
    return key
  }

  async function callClaude(system: string, userMsg: string) {
    const key = getClaudeKey()
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, tools: [{ type: 'web_search_20250305', name: 'web_search' }], system, messages: [{ role: 'user', content: userMsg }] }),
    })
    const data = await res.json()
    const text = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''
    try { return JSON.parse(text.replace(/```json|```/g, '').trim()) }
    catch { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('Could not parse response') }
  }

  async function analyzeGBP() {
    if (!gbpName || !gbpCity) return
    setGbpLoading(true); setGbpError(''); setGbpResult(null)
    try {
      const result = await callClaude(
        `You are a local SEO expert. Analyze the Google Business Profile for the given business. Return ONLY valid JSON no markdown.
Schema: {"business_name":"","city":"","overall_score":72,"grade":"Good","summary":"one sentence","review_score":4.5,"review_count":124,"categories":{"Profile Completeness":80,"Reviews":75,"Photos":60,"Posts Activity":40,"Q&A":50,"Citations":70},"checks":[{"status":"pass|fail|warn","category":"","title":"","detail":""}],"top_issues":["Issue 1"]}
Check: business name, address, phone, website, hours, categories, description, photos, review count and rating, owner responses, Google Posts, Q&A, services, booking link. Score 0-100.`,
        `Analyze GBP for: ${gbpName} in ${gbpCity}`
      )
      setGbpResult(result)
    } catch (err: any) { setGbpError(err.message) }
    finally { setGbpLoading(false) }
  }

  async function analyzeCitations() {
    if (!citName || !citCity) return
    setCitLoading(true); setCitError(''); setCitResults([]); setCitAnalyzed(false)
    try {
      const result = await callClaude(
        `You are a local SEO citation expert. Search for the business across major directories and check NAP consistency. Return ONLY valid JSON no markdown.
Schema: {"nap_score":72,"nap_summary":"one sentence","directories":[{"name":"Google Business Profile","status":"found|not_found|inconsistent","nap_match":true,"issues":""}]}
Check: Google Business Profile, Yelp, Facebook, Apple Maps, Bing Places, Yellow Pages, BBB. Score NAP consistency 0-100.`,
        `Check citations for: ${citName}, ${citAddress || ''} ${citCity}, Phone: ${citPhone || 'unknown'}`
      )
      setCitNapScore(result.nap_score || 0)
      const aiDirs = result.directories || []
      const merged = CITATION_DIRECTORIES.map(dir => {
        const found = aiDirs.find((d: any) => d.name.toLowerCase().includes(dir.name.toLowerCase().split(' ')[0]))
        return { ...dir, status: found?.status || 'unknown', nap_match: found?.nap_match ?? null, issues: found?.issues || '' }
      })
      setCitResults(merged)
      setCitAnalyzed(true)
    } catch (err: any) { setCitError(err.message) }
    finally { setCitLoading(false) }
  }

  async function checkLocalRank() {
    if (!rankKeyword || !rankLocation) return
    setRankLoading(true); setRankError(''); setRankResults([]); setMyRank(null)
    try {
      const serpKey = getSerpKey()
      const params = new URLSearchParams({ q: rankKeyword, api_key: serpKey, engine: 'google', location: rankLocation, hl: 'en', gl: 'us', num: '20' })
      const res = await fetch(`https://serpapi.com/search.json?${params}`)
      if (!res.ok) throw new Error('SerpAPI error ' + res.status)
      const data = await res.json()
      const organic = data.organic_results || []
      setRankResults(organic.slice(0, 20))
      setRankSearched({ keyword: rankKeyword, location: rankLocation })
      if (rankDomain) {
        const domain = rankDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        const rank = organic.findIndex((r: any) => (r.link || '').replace(/^https?:\/\//, '').replace(/^www\./, '').startsWith(domain))
        setMyRank(rank >= 0 ? rank + 1 : null)
      }
    } catch (err: any) { setRankError(err.message) }
    finally { setRankLoading(false) }
  }

  function statusColor(s: string) {
    if (s === 'found') return { color: '#00d084', bg: 'rgba(0,208,132,0.1)', label: 'Found' }
    if (s === 'inconsistent') return { color: '#ffa500', bg: 'rgba(255,165,0,0.1)', label: 'Inconsistent' }
    if (s === 'not_found') return { color: '#ff4444', bg: 'rgba(255,68,68,0.1)', label: 'Not Listed' }
    return { color: '#7a8fa8', bg: 'rgba(0,0,0,0.05)', label: 'Unknown' }
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const tabStyle = (t: Tab) => ({ padding: '0.5rem 1rem', fontSize: '13px', color: tab === t ? '#1e90ff' : '#7a8fa8', cursor: 'pointer', borderBottom: `2px solid ${tab === t ? '#1e90ff' : 'transparent'}`, marginBottom: '-1px', fontWeight: tab === t ? 600 : 400, background: 'none', border: 'none', fontFamily: 'Open Sans, sans-serif' })

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Local SEO</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>GBP analysis, citation tracking, and local rank checking</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <button style={tabStyle('gbp')} onClick={() => setTab('gbp')}>GBP Checker</button>
        <button style={tabStyle('citations')} onClick={() => setTab('citations')}>Citation Tracker</button>
        <button style={tabStyle('rank')} onClick={() => setTab('rank')}>Local Rank Tracker</button>
      </div>

      {/* GBP TAB */}
      {tab === 'gbp' && (
        <>
          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
              <input type="text" className="form-input" placeholder="Business name" value={gbpName} onChange={e => setGbpName(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyzeGBP()} />
              <input type="text" className="form-input" placeholder="City, State" value={gbpCity} onChange={e => setGbpCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyzeGBP()} />
              <button className="btn btn-accent" onClick={analyzeGBP} disabled={gbpLoading} style={{ whiteSpace: 'nowrap' }}>{gbpLoading ? 'Analyzing...' : 'Check GBP'}</button>
            </div>
          </div>
          {gbpError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{gbpError}</div>}
          {gbpLoading && <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Analyzing GBP for {gbpName}...</div>}
          {gbpResult && (
            <>
              <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: `3px solid ${scoreColor(gbpResult.overall_score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(gbpResult.overall_score), lineHeight: 1 }}>{gbpResult.overall_score}</span>
                  <span style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{gbpResult.grade}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700 }}>{gbpResult.business_name}</div>
                  <div style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '4px' }}>{gbpResult.city}</div>
                  <div style={{ fontSize: '14px', color: '#4a6080' }}>{gbpResult.summary}</div>
                  <div style={{ fontSize: '13px', color: '#ffa500', marginTop: '6px', fontWeight: 600 }}>{gbpResult.review_score} stars - {gbpResult.review_count} reviews</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
                {Object.entries(gbpResult.categories || {}).map(([name, score]: any) => (
                  <div key={name} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>{name}</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(score) }}>{score}</div>
                    <div style={{ height: '3px', background: '#e4eaf0', borderRadius: '2px', marginTop: '6px' }}><div style={{ width: `${score}%`, height: '100%', background: scoreColor(score), borderRadius: '2px' }} /></div>
                  </div>
                ))}
              </div>
              {gbpResult.top_issues?.length > 0 && (
                <div style={card}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '0.75rem' }}>Top Issues</div>
                  {gbpResult.top_issues.map((issue: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < gbpResult.top_issues.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,165,0,0.1)', color: '#ffa500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, fontFamily: 'Roboto Mono, monospace' }}>{i + 1}</div>
                      <div style={{ fontSize: '13px', color: '#4a6080' }}>{issue}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={card}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>All Checks</div>
                {['fail', 'warn', 'pass'].map(status => {
                  const items = gbpResult.checks?.filter((c: any) => c.status === status) || []
                  if (!items.length) return null
                  const colors: any = { fail: '#ff4444', warn: '#ffa500', pass: '#00d084' }
                  const labels: any = { fail: 'Errors', warn: 'Warnings', pass: 'Passing' }
                  return (
                    <div key={status} style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.5rem' }}>{labels[status]} ({items.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {items.map((c: any, i: number) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', borderLeft: `2px solid ${colors[status]}`, background: '#f8f9fb' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `${colors[status]}18`, color: colors[status], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>!</div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{c.title}</div>
                              <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{c.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* CITATIONS TAB */}
      {tab === 'citations' && (
        <>
          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <input type="text" className="form-input" placeholder="Business name" value={citName} onChange={e => setCitName(e.target.value)} />
              <input type="text" className="form-input" placeholder="Phone number" value={citPhone} onChange={e => setCitPhone(e.target.value)} />
              <input type="text" className="form-input" placeholder="Street address" value={citAddress} onChange={e => setCitAddress(e.target.value)} />
              <input type="text" className="form-input" placeholder="City, State" value={citCity} onChange={e => setCitCity(e.target.value)} />
            </div>
            <button className="btn btn-accent" onClick={analyzeCitations} disabled={citLoading}>{citLoading ? 'Checking citations...' : 'Check Citations'}</button>
          </div>
          {citError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{citError}</div>}
          {citLoading && <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking {CITATION_DIRECTORIES.length} directories...</div>}
          {citAnalyzed && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
                {[
                  { label: 'NAP Score', value: citNapScore, color: scoreColor(citNapScore) },
                  { label: 'Listed', value: citResults.filter(r => r.status === 'found').length, color: '#00d084' },
                  { label: 'Inconsistent', value: citResults.filter(r => r.status === 'inconsistent').length, color: '#ffa500' },
                  { label: 'Not Listed', value: citResults.filter(r => r.status === 'not_found').length, color: '#ff4444' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Directory Status</div>
                {[1, 2, 3].map(tier => (
                  <div key={tier} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.5rem' }}>Tier {tier} {tier === 1 ? '- Most Important' : tier === 2 ? '- High Value' : '- Standard'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {citResults.filter(r => r.tier === tier).map((dir, i) => {
                        const s = statusColor(dir.status)
                        return (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', background: '#f8f9fb' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{dir.name}</div>
                              {dir.issues && <div style={{ fontSize: '12px', color: '#ffa500', marginTop: '2px' }}>{dir.issues}</div>}
                            </div>
                            <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{s.label}</span>
                            <a href={`https://${dir.url}`} target="_blank" style={{ fontSize: '11px', color: '#1e90ff', textDecoration: 'none' }}>Visit</a>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* RANK TAB */}
      {tab === 'rank' && (
        <>
          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
              <input type="text" className="form-input" placeholder="Keyword" value={rankKeyword} onChange={e => setRankKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkLocalRank()} />
              <input type="text" className="form-input" placeholder="City, State or ZIP" value={rankLocation} onChange={e => setRankLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkLocalRank()} />
              <input type="text" className="form-input" placeholder="Your domain (optional)" value={rankDomain} onChange={e => setRankDomain(e.target.value)} />
              <button className="btn btn-accent" onClick={checkLocalRank} disabled={rankLoading} style={{ whiteSpace: 'nowrap' }}>{rankLoading ? 'Checking...' : 'Check Rank'}</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {POPULAR_LOCATIONS.map(loc => (
                <button key={loc} onClick={() => setRankLocation(loc)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${rankLocation === loc ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: rankLocation === loc ? 'rgba(30,144,255,0.08)' : 'transparent', color: rankLocation === loc ? '#1e90ff' : '#7a8fa8', fontFamily: 'Open Sans, sans-serif' }}>{loc}</button>
              ))}
            </div>
          </div>
          {rankError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{rankError}</div>}
          {rankLoading && <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Fetching local rankings for "{rankKeyword}" in {rankLocation}...</div>}
          {rankResults.length > 0 && (
            <>
              {myRank !== null && (
                <div style={{ background: myRank <= 3 ? 'rgba(0,208,132,0.08)' : myRank <= 10 ? 'rgba(255,165,0,0.08)' : 'rgba(255,68,68,0.08)', border: `1px solid ${myRank <= 3 ? 'rgba(0,208,132,0.3)' : myRank <= 10 ? 'rgba(255,165,0,0.3)' : 'rgba(255,68,68,0.3)'}`, borderRadius: '12px', padding: '1.1rem 1.5rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: myRank <= 3 ? '#00d084' : myRank <= 10 ? '#ffa500' : '#ff4444' }}>#{myRank}</div>
                  <div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>{rankDomain}</div>
                    <div style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '2px' }}>Ranking #{myRank} for "{rankSearched.keyword}" in {rankSearched.location}</div>
                  </div>
                </div>
              )}
              {myRank === null && rankDomain && (
                <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '12px', fontSize: '13px', color: '#ff4444' }}>
                  {rankDomain} not found in top 20 results for "{rankSearched.keyword}" in {rankSearched.location}
                </div>
              )}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>"{rankSearched.keyword}" in {rankSearched.location}</div>
                  <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{rankResults.length} results</span>
                </div>
                {rankResults.map((r: any, i: number) => {
                  const domain = (r.link || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
                  const isMe = rankDomain && domain.includes(rankDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0])
                  return (
                    <div key={i} style={{ display: 'flex', gap: '12px', padding: '0.85rem 0', borderBottom: i < rankResults.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'flex-start' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: isMe ? 'rgba(30,144,255,0.1)' : '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', flexShrink: 0, marginTop: '2px', color: isMe ? '#1e90ff' : '#4a6080', border: isMe ? '1px solid rgba(30,144,255,0.3)' : 'none' }}>{r.position || i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '2px', fontFamily: 'Roboto Mono, monospace' }}>{r.displayed_link || domain}</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a73e8', lineHeight: 1.3 }}>{r.title}</div>
                        <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '3px', lineHeight: 1.5 }}>{r.snippet}</div>
                      </div>
                      {isMe && <span style={{ fontSize: '10px', background: 'rgba(30,144,255,0.1)', color: '#1e90ff', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', fontFamily: 'Roboto Mono, monospace', alignSelf: 'center' }}>Your site</span>}
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {!rankLoading && rankResults.length === 0 && !rankError && (
            <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>Enter a keyword and location</div>
              <div style={{ fontSize: '13px' }}>See exactly where you rank in any city or zip code</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
