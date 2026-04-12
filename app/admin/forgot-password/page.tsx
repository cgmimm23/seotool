'use client'

import { useState } from 'react'

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/admin/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb', padding: '1rem' }}>
      <div style={{ background: '#fff', border: '1px solid rgba(104,204,209,0.25)', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '22px', color: '#2367a0' }}>Reset <span style={{ color: '#68ccd1' }}>Password</span></h1>
          <p style={{ fontSize: '13px', color: '#939393', marginTop: '4px' }}>Enter your admin email to receive a reset link</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#9993;</div>
            <p style={{ fontSize: '14px', color: '#2367a0', fontWeight: 600, marginBottom: '8px' }}>Check your email</p>
            <p style={{ fontSize: '13px', color: '#939393', marginBottom: '1.5rem' }}>If an admin account exists for <strong style={{ color: '#000' }}>{email}</strong>, a reset link has been sent. The link expires in 1 hour.</p>
            <a href="/admin/login" style={{ display: 'inline-block', padding: '0.6rem 1.5rem', background: '#e4b34f', borderRadius: '50px', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '13px' }}>Back to Sign In</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#2367a0', marginBottom: '4px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@cgmimm.com" style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading || !email} style={{ width: '100%', padding: '0.65rem', background: '#e4b34f', border: 'none', borderRadius: '50px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', opacity: loading || !email ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <a href="/admin/login" style={{ fontSize: '12px', color: '#939393', textDecoration: 'none' }}>&larr; Back to Sign In</a>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
