'use client'

import { useEffect, useState, Suspense } from 'react'
import MetaConnectBlock from '@/app/components/MetaConnectBlock'

function Reviews({ siteId, pageId }: { siteId: string; pageId: string | null }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pageId) return
    setLoading(true); setError('')
    fetch(`/api/facebook-reviews?siteId=${siteId}`)
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setData(j) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [pageId, siteId])

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <>
      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {loading && <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading reviews...</div>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '12px' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>Overall</div>
            <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{data.overall_rating != null ? `${data.overall_rating}★` : '—'}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>Total Ratings</div>
            <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{(data.rating_count || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>Recent Reviews</div>
            <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{(data.reviews || []).length}</div>
          </div>
        </div>
      )}

      {data?.fetch_error && (
        <div style={{ ...card, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.3)', fontSize: '12px', color: '#b17800' }}>
          <strong>Note:</strong> Facebook restricted reviewer data access in 2018. Rating counts are visible, but individual reviewer names/text require the Page to be in a supported country AND the reviewer to have public-profile reviews. Message: {data.fetch_error}
        </div>
      )}

      {data?.reviews?.length > 0 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Reviews</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.reviews.map((r: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                {r.avatar && <img src={r.avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.reviewer}</div>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{new Date(r.created_time).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: r.recommendation_type === 'positive' ? '#00d084' : r.recommendation_type === 'negative' ? '#ff4444' : '#7a8fa8', marginTop: '2px' }}>
                    {r.rating ? `${r.rating}★` : r.recommendation_type === 'positive' ? 'Recommends' : r.recommendation_type === 'negative' ? "Doesn't recommend" : '—'}
                  </div>
                  {r.text && <div style={{ fontSize: '13px', marginTop: '6px', color: '#0d1b2e' }}>{r.text}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && data?.reviews?.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>No individual reviews returned from Meta for this Page.</div>
      )}
    </>
  )
}

function Inner({ params }: { params: { id: string } }) {
  return (
    <MetaConnectBlock siteId={params.id} title="Facebook Reviews" description="Star ratings and recommendations from Facebook users">
      {({ pageId }) => <Reviews siteId={params.id} pageId={pageId} />}
    </MetaConnectBlock>
  )
}

export default function FacebookReviewsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <Inner params={params} />
    </Suspense>
  )
}
