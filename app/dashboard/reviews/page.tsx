'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type GbpStatus = { connected: boolean; email: string | null; scopes: string[]; accounts: { accountName: string; accountDisplayName: string; locations: { name: string; title: string; address: string }[] }[] }

export default function ReviewsPage() {
  const [status, setStatus] = useState<GbpStatus | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'unresponded' | 'responded' | 'flagged'>('all')
  const [starFilter, setStarFilter] = useState<number | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [flaggingId, setFlaggingId] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [showFlagModal, setShowFlagModal] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { checkConnection() }, [])

  async function checkConnection() {
    setCheckingAuth(true)
    try {
      const res = await fetch('/api/gbp/status')
      const json = await res.json()
      setStatus(json)
      if (json.connected) {
        const allLocs = (json.accounts || []).flatMap((a: any) => a.locations || [])
        if (allLocs.length === 1) setSelectedLocation(allLocs[0].name)
      }
    } catch {
      setStatus({ connected: false, email: null, scopes: [], accounts: [] })
    }
    setCheckingAuth(false)
  }

  async function connectGoogle() {
    document.cookie = `oauth_return=${encodeURIComponent(window.location.pathname)}; path=/; max-age=600; SameSite=Lax`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/business.manage',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  async function disconnect() {
    if (!confirm('Disconnect Google Business Profile?')) return
    setDisconnecting(true)
    try {
      await fetch('/api/gbp/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      setReviews([])
      setSelectedLocation('')
      await checkConnection()
    } finally {
      setDisconnecting(false)
    }
  }

  async function fetchReviews() {
    if (!selectedLocation) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reviews', locationName: selectedLocation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not fetch reviews')
      setReviews(data.reviews || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function submitReply(reviewName: string, existingReply: boolean) {
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', reviewName, comment: replyText }),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Could not post reply') }
      setReplyingTo(null)
      setReplyText('')
      fetchReviews()
    } catch (err: any) { setError(err.message) }
    finally { setSubmittingReply(false) }
  }

  async function deleteReply(reviewName: string) {
    if (!confirm('Delete your reply to this review?')) return
    try {
      await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteReply', reviewName }),
      })
      fetchReviews()
    } catch (err: any) { setError(err.message) }
  }

  async function flagReview(reviewName: string) {
    if (!flagReason) return
    setFlaggingId(reviewName)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flag', reviewName, flagType: flagReason }),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Could not flag review') }
      setShowFlagModal(null)
      setFlagReason('')
      alert('Review has been flagged and submitted to Google for review. This may take several days to process.')
    } catch (err: any) { setError(err.message) }
    finally { setFlaggingId(null) }
  }

  function starRating(rating: string) {
    const map: any = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
    return map[rating] || 0
  }

  function starColor(stars: number) {
    if (stars >= 4) return '#00d084'
    if (stars === 3) return '#ffa500'
    return '#ff4444'
  }

  function renderStars(stars: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < stars ? '#ffa500' : '#e4eaf0', fontSize: '14px' }}>*</span>
    ))
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days} days ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
    return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? 's' : ''} ago`
  }

  const filteredReviews = reviews.filter(r => {
    const stars = starRating(r.starRating)
    if (starFilter && stars !== starFilter) return false
    if (filter === 'responded' && !r.reviewReply) return false
    if (filter === 'unresponded' && r.reviewReply) return false
    return true
  })

  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + starRating(r.starRating), 0) / reviews.length).toFixed(1) : '0'
  const unresponded = reviews.filter(r => !r.reviewReply).length

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Open Sans, sans-serif' }

  if (checkingAuth) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking Google connection...</div>

  if (!status?.connected) return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Google Reviews</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Manage, respond to, and flag Google Business reviews</p>
      </div>
      <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Connect Google Business Profile</div>
        <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '0.5rem', maxWidth: '460px', margin: '0 auto 0.5rem' }}>Reviews come from your Google Business Profile. Connect once and we'll pull all locations and reviews automatically.</p>
        {status?.email && (
          <p style={{ fontSize: '12px', color: '#ff4444', marginBottom: '0.75rem' }}>
            Signed in as {status.email}, but the Business Profile scope was not granted. Click below to grant access.
          </p>
        )}
        <div style={{ marginTop: '1.25rem' }}>
          <button onClick={connectGoogle} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '14px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Connect with Google
          </button>
        </div>
      </div>
    </div>
  )

  const allLocations = (status.accounts || []).flatMap(a => a.locations.map(l => ({ ...l, accountName: a.accountDisplayName })))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Google Reviews</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Manage, respond to, and flag reviews</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', background: 'rgba(0,208,132,0.1)', color: '#00a36b', fontFamily: 'Roboto Mono, monospace' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d084' }} />
            {status.email || 'Connected'}
          </span>
          <button onClick={disconnect} disabled={disconnecting} style={{ background: 'none', border: 'none', color: '#7a8fa8', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontFamily: 'Open Sans, sans-serif' }}>
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {allLocations.length > 0 ? (
          <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="form-input" style={{ width: 'auto', minWidth: '280px', fontSize: '13px', fontFamily: 'Open Sans, sans-serif' }}>
            <option value="">Select a location...</option>
            {allLocations.map((l: any) => (
              <option key={l.name} value={l.name}>{l.title}{l.address ? ' — ' + l.address : ''}</option>
            ))}
          </select>
        ) : (
          <div style={{ fontSize: '12px', color: '#7a8fa8' }}>No verified locations found on this Google account.</div>
        )}
        <button onClick={fetchReviews} className="btn btn-accent" style={{ fontSize: '12px' }} disabled={!selectedLocation || loading}>
          {loading ? 'Loading...' : 'Load Reviews'}
        </button>
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {reviews.length > 0 && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Total Reviews', value: reviews.length, color: '#0d1b2e' },
              { label: 'Avg Rating', value: avgRating + ' / 5', color: '#ffa500' },
              { label: 'Unresponded', value: unresponded, color: unresponded > 0 ? '#ff4444' : '#00d084' },
              { label: 'Response Rate', value: Math.round((reviews.length - unresponded) / reviews.length * 100) + '%', color: '#1e90ff' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {(['all', 'unresponded', 'responded'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${filter === f ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: filter === f ? 'rgba(30,144,255,0.08)' : 'transparent', color: filter === f ? '#1e90ff' : '#7a8fa8', fontFamily: 'Open Sans, sans-serif', textTransform: 'capitalize' }}>{f}</button>
            ))}
            <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)' }} />
            {[5, 4, 3, 2, 1].map(s => (
              <button key={s} onClick={() => setStarFilter(starFilter === s ? null : s)} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${starFilter === s ? '#ffa500' : 'rgba(0,0,0,0.1)'}`, background: starFilter === s ? 'rgba(255,165,0,0.08)' : 'transparent', color: starFilter === s ? '#ffa500' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{s}*</button>
            ))}
            <span style={{ fontSize: '12px', color: '#7a8fa8' }}>{filteredReviews.length} reviews</span>
          </div>

          {/* Reviews list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredReviews.map((r: any) => {
              const stars = starRating(r.starRating)
              const isReplying = replyingTo === r.name
              const hasReply = !!r.reviewReply

              return (
                <div key={r.name} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', borderLeft: `3px solid ${starColor(stars)}` }}>
                  {/* Review header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(30,144,255,0.1)', color: '#1e90ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                        {r.reviewer?.displayName?.[0] || 'G'}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0d1b2e' }}>{r.reviewer?.displayName || 'Anonymous'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontSize: '13px' }}>{renderStars(stars)}</span>
                          <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{timeAgo(r.createTime)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {!hasReply && (
                        <button onClick={() => { setReplyingTo(r.name); setReplyText('') }} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(30,144,255,0.3)', background: 'rgba(30,144,255,0.05)', color: '#1e90ff', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>Reply</button>
                      )}
                      {hasReply && (
                        <button onClick={() => { setReplyingTo(r.name); setReplyText(r.reviewReply.comment) }} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#7a8fa8', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>Edit Reply</button>
                      )}
                      <button onClick={() => setShowFlagModal(r.name)} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.05)', color: '#ff4444', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>Flag</button>
                    </div>
                  </div>

                  {/* Review text */}
                  {r.comment && <p style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.6, marginBottom: hasReply || isReplying ? '12px' : '0' }}>{r.comment}</p>}

                  {/* Existing reply */}
                  {hasReply && !isReplying && (
                    <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 14px', borderLeft: '2px solid #1e90ff' }}>
                      <div style={{ fontSize: '11px', color: '#1e90ff', fontWeight: 600, marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>Your reply {r.reviewReply.updateTime ? '- ' + timeAgo(r.reviewReply.updateTime) : ''}</div>
                      <p style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.6, marginBottom: '8px' }}>{r.reviewReply.comment}</p>
                      <button onClick={() => deleteReply(r.name)} style={{ fontSize: '11px', color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Open Sans, sans-serif' }}>Delete reply</button>
                    </div>
                  )}

                  {/* Reply form */}
                  {isReplying && (
                    <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px' }}>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Write your response..."
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical', marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => submitReply(r.name, hasReply)} disabled={submittingReply || !replyText.trim()} className="btn btn-accent" style={{ fontSize: '12px' }}>
                          {submittingReply ? 'Posting...' : hasReply ? 'Update Reply' : 'Post Reply'}
                        </button>
                        <button onClick={() => setReplyingTo(null)} className="btn btn-ghost" style={{ fontSize: '12px' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {!loading && reviews.length === 0 && selectedLocation && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>No reviews loaded</div>
          <div style={{ fontSize: '13px' }}>Select a location and click Load Reviews</div>
        </div>
      )}

      {/* Flag modal */}
      {showFlagModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '440px', margin: '1rem' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Flag Review for Removal</div>
            <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1.25rem' }}>Select the reason this review violates Google's policies. Google will review your report — this may take several days.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.25rem' }}>
              {[
                { value: 'SPAM', label: 'Spam or fake review' },
                { value: 'IRRELEVANT', label: 'Off-topic / not about this business' },
                { value: 'CONFLICT_OF_INTEREST', label: 'Conflict of interest (competitor or employee)' },
                { value: 'PROFANITY', label: 'Contains profanity or inappropriate content' },
                { value: 'BULLYING', label: 'Bullying or harassment' },
                { value: 'DISCRIMINATION', label: 'Discrimination or hate speech' },
                { value: 'PERSONAL_INFORMATION', label: 'Contains personal information' },
              ].map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', background: flagReason === opt.value ? 'rgba(30,144,255,0.06)' : '#f8f9fb', border: `1px solid ${flagReason === opt.value ? 'rgba(30,144,255,0.3)' : 'rgba(0,0,0,0.06)'}` }}>
                  <input type="radio" name="flagReason" value={opt.value} checked={flagReason === opt.value} onChange={() => setFlagReason(opt.value)} />
                  <span style={{ fontSize: '13px', color: '#4a6080' }}>{opt.label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowFlagModal(null); setFlagReason('') }} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => flagReview(showFlagModal)} disabled={!flagReason || flaggingId === showFlagModal} className="btn btn-accent" style={{ flex: 1, background: '#ff4444' }}>
                {flaggingId === showFlagModal ? 'Flagging...' : 'Submit Flag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
