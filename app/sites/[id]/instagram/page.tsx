'use client'

import { useEffect, useState, Suspense } from 'react'
import MetaConnectBlock from '@/app/components/MetaConnectBlock'

const DAYS_OPTIONS = [7, 14, 28, 90]

function IgStats({ siteId, igUserId }: { siteId: string; igUserId: string | null }) {
  const [days, setDays] = useState(28)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!igUserId) { setData(null); return }
    setLoading(true); setError('')
    fetch(`/api/instagram?siteId=${siteId}&days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setData(j) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [igUserId, days, siteId])

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  if (!igUserId) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>No Instagram account linked</div>
        <div style={{ fontSize: '13px', color: '#7a8fa8', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto' }}>
          Instagram insights are pulled through the connected Facebook Page. To link:
          <br/>1. Switch your IG to a Business or Creator account in the Instagram app
          <br/>2. In Facebook Page settings → Linked Accounts, connect your Instagram
          <br/>3. Come back here and hit <strong>Reconnect</strong> above
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ ...card, display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Last</span>
        {DAYS_OPTIONS.map(d => (
          <button key={d} onClick={() => setDays(d)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '11px', fontWeight: days === d ? 700 : 400, border: days === d ? '1px solid #E1306C' : '1px solid rgba(0,0,0,0.1)', background: days === d ? 'rgba(225,48,108,0.08)' : '#fff', color: days === d ? '#E1306C' : '#7a8fa8', cursor: 'pointer', fontFamily: 'Roboto Mono, monospace' }}>{d}d</button>
        ))}
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      {loading && <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading Instagram data...</div>}

      {data?.profile && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
          {data.profile.picture && <img src={data.profile.picture} alt="" style={{ width: '54px', height: '54px', borderRadius: '50%' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '15px' }}>@{data.profile.username}</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8' }}>{data.profile.name}{data.profile.biography ? ' · ' + data.profile.biography.slice(0, 80) : ''}</div>
          </div>
          <a href={`https://instagram.com/${data.profile.username}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: '12px' }}>View on Instagram</a>
        </div>
      )}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
          {[
            { label: 'Followers', value: (data.profile.followers || 0).toLocaleString() },
            { label: 'Following', value: (data.profile.follows || 0).toLocaleString() },
            { label: 'Posts', value: (data.profile.media_count || 0).toLocaleString() },
            { label: 'Reach', value: (data.totals.reach || 0).toLocaleString() },
            { label: 'Impressions', value: (data.totals.impressions || 0).toLocaleString() },
            { label: 'Profile Views', value: (data.totals.profile_views || 0).toLocaleString() },
            { label: 'Website Clicks', value: (data.totals.website_clicks || 0).toLocaleString() },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {data?.media?.length > 0 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Recent Posts</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {data.media.map((m: any) => (
              <a key={m.id} href={m.permalink} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1', background: '#f0f0f0', backgroundImage: `url(${m.thumbnail_url || m.media_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ padding: '8px', fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
                  <div style={{ color: '#0d1b2e', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '4px' }}>{m.caption || '(no caption)'}</div>
                  ❤ {m.likes} · 💬 {m.comments}
                  <br/>Reach {m.reach} · Impr {m.impressions}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function Inner({ params }: { params: { id: string } }) {
  return (
    <MetaConnectBlock siteId={params.id} title="Instagram" description="Instagram Business account insights — followers, reach, top posts">
      {({ igUserId }) => <IgStats siteId={params.id} igUserId={igUserId} />}
    </MetaConnectBlock>
  )
}

export default function InstagramPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <Inner params={params} />
    </Suspense>
  )
}
