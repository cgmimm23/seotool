'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut()
      setError('Access denied. Admin credentials required.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1b2e',
      padding: '1rem',
    }}>
      <div style={{
        background: '#1a2942',
        border: '1px solid rgba(255,180,0,0.2)',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px', height: '48px', background: '#ffb400',
            borderRadius: '12px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 800,
            fontSize: '20px', color: '#0d1b2e',
          }}>A</div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '22px', color: '#fff' }}>
            Admin <span style={{ color: '#ffb400' }}>Portal</span>
          </h1>
          <p style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '4px' }}>
            Authorized personnel only
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#7a8fa8', marginBottom: '4px' }}>Email</label>
            <input
              type="email"
              placeholder="admin@cgmimm.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.6rem 0.75rem', background: '#0d1b2e',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#7a8fa8', marginBottom: '4px' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.6rem 0.75rem', background: '#0d1b2e',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
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
              width: '100%', padding: '0.65rem', background: '#ffb400',
              border: 'none', borderRadius: '8px', color: '#0d1b2e',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Montserrat, sans-serif', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
