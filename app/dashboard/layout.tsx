'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', section: null },
  { label: 'Site Audit', href: '/dashboard/audit', section: 'SEO Tools' },
  { label: 'Keywords', href: '/dashboard/keywords', section: null },
  { label: 'SERP Tracker', href: '/dashboard/serp', section: null },
  { label: 'Page Speed', href: '/dashboard/pagespeed', section: null },
  { label: 'AI Visibility', href: '/dashboard/ai-visibility', section: null },
  { label: 'Backlinks', href: '/dashboard/backlinks', section: null },
  { label: 'Analytics', href: '/dashboard/analytics', section: 'Google Data' },
  { label: 'Search Console', href: '/dashboard/search-console', section: null },
  { label: 'Google Ads', href: '/dashboard/google-ads', section: null },
  { label: 'Local SEO', href: '/dashboard/local-seo', section: 'Local' },
  { label: 'Schema Builder', href: '/dashboard/schema', section: 'Tools' },
  { label: 'Image Tool', href: '/dashboard/tools/image', section: null },
  { label: 'GBP Creator', href: '/dashboard/tools/gbp-creator', section: null },
  { label: 'Settings', href: '/dashboard/settings', section: 'Account' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('')
  const [pathname, setPathname] = useState('')

  useEffect(() => {
    setPathname(window.location.pathname)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setEmail(session.user.email || '')
    })
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  let currentSection = ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      <aside style={{ width: '220px', flexShrink: 0, background: '#fff', borderRight: '1px solid rgba(0,0,0,0.08)', borderTop: '3px solid #1e90ff', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50 }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: '#1e90ff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '13px', color: '#fff' }}>M</div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '15px', color: '#0d1b2e' }}>Marketing<span style={{ color: '#1e90ff' }}>SEO</span></div>
        </div>
        <nav style={{ flex: 1, padding: '0.5rem 0', overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = pathname === item.href
            const showSection = item.section && item.section !== currentSection
            if (showSection) currentSection = item.section!
            return (
              <div key={item.href}>
                {showSection && (
                  <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.75rem 1rem 0.25rem', fontFamily: 'Roboto Mono, monospace' }}>{item.section}</div>
                )}
                <a href={item.href} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', margin: '1px 0.5rem', borderRadius: '8px', fontSize: '13px', color: active ? '#1e90ff' : '#4a6080', background: active ? 'rgba(30,144,255,0.08)' : 'transparent', fontWeight: active ? 600 : 400, textDecoration: 'none' }}>
                  {item.label}
                </a>
              </div>
            )
          })}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
          <button onClick={signOut} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.4rem', fontSize: '12px', color: '#7a8fa8', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>Sign Out</button>
        </div>
      </aside>
      <div style={{ marginLeft: '220px', flex: 1 }}>
        <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px' }}>{children}</div>
      </div>
    </div>
  )
}
