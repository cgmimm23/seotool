'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function BingPlacesInner({ params }: { params: { id: string } }) {
  const [connected, setConnected] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [bizName, setBizName] = useState('')
  const [bizPhone, setBizPhone] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [bizCity, setBizCity] = useState('')
  const [bizState, setBizState] = useState('')
  const [bizZip, setBizZip] = useState('')
  const [bizWebsite, setBizWebsite] = useState('')
  const [bizCategory, setBizCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url, name').eq('id', params.id).single()
      if (site?.name) setBizName(site.name)
      if (site?.url) setBizWebsite(site.url)

      // Check connection
      const res = await fetch(`/api/bing-webmaster?endpoint=sites&siteUrl=test`)
      if (res.status !== 401) setConnected(true)
      setCheckingAuth(false)

      if (searchParams.get('microsoft_connected') === 'true') setConnected(true)
      if (searchParams.get('error')) setError('Microsoft connection failed. Please try again.')
    }
    load()
  }, [params.id])

  function connectMicrosoft() {
    window.location.href = `/auth/microsoft?siteId=${params.id}&returnTo=/sites/${params.id}/bing-places`
  }

  async function fetchListings() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`https://bingplaces.microsoft.com/api/v3/businesses`, {
        headers: { 'Authorization': `Bearer ${document.cookie.match(/ms_access_token=([^;]+)/)?.[1] || ''}` },
      })
      if (!res.ok) throw new Error('Could not load listings: ' + res.status)
      const data = await res.json()
      setListings(data.businesses || data.value || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Open Sans, sans-serif', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }

  if (checkingAuth) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking Microsoft connection...</div>

  if (!connected) return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Bing Places</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Manage your Bing Places for Business listings</p>
      </div>
      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Connect Microsoft Account</div>
        <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>Connect your Microsoft account to manage your Bing Places for Business listings.</p>
        <button onClick={connectMicrosoft} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#0078d4', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '14px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', color: '#fff', fontWeight: 600 }}>
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#00a4ef" d="M11 0h10v10H11z"/><path fill="#7fba00" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg>
          Connect with Microsoft
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Bing Places</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Manage your Bing Places for Business listings</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#00d084', fontFamily: 'Roboto Mono, monospace' }}>● Connected</span>
          <button onClick={fetchListings} disabled={loading} className="btn btn-accent" style={{ fontSize: '12px' }}>{loading ? 'Loading...' : 'Load Listings'}</button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-ghost" style={{ fontSize: '12px' }}>+ Add Listing</button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {showForm && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1.25rem' }}>New Listing</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><label style={labelStyle}>Business Name</label><input type="text" style={inputStyle} value={bizName} onChange={e => setBizName(e.target.value)} /></div>
            <div><label style={labelStyle}>Phone</label><input type="text" style={inputStyle} placeholder="(210) 555-5555" value={bizPhone} onChange={e => setBizPhone(e.target.value)} /></div>
            <div><label style={labelStyle}>Website</label><input type="text" style={inputStyle} value={bizWebsite} onChange={e => setBizWebsite(e.target.value)} /></div>
            <div><label style={labelStyle}>Category</label><input type="text" style={inputStyle} placeholder="Plumber" value={bizCategory} onChange={e => setBizCategory(e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Street Address</label><input type="text" style={inputStyle} placeholder="123 Main St" value={bizAddress} onChange={e => setBizAddress(e.target.value)} /></div>
            <div><label style={labelStyle}>City</label><input type="text" style={inputStyle} value={bizCity} onChange={e => setBizCity(e.target.value)} /></div>
            <div><label style={labelStyle}>State</label><input type="text" style={inputStyle} value={bizState} onChange={e => setBizState(e.target.value)} /></div>
            <div><label style={labelStyle}>ZIP</label><input type="text" style={inputStyle} value={bizZip} onChange={e => setBizZip(e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button disabled={saving || !bizName} className="btn btn-accent" style={{ fontSize: '13px' }}>{saving ? 'Saving...' : 'Save Listing'}</button>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ fontSize: '13px' }}>Cancel</button>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '8px', fontSize: '12px', color: '#4a6080' }}>
            To create or edit Bing Places listings directly, visit <a href="https://www.bingplaces.com" target="_blank" style={{ color: '#1e90ff', textDecoration: 'none' }}>bingplaces.com →</a>
          </div>
        </div>
      )}

      {listings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {listings.map((listing: any, i: number) => (
            <div key={i} style={{ ...card, marginBottom: 0, cursor: 'pointer', borderColor: selected?.id === listing.id ? 'rgba(30,144,255,0.3)' : 'rgba(0,0,0,0.08)' }} onClick={() => setSelected(selected?.id === listing.id ? null : listing)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 700, color: '#0d1b2e', marginBottom: '4px' }}>{listing.name || listing.Name}</div>
                  <div style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{listing.address?.formattedAddress || listing.Address || 'No address'}</div>
                </div>
                <a href="https://www.bingplaces.com" target="_blank" onClick={e => e.stopPropagation()} style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none' }}>Manage →</a>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '8px' }}>No listings loaded</div>
          <div style={{ fontSize: '13px', marginBottom: '1.5rem' }}>Click Load Listings or manage your listings directly on Bing Places.</div>
          <a href="https://www.bingplaces.com" target="_blank" style={{ fontSize: '13px', color: '#1e90ff', textDecoration: 'none' }}>Open Bing Places →</a>
        </div>
      )}
    </div>
  )
}

export default function BingPlacesPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <BingPlacesInner params={params} />
    </Suspense>
  )
}
