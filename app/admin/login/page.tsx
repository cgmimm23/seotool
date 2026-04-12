'use client'

import { useState } from 'react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passkey, setPasskey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // One API call does everything: verify credentials, role, and passkey
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, passkey }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Login failed')
      setLoading(false)
      return
    }

    window.location.href = '/admin'
  }

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.75rem', background: '#f8f9fb',
    border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
    color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
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
            Authorized personnel only
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@cgmimm.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>Passkey</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={passkey}
              onChange={e => setPasskey(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="6-digit code"
              style={{ ...inputStyle, letterSpacing: '0.2em', fontFamily: 'Roboto Mono, monospace' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#ff4444', marginBottom: '0.75rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || passkey.length !== 6}
            style={{
              width: '100%', padding: '0.65rem', background: '#e4b34f',
              border: 'none', borderRadius: '50px', color: '#fff',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              opacity: loading || passkey.length !== 6 ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a href="/admin/forgot-password" style={{ fontSize: '12px', color: '#68ccd1', textDecoration: 'none' }}>
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
