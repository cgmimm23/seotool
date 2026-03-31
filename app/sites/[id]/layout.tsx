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

  const id = params.id

  const navSections = [
    {
      section: null,
      items: [
        { label: 'Site Overview', href: `/sites/${id}` },
      ]
    },
    {
      section: 'SEO Tools',
      items: [
        { label: 'Site Audit', href: `/sites/${id}/audit` },
        { label: 'Site Crawler', href: `/sites/${id}/site-crawler` },
        { label: 'Keywords', href: `/sites/${id}/keywords` },
        { label: 'SERP Tracker', href: `/sites/${id}/serp` },
        { label: 'Rank History', href: `/sites/${id}/rank-history` },
        { label: 'Page Speed', href: `/sites/${id}/pagespeed` },
        { label: 'AI Visibility', href: `/sites/${id}/ai-visibility` },
        { label: 'Backlinks', href: `/sites/${id}/backlinks` },
      ]
    },
    {
      section: 'Google Data',
      items: [
        { label: 'Analytics', href: `/sites/${id}/analytics` },
        { label: 'Search Console', href: `/sites/${id}/search-console` },
        { label: 'Google Ads', href: `/sites/${id}/google-ads` },
      ]
    },
    {
      section: 'Local',
      items: [
        { label: 'Local SEO', href: `/sites/${id}/local-seo` },
        { label: 'Google Reviews', href: `/sites/${id}/reviews` },
        { label: 'Aggregators', href: `/sites/${id}/aggregators` },
      ]
    },
    {
      section: 'Tools',
      items: [
        { label: 'Schema Builder', href: `/sites/${id}/schema` },
        { label: 'Image Tool', href: `/sites/${id}/tools/image` },
        { label: 'GBP Creator', href: `/sites/${id}/tools/gbp-creator` },
      ]
    },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: '#0d1b2e',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 50,
        overflowY: 'auto',
      }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', marginBottom: '10px' }}>
            <span style={{ color: '#7a8fa8', fontSize: '11px', fontFamily: 'Roboto Mono, monospace' }}>← All Sites</span>
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

        <nav style={{ flex: 1, padding: '0.5rem 0' }}>
          {navSections.map((section, si) => (
            <div key={si}>
              {section.section && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.75rem 1rem 0.25rem', fontFamily: 'Roboto Mono, monospace' }}>
                  {section.section}
                </div>
              )}
              {section.items.map(item => {
                const active = pathname === item.href
                return (
                  <a key={item.href} href={item.href} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.5rem 1rem',
                    margin: '1px 0.5rem',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                    background: active ? 'rgba(30,144,255,0.3)' : 'transparent',
                    fontWeight: active ? 600 : 400,
                    textDecoration: 'none',
                  }}>
                    {item.label}
                  </a>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
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
