'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ReviewsPage({ params }: { params: { id: string } }) {
  const [connected, setConnected] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locations, setLocations] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const supabase = createClient()

  useEffect(() => { checkConnection() }, [])

  async function checkConnection() {
    setCheckingAuth(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.provider_token) { setConnected(true); fetchAccounts(session.provider_token) }
    setCheckingAuth(false)
  }

  async function connectGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: 'https://www.googleapis.com/auth/business.manage', queryParams: { access_type: 'offline', prompt: 'consent' } } })
  }

  async function fetchAccounts(token: string) {
    try {
      const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      const accs = data.accounts || []
      if (accs.length > 0) fetchLocations(accs[0].name, token)
    } catch {}
  }

  async function fetchLocations(accountName: string, token: string) {
    try {
      const res = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      const locs = data.locations || []
      setLocations(locs)
      if (locs.length > 0) setSelectedLocation(locs[0].name)
    } catch {}
  }

  async function fetchReviews() {
    if (!selectedLocation) return
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.provider_token) throw new Error('No access token')
      const res = await fetch(`https://mybusiness.googleapis.com/v4/${selectedLocation}/reviews?pageSize=50`, { headers: { 'Authorization': `Bearer ${session.provider_token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Could not fetch reviews')
      setReviews(data.reviews || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    if (days > 30) return `${Math.floor(days / 30)}mo ago`
    if (days > 0) return `${days}d ago`
    return 'Today'
  }

  function renderStars(n: number) { return '★'.repeat(n) + '☆'.repeat(5 - n) }

  function starRating(str: string) {
    const map: any = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
    return map[str] || 0
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  if (checkingAuth) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px' }}>Checking Google connection...</div>

  if (!connected) return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}><h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Google Reviews</h2><p style={{ fontSize: '13px', color: '#7a8fa8' }}>Manage and respond to your Google Business reviews</p></div>
      <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Connect Google Business Profile</div>
        <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>Connect to view, respond to, and manage your Google reviews.</p>
        <button onClick={connectGoogle} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '14px', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Connect with Google
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div><h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Google Reviews</h2><p style={{ fontSize: '13px', color: '#7a8fa8' }}>Manage and respond to your Google reviews</p></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {locations.length > 0 && <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="form-input" style={{ width: 'auto', fontSize: '12px' }}>{locations.map((l: any) => <option key={l.name} value={l.name}>{l.title || l.name}</option>)}</select>}
          <button className="btn btn-accent" onClick={fetchReviews} disabled={loading} style={{ fontSize: '12px' }}>{loading ? 'Loading...' : 'Load Reviews'}</button>
        </div>
      </div>
      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      {reviews.map((r: any) => {
        const stars = starRating(r.starRating)
        return (
          <div key={r.name} style={{ ...card, borderLeft: `3px solid ${stars >= 4 ? '#00d084' : stars >= 3 ? '#ffa500' : '#ff4444'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d1b2e' }}>{r.reviewer?.displayName || 'Anonymous'}</div>
                <div style={{ fontSize: '13px', color: '#ffa500', marginTop: '2px' }}>{renderStars(stars)} <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{timeAgo(r.createTime)}</span></div>
              </div>
            </div>
            {r.comment && <p style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>{r.comment}</p>}
            {r.reviewReply && (
              <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 14px', borderLeft: '2px solid #1e90ff', marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#1e90ff', fontWeight: 600, marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>Your reply</div>
                <p style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>{r.reviewReply.comment}</p>
              </div>
            )}
          </div>
        )
      })}
      {!loading && reviews.length === 0 && <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>Select a location and click Load Reviews</div>}
    </div>
  )
}
