'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const [site, setSite] = useState<any>(null)
  const [email, setEmail] = useState('')
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setEmail(session.user.email || '')
      const { data } = await supabase.from('sites').select('id, name, url').eq('id', params.id).single()
      if (data) setSite(data)
    }
    load()
  }, [params.id])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const siteUrl = site?.url ? encodeURIComponent(site.url) : ''

  const navItems = [
    { label: 'Site Overview', href: `/dashboard/sites/${params.id}`, section: null },
    { label: 'Site Audit', href: `/dashboard/audit?site=${siteUrl}`, section: 'SEO Tools' },
    { label: 'Site Crawler', href: `/dashboard/site-crawler?site=${siteUrl}`, section: null },
    { label: 'Keywords', href: `/dashboard/keywords?site=${siteUrl}`, section: null },
    { label: 'SERP Tracker', href: `/dashboard/serp?site=${siteUrl}`, section: null },
    { label: 'Page Speed', href: `/dashboard/pagespeed?site=${siteUrl}`, section: null },
    { label: 'AI Visibility', href: `/dashboard/ai-visibility?site=${siteUrl}`, section: null },
    { label: 'Analytics', href: `/dashboard/analytics?site=${siteUrl}`, section: 'Google Data' },
    { label: 'Search Console', href: `/dashboard/search-console?site=${siteUrl}`, section: null },
    { label: 'Google Ads', href: `/dashboard/google-ads?site=${siteUrl}`, section: null },
    { label: 'Local SEO', href: `/dashboard/local-seo?site=${siteUrl}`, section: 'Local' },
    { label: 'Google Reviews', href: `/dashboard/reviews?site=${siteUrl}`, section: null },
  ]

  let currentSection = ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      <aside style={{ width: '220px', flexShrink: 0, background: '#0d1b2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50 }}>
        
        {/* Back to all sites */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '10px' }}>
            <span style={{ color: '#7a8fa8', fontSize: '12px' }}>All Sites</span>
          </a>
          {site ? (
            <>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.name}</div>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#1e90ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.url?.replace(/^https?:\/\//, '')}</div>
            </>
          ) : (
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Loading...</div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '0.5rem 0', overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== `/dashboard/sites/${params.id}` && pathname?.startsWith(item.href.split('?')[0]))
            const showSection = item.section && item.section !== currentSection
            if (showSection) currentSection = item.section!
            return (
              <div key={item.href}>
                {showSection && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.75rem 1rem 0.25rem', fontFamily: 'Roboto Mono, monospace' }}>{item.section}</div>}
                <a href={item.href} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', margin: '1px 0.5rem', borderRadius: '8px', fontSize: '13px', color: active ? '#fff' : 'rgba(255,255,255,0.6)', background: active ? 'rgba(30,144,255,0.25)' : 'transparent', fontWeight: active ? 600 : 400, textDecoration: 'none' }}>
                  {item.label}
                </a>
              </div>
            )
          })}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
          <button onClick={signOut} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '0.4rem', fontSize: '12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>Sign Out</button>
        </div>
      </aside>

      <div style={{ marginLeft: '220px', flex: 1 }}>
        <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
