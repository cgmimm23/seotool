'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

type Tab = 'overview' | 'keywords' | 'crawl' | 'submit'

function BingWebmasterInner({ params }: { params: { id: string } }) {
  const [siteUrl, setSiteUrl] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [submitUrl, setSubmitUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)
  const [bingKey, setBingKey] = useState('')
  const [hasBingKey, setHasBingKey] = useState<boolean | null>(null)
  const [savingKey, setSavingKey] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url, bing_api_key').eq('id', params.id).single()
      if (site?.url) { setSiteUrl(site.url); setSubmitUrl(site.url) }
      setHasBingKey(!!site?.bing_api_key)
    }
    load()
  }, [params.id])

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
    try {
      const res = await fetch('/api/bing-webmaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'submit-url', siteUrl, url: submitUrl, siteId: params.id }),
      })
      setSubmitResult(res.ok ? 'success' : 'error')
    } catch {
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

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <button style={tabBtn('overview')} onClick={() => setTab('overview')}>Overview</button>
        <button style={tabBtn('keywords')} onClick={() => setTab('keywords')}>Keywords</button>
        <button style={tabBtn('crawl')} onClick={() => setTab('crawl')}>Crawl Issues</button>
        <button style={tabBtn('submit')} onClick={() => setTab('submit')}>Submit URL</button>
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
          {submitResult === 'error' && <div style={{ fontSize: '13px', color: '#ff4444' }}>Submission failed. Please try again.</div>}
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '8px', fontSize: '12px', color: '#4a6080' }}>
            Bing allows up to 10 URL submissions per day on the free tier.
          </div>
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
