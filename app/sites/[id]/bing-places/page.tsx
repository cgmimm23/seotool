'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function BingPlacesPage({ params }: { params: { id: string } }) {
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [siteUrl, setSiteUrl] = useState('')

  // Create/edit form
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

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url, name').eq('id', params.id).single()
      if (site?.url) setSiteUrl(site.url)
      if (site?.name) setBizName(site.name)
      if (site?.url) setBizWebsite(site.url)
      const saved = localStorage.getItem('riq_bing_places_key')
      if (saved) { setApiKey(saved); setSavedKey(true) }
    }
    load()
  }, [params.id])

  function saveKey() {
    localStorage.setItem('riq_bing_places_key', apiKey)
    setSavedKey(true)
  }

  async function fetchListings() {
    if (!apiKey) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`https://businessapi.bing.com/v1/businesses?apiKey=${apiKey}`)
      if (!res.ok) throw new Error('Bing Places API error: ' + res.status)
      const data = await res.json()
      setListings(data.businesses || data.value || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveListing() {
    if (!apiKey || !bizName) return
    setSaving(true)
    setSaveResult(null)
    try {
      const body = {
        name: bizName,
        phone: bizPhone,
        address: { street: bizAddress, city: bizCity, stateOrProvince: bizState, postalCode: bizZip, countryOrRegion: 'US' },
        webSiteUrl: bizWebsite,
        categories: bizCategory ? [bizCategory] : [],
      }
      const res = await fetch(`https://businessapi.bing.com/v1/businesses?apiKey=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save listing: ' + res.status)
      setSaveResult('success')
      setShowForm(false)
      fetchListings()
    } catch (err: any) {
      setError(err.message)
      setSaveResult('error')
    } finally {
      setSaving(false)
    }
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Open Sans, sans-serif', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Bing Places</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Manage your Bing Places for Business listings</p>
      </div>

      {/* API Key */}
      <div style={card}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Bing Places API Key</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="password"
            placeholder="Paste your Bing Places API key"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setSavedKey(false) }}
            style={{ flex: 1, background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Roboto Mono, monospace' }}
          />
          <button onClick={saveKey} style={{ padding: '0.55rem 1rem', borderRadius: '8px', fontSize: '12px', border: 'none', background: savedKey ? '#00d084' : '#1e90ff', color: '#fff', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {savedKey ? '✓ Saved' : 'Save Key'}
          </button>
          <button onClick={fetchListings} disabled={!apiKey || loading} className="btn btn-accent" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
            {loading ? 'Loading...' : 'Load Listings'}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '6px' }}>
          Get your API key from <a href="https://www.bingplaces.com" target="_blank" style={{ color: '#1e90ff', textDecoration: 'none' }}>bingplaces.com →</a>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {/* Listings */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>
          {listings.length > 0 ? `${listings.length} Listing${listings.length !== 1 ? 's' : ''}` : 'Listings'}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-accent" style={{ fontSize: '12px' }}>
          {showForm ? 'Cancel' : '+ Add Listing'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1.25rem' }}>New Listing</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><label style={labelStyle}>Business Name</label><input type="text" style={inputStyle} placeholder="Joe's Plumbing" value={bizName} onChange={e => setBizName(e.target.value)} /></div>
            <div><label style={labelStyle}>Phone</label><input type="text" style={inputStyle} placeholder="(210) 555-5555" value={bizPhone} onChange={e => setBizPhone(e.target.value)} /></div>
            <div><label style={labelStyle}>Website</label><input type="text" style={inputStyle} placeholder="https://yoursite.com" value={bizWebsite} onChange={e => setBizWebsite(e.target.value)} /></div>
            <div><label style={labelStyle}>Category</label><input type="text" style={inputStyle} placeholder="Plumber" value={bizCategory} onChange={e => setBizCategory(e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Street Address</label><input type="text" style={inputStyle} placeholder="123 Main St" value={bizAddress} onChange={e => setBizAddress(e.target.value)} /></div>
            <div><label style={labelStyle}>City</label><input type="text" style={inputStyle} placeholder="San Antonio" value={bizCity} onChange={e => setBizCity(e.target.value)} /></div>
            <div><label style={labelStyle}>State</label><input type="text" style={inputStyle} placeholder="TX" value={bizState} onChange={e => setBizState(e.target.value)} /></div>
            <div><label style={labelStyle}>ZIP</label><input type="text" style={inputStyle} placeholder="78201" value={bizZip} onChange={e => setBizZip(e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={saveListing} disabled={saving || !bizName || !apiKey} className="btn btn-accent" style={{ fontSize: '13px' }}>
              {saving ? 'Saving...' : saveResult === 'success' ? '✓ Saved!' : 'Save Listing'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ fontSize: '13px' }}>Cancel</button>
          </div>
          {saveResult === 'error' && <div style={{ fontSize: '12px', color: '#ff4444', marginTop: '8px' }}>Failed to save. Check your API key and try again.</div>}
        </div>
      )}

      {/* Listings list */}
      {listings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {listings.map((listing: any, i: number) => (
            <div key={i} style={{ ...card, marginBottom: 0, cursor: 'pointer', borderColor: selected?.id === listing.id ? 'rgba(30,144,255,0.3)' : 'rgba(0,0,0,0.08)' }} onClick={() => setSelected(selected?.id === listing.id ? null : listing)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 700, color: '#0d1b2e', marginBottom: '4px' }}>{listing.name || listing.Name}</div>
                  <div style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{listing.address?.formattedAddress || listing.Address || 'No address'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {listing.status && <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: listing.status === 'Active' ? 'rgba(0,208,132,0.1)' : 'rgba(255,165,0,0.1)', color: listing.status === 'Active' ? '#00d084' : '#ffa500', fontFamily: 'Roboto Mono, monospace' }}>{listing.status}</span>}
                  <a href={`https://www.bingplaces.com`} target="_blank" onClick={e => e.stopPropagation()} style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none' }}>Manage →</a>
                </div>
              </div>
              {selected?.id === listing.id && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { label: 'Phone', value: listing.phone || listing.Phone || '—' },
                    { label: 'Website', value: listing.webSiteUrl || listing.WebSiteUrl || '—' },
                    { label: 'Category', value: listing.categories?.[0] || listing.Categories?.[0] || '—' },
                    { label: 'ID', value: listing.id || listing.Id || '—' },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace', marginBottom: '2px' }}>{f.label}</div>
                      <div style={{ fontSize: '13px', color: '#0d1b2e' }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !loading && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>No listings found</div>
          <div style={{ fontSize: '13px', marginBottom: '1.5rem' }}>Save your API key, click Load Listings, or add a new listing above.</div>
          <a href="https://www.bingplaces.com" target="_blank" style={{ fontSize: '13px', color: '#1e90ff', textDecoration: 'none' }}>Manage listings directly on Bing Places →</a>
        </div>
      )}
    </div>
  )
}
