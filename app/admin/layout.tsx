'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('')
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) return
    fetch('/api/admin/check-role').then(r => r.json()).then(d => {
      if (d.email) setEmail(d.email)
    }).catch(() => {})
  }, [isLoginPage])

  if (isLoginPage) {
    return <>{children}</>
  }

  function signOut() {
    document.cookie = 'admin_session=; path=/; max-age=0'
    window.location.href = '/admin/login'
  }

  const navItems = [
    { href: '/admin', label: 'Overview', icon: 'grid' },
    { href: '/admin/users', label: 'Users', icon: 'users' },
    { href: '/admin/stats', label: 'Statistics', icon: 'chart' },
    { href: '/admin/financials', label: 'Financials', icon: 'dollar' },
    { href: '/admin/billing', label: 'Billing', icon: 'card' },
    { href: '/admin/notifications', label: 'Notifications', icon: 'bell' },
    { href: '/admin/settings', label: 'Settings', icon: 'gear' },
  ]

  const icons: Record<string, React.ReactNode> = {
    grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    dollar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    card: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    gear: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
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
            SEO by CGMIMM
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
