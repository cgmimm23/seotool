'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Step = 1 | 2 | 3 | 4 | 5 | 6

const BUSINESS_CATEGORIES = [
  'Plumber', 'Electrician', 'HVAC Contractor', 'Roofer', 'Landscaper',
  'General Contractor', 'Painter', 'Flooring Contractor', 'Pest Control',
  'Cleaning Service', 'Auto Repair Shop', 'Restaurant', 'Dentist',
  'Chiropractor', 'Law Firm', 'Accountant', 'Real Estate Agent',
  'Insurance Agent', 'Hair Salon', 'Barbershop', 'Gym', 'Yoga Studio',
  'Veterinarian', 'Pet Store', 'Retail Store', 'Coffee Shop', 'Bakery',
  'Marketing Agency', 'IT Services', 'Web Designer', 'Photographer',
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const defaultHours = DAYS.reduce((acc, day) => ({
  ...acc,
  [day]: { open: !['Saturday', 'Sunday'].includes(day), from: '09:00', to: '17:00' }
}), {} as Record<string, { open: boolean; from: string; to: string }>)

export default function GBPCreatorPage() {
  const [step, setStep] = useState<Step>(1)
  const [connected, setConnected] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [submitError, setSubmitError] = useState('')
  const [verificationOptions, setVerificationOptions] = useState<any[]>([])
  const [aiGenerating, setAiGenerating] = useState(false)
  const [exported, setExported] = useState(false)
  const supabase = createClient()

  // Form fields
  const [listingType, setListingType] = useState<'create' | 'claim'>('create')
  const [bizName, setBizName] = useState('')
  const [bizCategory, setBizCategory] = useState('')
  const [bizPhone, setBizPhone] = useState('')
  const [bizWebsite, setBizWebsite] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [bizCity, setBizCity] = useState('')
  const [bizState, setBizState] = useState('')
  const [bizZip, setBizZip] = useState('')
  const [openingDate, setOpeningDate] = useState('')
  const [hours, setHours] = useState(defaultHours)
  const [serviceAreas, setServiceAreas] = useState('')
  const [isServiceAreaBiz, setIsServiceAreaBiz] = useState(false)
  const [description, setDescription] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        setConnected(true)
        fetchAccounts()
      }
    })
  }, [])

  async function connectGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: [
          'https://www.googleapis.com/auth/business.manage',
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/analytics.readonly',
        ].join(' '),
        queryParams: { access_type: 'offline', prompt: 'select_account consent' },
      },
    })
  }

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/gbp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_accounts' }),
      })
      const data = await res.json()
      if (data.accounts) {
        setAccounts(data.accounts)
        if (data.accounts.length > 0) setSelectedAccount(data.accounts[0].name)
      }
    } catch (err) { console.error('Could not fetch accounts') }
  }

  async function generateDescription() {
    setAiGenerating(true)
    try {
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a local SEO expert. Write an optimized Google Business Profile description under 750 characters. Include business name, city, key services, and a call to action. Plain text only, no hashtags or emojis.\n\nBusiness: ${bizName}, Category: ${bizCategory}, City: ${bizCity} ${bizState}, Services: ${serviceAreas}`,
        }),
      })
      const data = await res.json()
      const text = data.text || ''
      setDescription(text.trim())
    } catch { alert('Could not generate description') }
    finally { setAiGenerating(false) }
  }

  async function submitToGoogle() {
    if (!selectedAccount) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/gbp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_location',
          accountId: selectedAccount,
          location: { bizName, bizCategory, bizPhone, bizWebsite, bizAddress, bizCity, bizState, bizZip, openingDate, hours, serviceAreas, isServiceAreaBiz, description },
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSubmitResult(data.location)

      // Get verification options
      if (data.location?.name) {
        const vRes = await fetch('/api/gbp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_verification_options', locationName: data.location.name }),
        })
        const vData = await vRes.json()
        if (vData.options) setVerificationOptions(vData.options)
      }
      setStep(6)
    } catch (err: any) { setSubmitError(err.message) }
    finally { setSubmitting(false) }
  }

  function exportGuide() {
    const openHours = DAYS.filter(d => hours[d].open).map(d => `${d}: ${hours[d].from} - ${hours[d].to}`).join('\n')
    const content = `GOOGLE BUSINESS PROFILE SETUP GUIDE\n=====================================\nGenerated by SEO by CGMIMM SEO\n=====================================\n\nLISTING TYPE: ${listingType === 'create' ? 'Create New Listing' : 'Claim Existing Listing'}\n\nBUSINESS INFORMATION\nName: ${bizName}\nCategory: ${bizCategory}\nPhone: ${bizPhone}\nWebsite: ${bizWebsite}\nAddress: ${bizAddress}, ${bizCity}, ${bizState} ${bizZip}\nOpening Date: ${openingDate}\n\nHOURS\n${openHours}\n\nSERVICE AREAS\n${serviceAreas}\n\nDESCRIPTION\n${description}\n\nGO TO: https://business.google.com\n`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bizName.replace(/\s+/g, '-')}-GBP-Guide.txt`
    a.click()
    setExported(true)
  }

  function updateHour(day: string, field: string, value: any) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Open Sans, sans-serif' }
  const labelStyle = { fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }

  const steps = [
    { num: 1, label: 'Business Info' },
    { num: 2, label: 'Hours' },
    { num: 3, label: 'Service Areas' },
    { num: 4, label: 'Description' },
    { num: 5, label: 'Submit' },
    { num: 6, label: 'Verification' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>GBP Creator</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Create or claim a Google Business Profile listing directly from here</p>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.5rem', overflowX: 'auto' }}>
        {steps.map((s, i) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: step > s.num ? 'pointer' : 'default' }} onClick={() => step > s.num && setStep(s.num as Step)}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: step === s.num ? '#1e90ff' : step > s.num ? '#00d084' : '#f0f4f8', color: step >= s.num ? '#fff' : '#7a8fa8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', flexShrink: 0 }}>
                {step > s.num ? 'v' : s.num}
              </div>
              <span style={{ fontSize: '11px', fontWeight: step === s.num ? 600 : 400, color: step === s.num ? '#1e90ff' : step > s.num ? '#00d084' : '#7a8fa8', whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: '1px', background: step > s.num ? '#00d084' : '#e4eaf0', margin: '0 8px', minWidth: '20px' }} />}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Business Information</div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>What do you want to do?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ value: 'create', label: 'Create new listing' }, { value: 'claim', label: 'Claim existing listing' }].map(o => (
                <button key={o.value} onClick={() => setListingType(o.value as any)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${listingType === o.value ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: listingType === o.value ? 'rgba(30,144,255,0.08)' : '#f8f9fb', color: listingType === o.value ? '#1e90ff' : '#4a6080', fontSize: '13px', fontWeight: listingType === o.value ? 600 : 400, cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>{o.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
            <div><label style={labelStyle}>Business Name</label><input type="text" style={inputStyle} placeholder="Acme Plumbing Co." value={bizName} onChange={e => setBizName(e.target.value)} /></div>
            <div><label style={labelStyle}>Primary Category</label><select value={bizCategory} onChange={e => setBizCategory(e.target.value)} style={inputStyle}><option value="">Select...</option>{BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={labelStyle}>Phone</label><input type="text" style={inputStyle} placeholder="(210) 555-0100" value={bizPhone} onChange={e => setBizPhone(e.target.value)} /></div>
            <div><label style={labelStyle}>Website</label><input type="text" style={inputStyle} placeholder="https://yoursite.com" value={bizWebsite} onChange={e => setBizWebsite(e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Street Address</label><input type="text" style={inputStyle} placeholder="123 Main Street" value={bizAddress} onChange={e => setBizAddress(e.target.value)} /></div>
            <div><label style={labelStyle}>City</label><input type="text" style={inputStyle} placeholder="San Antonio" value={bizCity} onChange={e => setBizCity(e.target.value)} /></div>
            <div><label style={labelStyle}>State</label><input type="text" style={inputStyle} placeholder="TX" value={bizState} onChange={e => setBizState(e.target.value)} /></div>
            <div><label style={labelStyle}>ZIP</label><input type="text" style={inputStyle} placeholder="78201" value={bizZip} onChange={e => setBizZip(e.target.value)} /></div>
            <div><label style={labelStyle}>Opening Date</label><input type="date" style={inputStyle} value={openingDate} onChange={e => setOpeningDate(e.target.value)} /></div>
          </div>
          <button className="btn btn-accent" onClick={() => setStep(2)} disabled={!bizName || !bizCategory || !bizCity}>Next: Business Hours</button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Business Hours</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.25rem' }}>
            {DAYS.map(day => (
              <div key={day} style={{ display: 'grid', gridTemplateColumns: '120px 80px 100px 20px 100px', gap: '10px', alignItems: 'center', padding: '8px 12px', background: '#f8f9fb', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{day}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#7a8fa8' }}>
                  <input type="checkbox" checked={hours[day].open} onChange={e => updateHour(day, 'open', e.target.checked)} />Open
                </label>
                {hours[day].open ? (
                  <>
                    <input type="time" value={hours[day].from} onChange={e => updateHour(day, 'from', e.target.value)} style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px' }} />
                    <span style={{ textAlign: 'center', color: '#7a8fa8', fontSize: '12px' }}>to</span>
                    <input type="time" value={hours[day].to} onChange={e => updateHour(day, 'to', e.target.value)} style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px' }} />
                  </>
                ) : <span style={{ fontSize: '12px', color: '#ff4444', gridColumn: '3 / 6' }}>Closed</span>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-accent" onClick={() => setStep(3)}>Next: Service Areas</button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Service Areas</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4a6080', marginBottom: '1rem' }}>
            <input type="checkbox" checked={isServiceAreaBiz} onChange={e => setIsServiceAreaBiz(e.target.checked)} />
            This is a Service Area Business — I go to customers, they do not come to my location
          </label>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Service Areas (one per line — cities, counties, or zip codes)</label>
            <textarea value={serviceAreas} onChange={e => setServiceAreas(e.target.value)} placeholder={'San Antonio, TX\nBexar County\nNew Braunfels, TX\n78201, 78202'} rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '4px' }}>Google allows up to 20 service areas</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-accent" onClick={() => setStep(4)}>Next: Description</button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Business Description</div>
          <div style={{ marginBottom: '1rem', padding: '10px 14px', background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '8px', fontSize: '12px', color: '#4a6080' }}>
            Max 750 characters. Include main services, city, and a call to action. No URLs, hours, or promotional claims like "best" or "#1".
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={labelStyle}>Description</label>
              <span style={{ fontSize: '11px', color: description.length > 700 ? '#ff4444' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{description.length}/750</span>
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your business..." rows={6} maxLength={750} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
            <button className="btn btn-ghost" onClick={generateDescription} disabled={aiGenerating || !bizName}>
              {aiGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-accent" onClick={() => setStep(5)}>Next: Submit</button>
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Submit to Google</div>

          {!connected ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '1.25rem' }}>Connect your Google account to submit the listing directly to Google Business Profile.</p>
              <button onClick={connectGoogle} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '14px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Connect with Google
              </button>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Business', value: bizName },
                    { label: 'Category', value: bizCategory },
                    { label: 'Phone', value: bizPhone },
                    { label: 'Website', value: bizWebsite },
                    { label: 'Address', value: `${bizAddress}, ${bizCity}, ${bizState} ${bizZip}` },
                    { label: 'SAB', value: isServiceAreaBiz ? 'Yes' : 'No' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace', marginBottom: '2px' }}>{s.label}</div>
                      <div style={{ fontSize: '13px', color: '#0d1b2e', fontWeight: 500 }}>{s.value || 'Not set'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {accounts.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Google Business Account</label>
                  <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} style={inputStyle}>
                    {accounts.map((a: any) => <option key={a.name} value={a.name}>{a.accountName || a.name}</option>)}
                  </select>
                </div>
              )}

              {submitError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '1rem' }}>{submitError}</div>}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => setStep(4)}>Back</button>
                <button className="btn btn-accent" onClick={submitToGoogle} disabled={submitting || !selectedAccount}>
                  {submitting ? 'Submitting to Google...' : 'Submit Listing to Google'}
                </button>
                <button className="btn btn-ghost" onClick={exportGuide} style={{ fontSize: '13px' }}>
                  {exported ? 'Downloaded!' : 'Download Guide Instead'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 6 — Result */}
      {step === 6 && submitResult && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,208,132,0.1)', color: '#00d084', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700 }}>v</div>
            <div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, color: '#00d084' }}>Listing Submitted!</div>
              <div style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '2px' }}>Your listing has been submitted to Google Business Profile</div>
            </div>
          </div>

          <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginBottom: '4px' }}>Listing ID</div>
            <div style={{ fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: '#0d1b2e', wordBreak: 'break-all' }}>{submitResult.name}</div>
          </div>

          {verificationOptions.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '0.75rem' }}>Verification Options Available</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {verificationOptions.map((opt: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(30,144,255,0.1)', color: '#1e90ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                      {opt.verificationMethod === 'POSTCARD' ? 'P' : opt.verificationMethod === 'PHONE_CALL' ? 'C' : opt.verificationMethod === 'SMS' ? 'S' : 'E'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{opt.verificationMethod?.replace('_', ' ')}</div>
                      <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px' }}>
                        {opt.verificationMethod === 'POSTCARD' ? 'Google will mail a PIN to your address (5-7 days)' :
                         opt.verificationMethod === 'PHONE_CALL' ? 'Google will call your business phone with a PIN' :
                         opt.verificationMethod === 'SMS' ? 'Google will text a PIN to your phone' :
                         'Google will email a verification link'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: '1rem 1.25rem', background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '8px', fontSize: '13px', color: '#4a6080', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Go to <a href="https://business.google.com" target="_blank" style={{ color: '#1e90ff', textDecoration: 'none', fontWeight: 600 }}>business.google.com</a> to complete verification and add photos, posts, and services to your listing.
          </div>

          <button className="btn btn-accent" onClick={() => { setStep(1); setSubmitResult(null); setBizName(''); setBizCategory(''); setBizPhone(''); setBizWebsite(''); setBizAddress(''); setBizCity(''); setBizState(''); setBizZip(''); setDescription(''); setServiceAreas('') }}>
            Create Another Listing
          </button>
        </div>
      )}
    </div>
  )
}
