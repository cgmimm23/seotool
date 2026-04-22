'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Props = {
  siteId: string
  title: string
  description: string
  children: (ctx: {
    connected: boolean
    pageId: string | null
    pageName: string | null
    igUserId: string | null
    igUsername: string | null
    adAccountId: string | null
    pages: any[]
    switchPage: (id: string) => Promise<void>
    reload: () => void
  }) => React.ReactNode
}

export default function MetaConnectBlock({ siteId, title, description, children }: Props) {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [pageId, setPageId] = useState<string | null>(null)
  const [pageName, setPageName] = useState<string | null>(null)
  const [igUserId, setIgUserId] = useState<string | null>(null)
  const [igUsername, setIgUsername] = useState<string | null>(null)
  const [adAccountId, setAdAccountId] = useState<string | null>(null)
  const [pages, setPages] = useState<any[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await supabase
        .from('sites')
        .select('meta_user_access_token, meta_page_id, meta_page_name, meta_ig_user_id, meta_ig_username, meta_ad_account_id')
        .eq('id', siteId)
        .single()
      const site = data as any
      if (site?.meta_user_access_token) {
        setConnected(true)
        setPageId(site.meta_page_id)
        setPageName(site.meta_page_name)
        setIgUserId(site.meta_ig_user_id)
        setIgUsername(site.meta_ig_username)
        setAdAccountId(site.meta_ad_account_id)
        // fetch all pages for the picker
        try {
          const res = await fetch(`/api/meta/pages?siteId=${siteId}`)
          const j = await res.json()
          if (j.pages) setPages(j.pages)
        } catch {}
      } else {
        setConnected(false)
      }
      setLoading(false)
    })()
  }, [siteId, reloadKey])

  async function connect() {
    const returnTo = window.location.pathname
    window.location.href = `/api/meta/connect?siteId=${siteId}&returnTo=${encodeURIComponent(returnTo)}`
  }

  async function switchPage(newId: string) {
    await fetch('/api/meta/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, pageId: newId }),
    })
    setReloadKey(k => k + 1)
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>{title}</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>{description}</p>
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>Checking Meta connection...</div>
      ) : !connected ? (
        <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>Connect Facebook</div>
          <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1.25rem', maxWidth: '460px', margin: '0 auto 1.25rem', lineHeight: 1.6 }}>
            Connect the Facebook account that manages your Page to see real insights — followers, reach, engagement, top posts, reviews, Instagram data, and ad performance all in one place.
          </p>
          <button onClick={connect} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#1877F2', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '13px', color: '#fff', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Connect with Facebook
          </button>
        </div>
      ) : (
        <>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Page</div>
            <select value={pageId || ''} onChange={e => switchPage(e.target.value)} className="form-input" style={{ flex: 1, minWidth: '220px', fontSize: '13px' }}>
              {pages.length === 0 && pageId && <option value={pageId}>{pageName}</option>}
              {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={connect} className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }}>Reconnect</button>
          </div>
          {children({ connected, pageId, pageName, igUserId, igUsername, adAccountId, pages, switchPage, reload: () => setReloadKey(k => k + 1) })}
        </>
      )}
    </div>
  )
}
