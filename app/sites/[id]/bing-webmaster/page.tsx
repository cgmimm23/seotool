'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Tab = 'overview' | 'keywords' | 'crawl' | 'submit'

function BingWebmasterInner({ params }: { params: { id: string } }) {
  const [siteUrl, setSiteUrl] = useState('')
  const [connected, setConnected] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [submitUrl, setSubmitUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url').eq('id', params.id).single()
      if (site?.url) { setSiteUrl(site.url); setSubmitUrl(site.url) }

      // Check if connected via cookie by making a test API call
      const res = await fetch(`/api/bing-webmaster?endpoint=sites&siteUrl=test`)
      if (res.status !== 401) setConnected(true)
      setCheckingAuth(false)

      // Handle redirect back from OAuth
      if (searchParams.get('microsoft_connected') === 'true') {
        setConnected(true)
      }
      if (searchParams.get('error')) {
        setError('Microsoft connection failed. Please try again.')
      }
    }
    load()
  }, [params.id])

  function connectMicrosoft() {
    window.location.href = `/auth/microsoft?siteId=${params.id}&returnTo=/sites/${params.id}/bing-webmaster`
  }

  async function fetchData() {
    if (!siteUrl) return
    setLoading(true)
    setError('')
    try {
      const [statsRes, keywordsRes, errorsRes] = await Promise.allSettled([
        fetch(`/api/bing-webmaster?endpoint=crawl-stats&siteUrl=${encodeURIComponent(siteUrl)}`),
        fetch(`/api/bing-webmaster?endpoint=keywords&siteUrl=${encodeURIComponent(siteUrl)}`),
        fetch(`/api/bing-webmaster?endpoint=crawl-issues&siteUrl=${encodeURIComponent(siteUrl)}`),
      ])

      const stats = statsRes.status === 'fulfilled' ? await statsRes.value.json() : null
      const keywords = keywordsRes.status === 'fulfilled' ? await keywordsRes.value.json() : null
      const errors = errorsRes.status === 'fulfilled' ? await errorsRes.value.json() : null

      // Check if any returned 401
      if (stats?.error === 'not_connected') { setConnected(false); return }

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
        body: JSON.stringify({ endpoint: 'submit-url', siteUrl, url: submitUrl }),
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

  if (checkingAuth) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking Microsoft connection...</div>

  if (!connected) return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Bing Webmaster Tools</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Crawl stats, keyword data, and URL submission</p>
      </div>
      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Connect Microsoft Account</div>
        <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>Connect your Microsoft account to access Bing Webmaster Tools — crawl stats, keyword data, crawl errors, and URL submission.</p>
        <button onClick={connectMicrosoft} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#0078d4', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '14px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', color: '#fff', fontWeight: 600 }}>
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#00a4ef" d="M11 0h10v10H11z"/><path fill="#7fba00" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg>
          Connect with Microsoft
        </button>
        <p style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '1rem' }}>You'll be redirected to Microsoft to sign in with your account.</p>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Bing Webmaster Tools</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Crawl stats, keyword data, and URL submission</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#00d084', fontFamily: 'Roboto Mono, monospace' }}>● Connected</span>
          <button onClick={fetchData} disabled={loading} className="btn btn-accent" style={{ fontSize: '12px' }}>
            {loading ? 'Loading...' : 'Load Data'}
          </button>
          <button onClick={connectMicrosoft} style={{ fontSize: '12px', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#7a8fa8', cursor: 'pointer' }}>Reconnect</button>
        </div>
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
