'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setUser(user)
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '▦' },
    { label: 'Site Audit', href: '/dashboard/audit', icon: '✓' },
    { label: 'Keywords', href: '/dashboard/keywords', icon: '≡' },
    { label: 'SERP Tracker', href: '/dashboard/serp', icon: '◎' },
    { label: 'Page Speed', href: '/dashboard/pagespeed', icon: '⚡' },
    { label: 'Backlinks', href: '/dashboard/backlinks', icon: '⇄' },
    { label: 'Analytics', href: '/dashboard/analytics', icon: '↗' },
    { label: 'Settings', href: '/dashboard/settings', icon: '⚙' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0, background: '#fff',
        borderRight: '1px solid rgba(0,0,0,0.08)',
        borderTop: '3px solid #1e90ff',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', background: '#1e90ff', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '13px', color: '#fff',
          }}>M</div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '15px', color: '#0d1b2e' }}>
            Marketing<span style={{ color: '#1e90ff' }}>SEO</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '0.55rem 1rem', margin: '1px 0.5rem',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px',
                  color: active ? '#1e90ff' : '#4a6080',
                  background: active ? 'rgba(30,144,255,0.08)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </div>
            )
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
          <button onClick={signOut} style={{
            width: '100%', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px', padding: '0.4rem', fontSize: '12px', color: '#7a8fa8',
            cursor: 'pointer', fontFamily: 'Open Sans, sans-serif',
          }}>Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ marginLeft: '220px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
