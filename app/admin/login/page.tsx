'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passkey, setPasskey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'passkey' | 'reset'>('login')
  const [resetSent, setResetSent] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Verify admin role via server-side API (avoids RLS timing issues)
    const roleRes = await fetch('/api/admin/check-role')
    const roleData = await roleRes.json()

    if (roleData.role !== 'admin') {
      await supabase.auth.signOut()
      setError('Access denied. Admin credentials required.')
      setLoading(false)
      return
    }

    // Move to passkey step - use callback to ensure state updates
    setLoading(false)
    setError('')
    setTimeout(() => setMode('passkey'), 100)
  }

  async function handlePasskey(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/verify-passkey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passkey }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Invalid passkey')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/admin/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setResetSent(true)
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.75rem', background: '#f8f9fb',
    border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
    color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
  }

  const btnStyle = {
    width: '100%', padding: '0.65rem', background: '#e4b34f',
    border: 'none', borderRadius: '50px', color: '#fff',
    fontSize: '14px', fontWeight: 700 as const, cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'Montserrat, sans-serif', opacity: loading ? 0.7 : 1,
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f9fb', padding: '1rem',
    }}>
      <div style={{
        background: '#fff', border: '1px solid rgba(104,204,209,0.25)',
        borderRadius: '16px', padding: '2.5rem', width: '100%',
        maxWidth: '400px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', margin: '0 auto 12px' }}>
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
              <rect width="64" height="64" rx="14" fill="#2367a0"/>
              <circle cx="27" cy="27" r="11" stroke="#68ccd1" strokeWidth="3.5" fill="none"/>
              <line x1="35" y1="35" x2="46" y2="46" stroke="#68ccd1" strokeWidth="3.5" strokeLinecap="round"/>
              <polyline points="21,31 25,25 29,28 33,22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <polyline points="30,22 33,22 33,25" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '22px', color: '#2367a0' }}>
            Admin <span style={{ color: '#68ccd1' }}>Portal</span>
          </h1>
          <p style={{ fontSize: '13px', color: '#939393', marginTop: '4px' }}>
            {mode === 'login' && 'Authorized personnel only'}
            {mode === 'passkey' && 'Enter your security passkey'}
            {mode === 'reset' && 'Reset your password'}
          </p>
        </div>

        {/* LOGIN STEP */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>Email</label>
              <input type="email" placeholder="admin@cgmimm.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
              <button type="button" onClick={() => { setMode('reset'); setError('') }}
                style={{ background: 'none', border: 'none', color: '#68ccd1', fontSize: '12px', cursor: 'pointer' }}>
                Forgot password?
              </button>
            </div>

            {error && <p style={{ fontSize: '13px', color: '#ff4444', marginBottom: '0.75rem' }}>{error}</p>}

            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* PASSKEY STEP */}
        {mode === 'passkey' && (
          <form onSubmit={handlePasskey}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '8px', textAlign: 'center' }}>
                6-Digit Passkey
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={passkey}
                onChange={e => setPasskey(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                style={{
                  ...inputStyle,
                  textAlign: 'center',
                  fontSize: '28px',
                  fontFamily: 'Roboto Mono, monospace',
                  letterSpacing: '0.5em',
                  padding: '0.75rem',
                }}
              />
            </div>

            {error && <p style={{ fontSize: '13px', color: '#ff4444', marginBottom: '0.75rem', textAlign: 'center' }}>{error}</p>}

            <button type="submit" disabled={loading || passkey.length !== 6} style={{ ...btnStyle, opacity: loading || passkey.length !== 6 ? 0.7 : 1 }}>
              {loading ? 'Verifying...' : 'Verify Passkey'}
            </button>

            <button type="button" onClick={async () => { await supabase.auth.signOut(); setMode('login'); setPasskey(''); setError('') }}
              style={{ width: '100%', padding: '0.65rem', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50px', color: '#939393', fontSize: '14px', cursor: 'pointer', marginTop: '0.75rem' }}>
              Cancel
            </button>
          </form>
        )}

        {/* RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleReset}>
            {resetSent ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#9993;</div>
                <p style={{ fontSize: '14px', color: '#2367a0', fontWeight: 600, marginBottom: '8px' }}>Reset link sent</p>
                <p style={{ fontSize: '13px', color: '#939393', marginBottom: '1.5rem' }}>
                  Check your email at <strong style={{ color: '#000' }}>{email}</strong> for a password reset link.
                </p>
                <button type="button" onClick={() => { setMode('login'); setResetSent(false); setError('') }} style={btnStyle}>
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>Email</label>
                  <input type="email" placeholder="admin@cgmimm.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                </div>

                {error && <p style={{ fontSize: '13px', color: '#ff4444', marginBottom: '0.75rem' }}>{error}</p>}

                <button type="submit" disabled={loading} style={{ ...btnStyle, marginBottom: '0.75rem' }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button type="button" onClick={() => { setMode('login'); setError('') }}
                  style={{ width: '100%', padding: '0.65rem', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50px', color: '#939393', fontSize: '14px', cursor: 'pointer' }}>
                  Back to Sign In
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
