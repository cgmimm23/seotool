'use client'

import { useEffect, useState, Suspense } from 'react'
import MetaConnectBlock from '@/app/components/MetaConnectBlock'

const DAYS_OPTIONS = [7, 14, 28, 90]

function PageStats({ siteId, pageId }: { siteId: string; pageId: string | null }) {
  const [days, setDays] = useState(28)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pageId) return
    setLoading(true)
    setError('')
    fetch(`/api/facebook-pages?siteId=${siteId}&days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setData(j) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [pageId, days, siteId])

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <>
      <div style={{ ...card, display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Last</span>
        {DAYS_OPTIONS.map(d => (
          <button key={d} onClick={() => setDays(d)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '11px', fontWeight: days === d ? 700 : 400, border: days === d ? '1px solid #1877F2' : '1px solid rgba(0,0,0,0.1)', background: days === d ? 'rgba(24,119,242,0.08)' : '#fff', color: days === d ? '#1877F2' : '#7a8fa8', cursor: 'pointer', fontFamily: 'Roboto Mono, monospace' }}>{d}d</button>
        ))}
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {loading && <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Pulling Page data...</div>}

      {data?.page && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
          {data.page.picture && <img src={data.page.picture} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '15px' }}>{data.page.name}{data.page.verified ? ' ✓' : ''}</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8' }}>{data.page.category}{data.page.about ? ' · ' + data.page.about.slice(0, 80) : ''}</div>
          </div>
          {data.page.link && <a href={data.page.link} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: '12px' }}>View on Facebook</a>}
        </div>
      )}

      {data?.totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
          {[
            { label: 'Followers', value: (data.page?.followers_count ?? data.page?.fan_count ?? 0).toLocaleString() },
            { label: 'Reach', value: data.totals.reach.toLocaleString() },
            { label: 'Impressions', value: data.totals.impressions.toLocaleString() },
            { label: 'Engagements', value: data.totals.engagements.toLocaleString() },
            { label: 'Page Views', value: data.totals.page_views.toLocaleString() },
            { label: 'New Followers', value: data.totals.new_fans.toLocaleString() },
            { label: 'Lost Followers', value: data.totals.lost_fans.toLocaleString() },
            { label: 'Net Growth', value: (data.totals.new_fans - data.totals.lost_fans).toLocaleString() },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {data?.posts?.length > 0 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Recent Posts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.posts.map((p: any) => (
              <a key={p.id} href={p.permalink_url} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: '10px', padding: '10px', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
                {p.picture && <img src={p.picture} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{new Date(p.created_time).toLocaleDateString()}</div>
                  <div style={{ fontSize: '13px', color: '#0d1b2e', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.message || '(no caption)'}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '4px', fontFamily: 'Roboto Mono, monospace' }}>
                    Reach {p.reach.toLocaleString()} · Impressions {p.impressions.toLocaleString()} · Engagements {p.engagements.toLocaleString()}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {!loading && !data && !error && <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>No Page data yet.</div>}
    </>
  )
}

function Inner({ params }: { params: { id: string } }) {
  return (
    <MetaConnectBlock
      siteId={params.id}
      title="Facebook Pages"
      description="Real engagement data for the Facebook Page connected to this site"
    >
      {({ pageId }) => <PageStats siteId={params.id} pageId={pageId} />}
    </MetaConnectBlock>
  )
}

export default function FacebookPagesPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <Inner params={params} />
    </Suspense>
  )
}
