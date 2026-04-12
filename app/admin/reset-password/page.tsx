'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function AdminResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError('Missing reset token. Request a new reset link.')
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 8) return setError('Password must be at least 8 characters')

    setLoading(true)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) return setError(data.error || 'Failed to reset password')

    setSuccess(true)
    setTimeout(() => router.push('/admin/login'), 2500)
  }

  const input = { width: '100%', padding: '0.6rem 0.75rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb', padding: '1rem' }}>
      <div style={{ background: '#fff', border: '1px solid rgba(104,204,209,0.25)', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '22px', color: '#2367a0' }}>Set New <span style={{ color: '#68ccd1' }}>Password</span></h1>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', color: '#00d084' }}>&#10003;</div>
            <p style={{ fontSize: '14px', color: '#2367a0', fontWeight: 600 }}>Password changed!</p>
            <p style={{ fontSize: '13px', color: '#939393', marginTop: '8px' }}>Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" style={input} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={input} />
            </div>

            {error && <p style={{ fontSize: '13px', color: '#ff4444', marginBottom: '0.75rem' }}>{error}</p>}

            <button type="submit" disabled={loading || !token || !password || !confirm} style={{ width: '100%', padding: '0.65rem', background: '#e4b34f', border: 'none', borderRadius: '50px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', opacity: loading || !token || !password || !confirm ? 0.7 : 1 }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
