'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also check if already in recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
  }, [supabase.auth])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 6) return setError('Password must be at least 6 characters')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) return setError(error.message)
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: '1rem' }}>
      <div style={{ background: '#fff', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '22px', color: '#0d1b2e' }}>Set New <span style={{ color: '#1e90ff' }}>Password</span></h1>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', color: '#00d084' }}>&#10003;</div>
            <p style={{ fontSize: '14px', color: '#0d1b2e', fontWeight: 600 }}>Password updated!</p>
            <p style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '8px' }}>Redirecting to dashboard...</p>
          </div>
        ) : !ready ? (
          <p style={{ fontSize: '13px', color: '#7a8fa8', textAlign: 'center' }}>Verifying reset link...</p>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>

            {error && <p style={{ fontSize: '13px', color: '#ff4444', marginBottom: '0.75rem' }}>{error}</p>}

            <button type="submit" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }} disabled={loading || !password || !confirm}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
