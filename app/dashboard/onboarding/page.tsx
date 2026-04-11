'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [siteUrl, setSiteUrl] = useState('')
  const [siteName, setSiteName] = useState('')
  const [adding, setAdding] = useState(false)
  const [auditing, setAuditing] = useState(false)
  const [siteId, setSiteId] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function addSite() {
    if (!siteUrl) return
    setAdding(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let url = siteUrl.trim()
    if (!url.startsWith('http')) url = 'https://' + url

    const { data, error: err } = await supabase
      .from('sites')
      .insert({ user_id: user.id, url, name: siteName || url })
      .select()
      .single()

    if (err) { setError(err.message); setAdding(false); return }

    setSiteId(data.id)
    setAdding(false)
    setStep(2)
  }

  async function runAudit() {
    setAuditing(true)
    setError('')

    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, url: siteUrl }),
    })

    if (!res.ok) { setError('Audit failed. Try again.'); setAuditing(false); return }

    // Mark onboarding complete
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
    }

    setAuditing(false)
    setStep(3)
  }

  function goToDashboard() {
    router.push(`/sites/${siteId}/audit`)
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '2.5rem', maxWidth: '500px', margin: '0 auto', boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={card}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', justifyContent: 'center' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: '40px', height: '4px', borderRadius: '2px',
              background: s <= step ? '#68ccd1' : '#e4eaf0',
            }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚀</div>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '22px', color: '#2367a0', marginBottom: '8px' }}>Welcome! Add your first site</h2>
              <p style={{ fontSize: '14px', color: '#939393' }}>Enter your website URL and AI will start analyzing it immediately.</p>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px', fontWeight: 600 }}>Website URL</label>
              <input
                value={siteUrl} onChange={e => setSiteUrl(e.target.value)}
                placeholder="yoursite.com"
                style={{ width: '100%', padding: '0.7rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px', fontWeight: 600 }}>Site Name (optional)</label>
              <input
                value={siteName} onChange={e => setSiteName(e.target.value)}
                placeholder="My Website"
                style={{ width: '100%', padding: '0.7rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {error && <p style={{ color: '#ff4444', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}

            <button onClick={addSite} disabled={adding || !siteUrl} style={{
              width: '100%', padding: '0.75rem', background: '#e4b34f', border: 'none',
              borderRadius: '50px', color: '#fff', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
              opacity: adding || !siteUrl ? 0.7 : 1,
            }}>
              {adding ? 'Adding...' : 'Add Site & Continue'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '22px', color: '#2367a0', marginBottom: '8px' }}>Run your first AI audit</h2>
              <p style={{ fontSize: '14px', color: '#939393' }}>AI will analyze your site across dozens of SEO factors and give you a prioritized fix list.</p>
            </div>

            <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#939393' }}>Auditing</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#2367a0' }}>{siteUrl}</div>
            </div>

            {error && <p style={{ color: '#ff4444', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}

            <button onClick={runAudit} disabled={auditing} style={{
              width: '100%', padding: '0.75rem', background: '#e4b34f', border: 'none',
              borderRadius: '50px', color: '#fff', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
              opacity: auditing ? 0.7 : 1,
            }}>
              {auditing ? 'AI is analyzing your site...' : 'Run AI Audit'}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '22px', color: '#2367a0', marginBottom: '8px' }}>You're all set!</h2>
              <p style={{ fontSize: '14px', color: '#939393' }}>Your AI audit is complete. View your results and start improving your SEO.</p>
            </div>

            <div style={{ background: 'rgba(104,204,209,0.1)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', fontSize: '13px', color: '#2367a0', lineHeight: 1.6 }}>
              <strong>Your 48-hour free trial is active.</strong> You have full access to all features. No credit card required until your trial ends.
            </div>

            <button onClick={goToDashboard} style={{
              width: '100%', padding: '0.75rem', background: '#e4b34f', border: 'none',
              borderRadius: '50px', color: '#fff', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
            }}>
              View My Audit Results
            </button>
          </>
        )}
      </div>
    </div>
  )
}
