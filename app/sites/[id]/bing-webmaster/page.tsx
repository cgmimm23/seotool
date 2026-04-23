'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

type Tab = 'overview' | 'keywords' | 'crawl' | 'submit' | 'add'

function BingWebmasterInner({ params }: { params: { id: string } }) {
  const [siteUrl, setSiteUrl] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [submitUrl, setSubmitUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)
  const [submitError, setSubmitError] = useState('')

  // Add/verify site state
  const [newSiteUrl, setNewSiteUrl] = useState('')
  const [addResult, setAddResult] = useState('')
  const [addError, setAddError] = useState('')
  const [verifyResult, setVerifyResult] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [bingAuthCode, setBingAuthCode] = useState('')

  async function addSite() {
    if (!newSiteUrl) return
    setAddResult(''); setAddError('')
    try {
      const res = await fetch('/api/bing-webmaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'add-site', siteUrl: newSiteUrl, siteId: params.id }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok) {
        setAddResult('Site added. Now add the verification meta tag or file, then click Verify.')
        loadBingSites()
      } else {
        setAddError(j.details || j.error || `HTTP ${res.status}`)
      }
    } catch (e: any) { setAddError(e.message) }
  }

  async function verifySite() {
    if (!newSiteUrl) return
    setVerifyResult(''); setVerifyError('')
    try {
      const res = await fetch('/api/bing-webmaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'verify-site', siteUrl: newSiteUrl, siteId: params.id }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok) {
        setVerifyResult('Verification request sent. Recheck the sites dropdown in a moment.')
        loadBingSites()
      } else {
        setVerifyError(j.details || j.error || `HTTP ${res.status}`)
      }
    } catch (e: any) { setVerifyError(e.message) }
  }
  const [bingKey, setBingKey] = useState('')
  const [hasBingKey, setHasBingKey] = useState<boolean | null>(null)
  const [savingKey, setSavingKey] = useState(false)
  const [bingSites, setBingSites] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url, bing_api_key, bing_site_url').eq('id', params.id).single()
      const s = site as any
      if (s?.bing_site_url) { setSiteUrl(s.bing_site_url); setSubmitUrl(s.bing_site_url) }
      else if (s?.url) { setSiteUrl(s.url); setSubmitUrl(s.url) }
      setHasBingKey(!!s?.bing_api_key)
      if (s?.bing_api_key) loadBingSites()
    }
    load()
  }, [params.id])

  async function loadBingSites() {
    try {
      const res = await fetch(`/api/bing-webmaster?endpoint=sites&siteUrl=&siteId=${params.id}`)
      const j = await res.json()
      const list = (j.d || []).map((s: any) => s.Url || s.url).filter(Boolean)
      setBingSites(list)
    } catch {}
  }

  async function changeBingSite(url: string) {
    setSiteUrl(url)
    setSubmitUrl(url)
    setData(null)
    await supabase.from('sites').update({ bing_site_url: url }).eq('id', params.id)
  }

  async function saveBingKey() {
    if (!bingKey.trim()) return
    setSavingKey(true)
    const { error: e } = await supabase.from('sites').update({ bing_api_key: bingKey.trim() }).eq('id', params.id)
    setSavingKey(false)
    if (e) { alert('Could not save key: ' + e.message); return }
    setBingKey('')
    setHasBingKey(true)
  }

  async function disconnectBing() {
    if (!confirm('Remove Bing Webmaster API key from this site?')) return
    await supabase.from('sites').update({ bing_api_key: null }).eq('id', params.id)
    setHasBingKey(false)
    setData(null)
  }

  async function fetchData() {
    if (!siteUrl) return
    setLoading(true)
    setError('')
    try {
      const q = `siteId=${params.id}&siteUrl=${encodeURIComponent(siteUrl)}`
      const [statsRes, keywordsRes, errorsRes] = await Promise.allSettled([
        fetch(`/api/bing-webmaster?endpoint=crawl-stats&${q}`),
        fetch(`/api/bing-webmaster?endpoint=keywords&${q}`),
        fetch(`/api/bing-webmaster?endpoint=crawl-issues&${q}`),
      ])

      const stats = statsRes.status === 'fulfilled' ? await statsRes.value.json() : null
      const keywords = keywordsRes.status === 'fulfilled' ? await keywordsRes.value.json() : null
      const errors = errorsRes.status === 'fulfilled' ? await errorsRes.value.json() : null

      setData({ stats, keywords, errors })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitUrlToBing() {
    if (!submitUrl) return
    setSubmitting(true)
    setSubmitResult(null)
    setSubmitError('')
    try {
      const res = await fetch('/api/bing-webmaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'submit-url', siteUrl, url: submitUrl, siteId: params.id }),
      })
      if (res.ok) {
        setSubmitResult('success')
      } else {
        const j = await res.json().catch(() => ({}))
        setSubmitError(j.details || j.error || `HTTP ${res.status}`)
        setSubmitResult('error')
      }
    } catch (e: any) {
      setSubmitError(e.message)
      setSubmitResult('error')
    } finally {
      setSubmitting(false)
    }
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const tabBtn = (t: Tab) => ({ padding: '0.5rem 1rem', fontSize: '13px', color: tab === t ? '#1e90ff' : '#7a8fa8', cursor: 'pointer', borderBottom: `2px solid ${tab === t ? '#1e90ff' : 'transparent'}`, marginBottom: '-1px', fontWeight: tab === t ? 600 : 400, background: 'none', border: 'none', fontFamily: 'Open Sans, sans-serif' } as any)

  if (hasBingKey === false) return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Bing Webmaster Tools</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Connect Bing Webmaster for this site</p>
      </div>
      <div style={{ ...card, padding: '2rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Add your Bing Webmaster API key</div>
        <p style={{ fontSize: '13px', color: '#7a8fa8', lineHeight: 1.6, marginBottom: '1rem' }}>
          1. Go to <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener" style={{ color: '#1e90ff' }}>bing.com/webmasters</a> and sign in.<br />
          2. Click <strong>Settings (gear icon) → API Access → Generate</strong>.<br />
          3. Copy the key and paste it here. We store it only for this site.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={bingKey}
            onChange={e => setBingKey(e.target.value)}
            placeholder="Paste your Bing API key"
            className="form-input"
            style={{ flex: 1, fontFamily: 'Roboto Mono, monospace', fontSize: '12px' }}
          />
          <button onClick={saveBingKey} className="btn btn-accent" disabled={savingKey || !bingKey.trim()} style={{ fontSize: '12px' }}>
            {savingKey ? 'Saving…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Bing Webmaster Tools</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Crawl stats, keyword data, and URL submission</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={disconnectBing} className="btn btn-ghost" style={{ fontSize: '12px' }}>Disconnect Bing</button>
        <button onClick={fetchData} disabled={loading} className="btn btn-accent" style={{ fontSize: '12px' }}>
          {loading ? 'Loading...' : 'Load Data'}
        </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(0,208,132,0.08)', border: '1px solid rgba(0,208,132,0.2)', borderRadius: '8px', fontSize: '12px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d084' }} />
        <div style={{ color: '#0d1b2e', fontWeight: 600 }}>Bing connected for this site</div>
      </div>

      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Site</div>
        <select value={siteUrl} onChange={e => changeBingSite(e.target.value)} className="form-input" style={{ flex: 1, minWidth: '260px', fontSize: '13px' }}>
          {bingSites.length === 0 && siteUrl && <option value={siteUrl}>{siteUrl}</option>}
          {bingSites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <button style={tabBtn('overview')} onClick={() => setTab('overview')}>Overview</button>
        <button style={tabBtn('keywords')} onClick={() => setTab('keywords')}>Keywords</button>
        <button style={tabBtn('crawl')} onClick={() => setTab('crawl')}>Crawl Issues</button>
        <button style={tabBtn('submit')} onClick={() => setTab('submit')}>Submit URL</button>
        <button style={tabBtn('add')} onClick={() => setTab('add')}>Add Site</button>
      </div>

      {tab === 'overview' && (
        data?.stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
            {[
              { label: 'Pages Crawled', value: data.stats.d?.CrawledPages?.toLocaleString() || '—' },
              { label: 'Pages Indexed', value: data.stats.d?.IndexedPages?.toLocaleString() || '—' },
              { label: 'Crawl Errors', value: data.stats.d?.CrawlErrors?.toLocaleString() || '—' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{s.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
            <div style={{ fontSize: '13px' }}>Click Load Data to fetch your Bing Webmaster stats</div>
          </div>
        )
      )}

      {tab === 'keywords' && (
        data?.keywords?.d?.KeywordStats?.length > 0 ? (
          <div style={card}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Keyword Performance</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Keyword', 'Impressions', 'Clicks', 'CTR', 'Avg Position'].map(h => <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>)}</tr></thead>
              <tbody>
                {data.keywords.d.KeywordStats.map((k: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', color: '#0d1b2e' }}>{k.Query}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{k.Impressions?.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', fontWeight: 600, color: '#1e90ff' }}>{k.Clicks?.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', color: '#00d084', fontFamily: 'Roboto Mono, monospace' }}>{k.Ctr ? (k.Ctr * 100).toFixed(1) + '%' : '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: '#ffa500' }}>#{k.AvgPosition?.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
            <div style={{ fontSize: '13px' }}>{data ? 'No keyword data available.' : 'Click Load Data to see keyword performance.'}</div>
          </div>
        )
      )}

      {tab === 'crawl' && (
        data?.errors?.d?.length > 0 ? (
          <div style={card}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Crawl Issues ({data.errors.d.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.errors.d.slice(0, 50).map((issue: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '0.65rem 0.75rem', borderRadius: '8px', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,68,68,0.1)', color: '#ff4444', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{issue.ErrorCode || 'Error'}</span>
                  <span style={{ fontSize: '12px', color: '#4a6080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{issue.Url}</span>
                  <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{issue.LastCrawled ? new Date(issue.LastCrawled).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
            <div style={{ fontSize: '13px' }}>{data ? '✓ No crawl issues found.' : 'Click Load Data to see crawl issues.'}</div>
          </div>
        )
      )}

      {tab === 'submit' && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Submit URL to Bing</div>
          <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1rem' }}>Submit a URL to be crawled and indexed by Bing immediately.</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input type="text" placeholder="https://yoursite.com/page" value={submitUrl} onChange={e => setSubmitUrl(e.target.value)} style={{ flex: 1, background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Roboto Mono, monospace' }} />
            <button onClick={submitUrlToBing} disabled={submitting || !submitUrl} className="btn btn-accent" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
              {submitting ? 'Submitting...' : submitResult === 'success' ? '✓ Submitted!' : 'Submit URL'}
            </button>
          </div>
          {submitResult === 'success' && <div style={{ fontSize: '13px', color: '#00d084' }}>✓ URL successfully submitted to Bing for indexing.</div>}
          {submitResult === 'error' && <div style={{ fontSize: '13px', color: '#ff4444' }}>Submission failed: {submitError || 'unknown error'}</div>}
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '8px', fontSize: '12px', color: '#4a6080' }}>
            Bing allows up to 10 URL submissions per day on the free tier.
          </div>
        </div>
      )}

      {tab === 'add' && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Add & Verify a Site</div>
          <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1rem' }}>Add a new site to Bing Webmaster Tools and trigger verification.</p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            <input type="text" placeholder="https://yoursite.com" value={newSiteUrl} onChange={e => setNewSiteUrl(e.target.value)} className="form-input" style={{ flex: 1, fontSize: '13px' }} />
            <button onClick={addSite} disabled={!newSiteUrl} className="btn btn-accent" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Add Site</button>
          </div>
          {addResult && <div style={{ fontSize: '12px', color: '#00d084', marginBottom: '8px' }}>{addResult}</div>}
          {addError && <div style={{ fontSize: '12px', color: '#ff4444', marginBottom: '8px' }}>{addError}</div>}

          <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '1.25rem', marginBottom: '8px' }}>Step 2 — Verify ownership</div>
          <p style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '10px' }}>Pick ONE of these methods and place it on your site:</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
            <div style={{ padding: '10px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Option 1: Meta tag</div>
              <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '6px' }}>Get your auth code from <a href="https://www.bing.com/webmasters/home/mysites" target="_blank" rel="noreferrer" style={{ color: '#1e90ff' }}>bing.com/webmasters</a>, paste below to preview the tag.</div>
              <input type="text" placeholder="Bing auth code" value={bingAuthCode} onChange={e => setBingAuthCode(e.target.value)} className="form-input" style={{ fontSize: '12px', marginBottom: '6px', fontFamily: 'Roboto Mono, monospace' }} />
              <code style={{ display: 'block', background: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: '#0d1b2e', border: '1px solid rgba(0,0,0,0.08)', wordBreak: 'break-all' }}>
                &lt;meta name=&quot;msvalidate.01&quot; content=&quot;{bingAuthCode || 'YOUR_BING_AUTH_CODE'}&quot; /&gt;
              </code>
              <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '4px' }}>Add this inside the &lt;head&gt; of your homepage.</div>
            </div>

            <div style={{ padding: '10px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Option 2: XML file</div>
              <div style={{ fontSize: '12px', color: '#7a8fa8' }}>Download <code>BingSiteAuth.xml</code> from your Bing Webmaster dashboard and upload to <code>yoursite.com/BingSiteAuth.xml</code>.</div>
            </div>

            <div style={{ padding: '10px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Option 3: DNS CNAME</div>
              <div style={{ fontSize: '12px', color: '#7a8fa8' }}>Add CNAME <code>[code]</code> pointing to <code>verify.bing.com</code>. Code is shown in Bing Webmaster dashboard after adding the site.</div>
            </div>
          </div>

          <button onClick={verifySite} disabled={!newSiteUrl} className="btn btn-accent" style={{ fontSize: '12px' }}>Verify Now</button>
          {verifyResult && <div style={{ fontSize: '12px', color: '#00d084', marginTop: '8px' }}>{verifyResult}</div>}
          {verifyError && <div style={{ fontSize: '12px', color: '#ff4444', marginTop: '8px' }}>{verifyError}</div>}
        </div>
      )}
    </div>
  )
}

export default function BingWebmasterPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <BingWebmasterInner params={params} />
    </Suspense>
  )
}
