'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('')
  const pathname = usePathname()

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setEmail(session.user.email || '')
    })
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  const navItems = [
    { href: '/admin', label: 'Overview', icon: 'grid' },
    { href: '/admin/users', label: 'Users', icon: 'users' },
    { href: '/admin/stats', label: 'Statistics', icon: 'chart' },
    { href: '/admin/financials', label: 'Financials', icon: 'dollar' },
  ]

  const icons: Record<string, React.ReactNode> = {
    grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    dollar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      <aside style={{
        width: '230px', flexShrink: 0, background: '#fff',
        borderRight: '1px solid rgba(0,0,0,0.08)', borderTop: '3px solid #68ccd1',
        display: 'flex', flexDirection: 'column', position: 'fixed',
        top: 0, left: 0, height: '100vh', zIndex: 50,
      }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '14px', color: '#2367a0', lineHeight: 1.2 }}>
            Admin Portal
          </div>
          <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#68ccd1', letterSpacing: '0.05em' }}>
            Marketing Machine
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '0.6rem 1.25rem', margin: '2px 0.5rem', borderRadius: '8px',
                fontSize: '13px', textDecoration: 'none', transition: 'all 0.15s',
                color: isActive(item.href) ? '#2367a0' : '#939393',
                background: isActive(item.href) ? 'rgba(104,204,209,0.12)' : 'transparent',
                fontWeight: isActive(item.href) ? 600 : 400,
              }}
            >
              {icons[item.icon]}
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <a href="/dashboard" style={{
            display: 'block', fontSize: '12px', color: '#939393', textDecoration: 'none',
            marginBottom: '10px', padding: '0.4rem 0',
          }}>
            &larr; Back to Dashboard
          </a>
          <div style={{ fontSize: '12px', color: '#939393', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </div>
          <button onClick={signOut} style={{
            width: '100%', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px', padding: '0.4rem', fontSize: '12px', color: '#939393',
            cursor: 'pointer', fontFamily: 'Open Sans, sans-serif',
          }}>
            Sign Out
          </button>
        </div>
      </aside>

      <div style={{ marginLeft: '230px', flex: 1 }}>
        <div style={{ padding: '2rem 1.5rem', maxWidth: '1400px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
