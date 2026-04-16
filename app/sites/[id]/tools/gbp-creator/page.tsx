'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Step = 1 | 2 | 3 | 4 | 5 | 6

const BUSINESS_CATEGORIES = ['Plumber', 'Electrician', 'HVAC Contractor', 'Roofer', 'Landscaper', 'General Contractor', 'Painter', 'Cleaning Service', 'Auto Repair Shop', 'Restaurant', 'Dentist', 'Law Firm', 'Accountant', 'Real Estate Agent', 'Insurance Agent', 'Hair Salon', 'Gym', 'Marketing Agency', 'IT Services', 'Web Designer', 'Photographer']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const defaultHours = DAYS.reduce((acc, day) => ({ ...acc, [day]: { open: !['Saturday', 'Sunday'].includes(day), from: '09:00', to: '17:00' } }), {} as Record<string, { open: boolean; from: string; to: string }>)

export default function GBPCreatorPage({ params }: { params: { id: string } }) {
  const [step, setStep] = useState<Step>(1)
  const [connected, setConnected] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [submitError, setSubmitError] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const supabase = createClient()

  const [bizName, setBizName] = useState('')
  const [bizCategory, setBizCategory] = useState('')
  const [bizPhone, setBizPhone] = useState('')
  const [bizWebsite, setBizWebsite] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [bizCity, setBizCity] = useState('')
  const [bizState, setBizState] = useState('')
  const [bizZip, setBizZip] = useState('')
  const [hours, setHours] = useState(defaultHours)
  const [serviceAreas, setServiceAreas] = useState('')
  const [isServiceAreaBiz, setIsServiceAreaBiz] = useState(false)
  const [description, setDescription] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      if (session.provider_token) { setConnected(true); fetchAccounts() }
      else {
        supabase.from('profiles').select('google_access_token').eq('id', session.user.id).single().then(({ data }) => {
          if (data?.google_access_token) { setConnected(true); fetchAccounts() }
        })
      }
    })
  }, [])

  async function connectGoogle() {
    const next = encodeURIComponent(window.location.pathname)
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}`, scopes: 'https://www.googleapis.com/auth/business.manage https://www.googleapis.com/auth/webmasters.readonly', queryParams: { access_type: 'offline', prompt: 'consent' } } })
  }

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/gbp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_accounts' }) })
      const data = await res.json()
      if (data.accounts) { setAccounts(data.accounts); if (data.accounts.length > 0) setSelectedAccount(data.accounts[0].name) }
    } catch {}
  }

  async function generateDescription() {
    setAiGenerating(true)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, system: 'Write an optimized Google Business Profile description under 750 characters. Include business name, city, key services, and a call to action. Plain text only.', messages: [{ role: 'user', content: `Business: ${bizName}, Category: ${bizCategory}, City: ${bizCity} ${bizState}, Services: ${serviceAreas}` }] }) })
      const data = await res.json()
      const text = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''
      setDescription(text.trim())
    } catch { alert('Could not generate description') }
    finally { setAiGenerating(false) }
  }

  async function submitToGoogle() {
    if (!selectedAccount) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/gbp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_location', accountId: selectedAccount, location: { bizName, bizCategory, bizPhone, bizWebsite, bizAddress, bizCity, bizState, bizZip, hours, serviceAreas, isServiceAreaBiz, description } }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSubmitResult(data.location)
      setStep(6)
    } catch (err: any) { setSubmitError(err.message) }
    finally { setSubmitting(false) }
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Open Sans, sans-serif', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }

  const steps = ['Business Info', 'Address', 'Hours', 'Description', 'Submit', 'Done']

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}><h2 style={{ fontSize: '20px', marginBottom: '4px' }}>GBP Creator</h2><p style={{ fontSize: '13px', color: '#7a8fa8' }}>Create or claim a Google Business Profile listing</p></div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step > i + 1 ? '#00d084' : step === i + 1 ? '#1e90ff' : '#e4eaf0', color: step >= i + 1 ? '#fff' : '#7a8fa8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{step > i + 1 ? '✓' : i + 1}</div>
            <div style={{ fontSize: '12px', color: step === i + 1 ? '#0d1b2e' : '#7a8fa8', display: i < steps.length - 1 ? undefined : undefined }}>{s}</div>
            {i < steps.length - 1 && <div style={{ width: '20px', height: '1px', background: '#e4eaf0', flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Business Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><label style={labelStyle}>Business Name</label><input type="text" style={inputStyle} placeholder="Joe's Plumbing" value={bizName} onChange={e => setBizName(e.target.value)} /></div>
            <div><label style={labelStyle}>Category</label><select value={bizCategory} onChange={e => setBizCategory(e.target.value)} style={inputStyle}><option value="">Select category...</option>{BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={labelStyle}>Phone</label><input type="text" style={inputStyle} placeholder="(210) 555-5555" value={bizPhone} onChange={e => setBizPhone(e.target.value)} /></div>
            <div><label style={labelStyle}>Website</label><input type="text" style={inputStyle} placeholder="https://yoursite.com" value={bizWebsite} onChange={e => setBizWebsite(e.target.value)} /></div>
          </div>
          <button className="btn btn-accent" onClick={() => setStep(2)} disabled={!bizName || !bizCategory}>Next: Address</button>
        </div>
      )}

      {step === 2 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Location</div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Service Area Business?</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4a6080' }}>
              <input type="checkbox" checked={isServiceAreaBiz} onChange={e => setIsServiceAreaBiz(e.target.checked)} />
              Yes — I serve customers at their location (no storefront)
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Street Address</label><input type="text" style={inputStyle} placeholder="123 Main St" value={bizAddress} onChange={e => setBizAddress(e.target.value)} /></div>
            <div><label style={labelStyle}>City</label><input type="text" style={inputStyle} placeholder="San Antonio" value={bizCity} onChange={e => setBizCity(e.target.value)} /></div>
            <div><label style={labelStyle}>State</label><input type="text" style={inputStyle} placeholder="TX" value={bizState} onChange={e => setBizState(e.target.value)} /></div>
            <div><label style={labelStyle}>ZIP Code</label><input type="text" style={inputStyle} placeholder="78201" value={bizZip} onChange={e => setBizZip(e.target.value)} /></div>
          </div>
          {isServiceAreaBiz && <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>Service Areas</label><input type="text" style={inputStyle} placeholder="San Antonio, Austin, New Braunfels" value={serviceAreas} onChange={e => setServiceAreas(e.target.value)} /></div>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-accent" onClick={() => setStep(3)}>Next: Hours</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Business Hours</div>
          {DAYS.map(day => (
            <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '100px', fontSize: '13px', color: '#4a6080' }}>{day}</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={hours[day].open} onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], open: e.target.checked } }))} />
                <span style={{ fontSize: '12px', color: '#7a8fa8' }}>{hours[day].open ? 'Open' : 'Closed'}</span>
              </label>
              {hours[day].open && (
                <>
                  <input type="time" value={hours[day].from} onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], from: e.target.value } }))} style={{ ...inputStyle, width: 'auto' }} />
                  <span style={{ color: '#7a8fa8' }}>–</span>
                  <input type="time" value={hours[day].to} onChange={e => setHours(h => ({ ...h, [day]: { ...h[day], to: e.target.value } }))} style={{ ...inputStyle, width: 'auto' }} />
                </>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
            <button className="btn btn-accent" onClick={() => setStep(4)}>Next: Description</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Business Description</div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={labelStyle}>Description</label>
              <span style={{ fontSize: '11px', color: description.length > 700 ? '#ff4444' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{description.length}/750</span>
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your business..." rows={6} maxLength={750} style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
            <button className="btn btn-ghost" onClick={generateDescription} disabled={aiGenerating || !bizName}>{aiGenerating ? 'Generating...' : 'Generate with AI'}</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-accent" onClick={() => setStep(5)}>Next: Submit</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '1.25rem' }}>Submit to Google</div>
          {!connected ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '1.25rem' }}>Connect your Google account to submit the listing directly to Google Business Profile.</p>
              <button onClick={connectGoogle} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '14px', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Connect with Google
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[{ label: 'Business', value: bizName }, { label: 'Category', value: bizCategory }, { label: 'Phone', value: bizPhone }, { label: 'Address', value: `${bizAddress}, ${bizCity}, ${bizState} ${bizZip}` }].map(s => (
                    <div key={s.label}><div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace', marginBottom: '2px' }}>{s.label}</div><div style={{ fontSize: '13px', color: '#0d1b2e', fontWeight: 500 }}>{s.value || 'Not set'}</div></div>
                  ))}
                </div>
              </div>
              {accounts.length > 0 ? (
                <div style={{ marginBottom: '1rem' }}><label style={labelStyle}>Google Business Account</label><select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} style={inputStyle}>{accounts.map((a: any) => <option key={a.name} value={a.name}>{a.accountName || a.name}</option>)}</select></div>
              ) : (
                <div style={{ background: 'rgba(228,179,79,0.1)', border: '1px solid rgba(228,179,79,0.3)', borderRadius: '8px', padding: '1rem', fontSize: '13px', color: '#7a5818', marginBottom: '1rem' }}>
                  No Google Business accounts found. Either your Google account has no GBP access, or the connected account is missing the Business Profile permission.
                  <div style={{ marginTop: '10px' }}>
                    <button onClick={connectGoogle} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      Reconnect with Google (pick a different account)
                    </button>
                  </div>
                </div>
              )}
              {submitError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '1rem' }}>{submitError}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" onClick={() => setStep(4)}>Back</button>
                <button className="btn btn-accent" onClick={submitToGoogle} disabled={submitting || !selectedAccount}>{submitting ? 'Submitting to Google...' : 'Submit Listing to Google'}</button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 6 && submitResult && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,208,132,0.1)', color: '#00d084', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700 }}>✓</div>
            <div><div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, color: '#00d084' }}>Listing Submitted!</div><div style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '2px' }}>Your listing has been submitted to Google Business Profile</div></div>
          </div>
          <p style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>Go to <a href="https://business.google.com" target="_blank" style={{ color: '#1e90ff', textDecoration: 'none', fontWeight: 600 }}>business.google.com</a> to complete verification and add photos, posts, and services.</p>
        </div>
      )}
    </div>
  )
}
