'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AiChat from '@/app/components/AiChat'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('')
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [firstSiteId, setFirstSiteId] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email || '')
        supabase.from('sites').select('id').eq('user_id', session.user.id).limit(1).single().then(({ data }) => {
          if (data) setFirstSiteId(data.id)
        })
      }
    })
    fetch('/api/notifications').then(r => r.json()).then(d => {
      setUnread(d.unread || 0)
      setNotifications(d.notifications || [])
    }).catch(() => {})
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      <aside style={{ width: '220px', flexShrink: 0, background: '#fff', borderRight: '1px solid rgba(0,0,0,0.08)', borderTop: '3px solid #1e90ff', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50 }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '13px', color: '#0d1b2e', lineHeight: 1.2 }}>SEO by CGMIMM</div>
          <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#1e90ff', letterSpacing: '0.05em' }}>AI-Powered Platform</div>
        </div>
        <nav style={{ flex: 1, padding: '0.5rem 0' }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', margin: '1px 0.5rem', borderRadius: '8px', fontSize: '13px', color: '#1e90ff', background: 'rgba(30,144,255,0.08)', fontWeight: 600, textDecoration: 'none' }}>Dashboard</a>
          <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.75rem 1rem 0.25rem', fontFamily: 'Roboto Mono, monospace' }}>Account</div>
          <a href="/dashboard/settings" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', margin: '1px 0.5rem', borderRadius: '8px', fontSize: '13px', color: '#4a6080', textDecoration: 'none' }}>Settings</a>
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
          <button onClick={signOut} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.4rem', fontSize: '12px', color: '#7a8fa8', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>Sign Out</button>
        </div>
      </aside>
      <div style={{ marginLeft: '220px', flex: 1 }}>
        {/* Top bar with notification bell */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 1.5rem', position: 'relative' }}>
          <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) { fetch('/api/notifications', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) }).then(() => setUnread(0)) } }} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a8fa8" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {unread > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, width: '16px', height: '16px', borderRadius: '50%', background: '#ff4444', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>
            )}
          </button>

          {showNotifs && (
            <div style={{ position: 'absolute', top: '40px', right: '1.5rem', width: '340px', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: '400px', overflow: 'auto' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', color: '#2367a0' }}>Notifications</div>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#939393', fontSize: '13px' }}>No notifications</div>
              ) : notifications.map(n => (
                <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', background: n.read ? 'transparent' : 'rgba(30,144,255,0.03)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#000' }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px' }}>{n.message.substring(0, 100)}</div>
                  <div style={{ fontSize: '10px', color: '#939393', marginTop: '4px' }}>{new Date(n.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: '0 1.5rem 2rem', maxWidth: '1200px' }}>{children}</div>
      </div>
      {firstSiteId && <AiChat siteId={firstSiteId} />}
    </div>
  )
}
