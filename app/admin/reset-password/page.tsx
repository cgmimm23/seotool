'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/admin/login')
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
            Set New <span style={{ color: '#68ccd1' }}>Password</span>
          </h1>
        </div>

        {!ready ? (
          <p style={{ fontSize: '13px', color: '#939393', textAlign: 'center' }}>
            Verifying reset link...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>New Password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', background: '#f8f9fb',
                  border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
                  color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', background: '#f8f9fb',
                  border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
                  color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#ff4444', marginBottom: '0.75rem' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.65rem', background: '#e4b34f',
                border: 'none', borderRadius: '50px', color: '#fff',
                fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Montserrat, sans-serif', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
