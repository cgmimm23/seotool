'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface UserDetail {
  user: {
    id: string; email: string; full_name: string; avatar_url: string;
    plan: string; status: string; role: string; created_at: string;
    last_sign_in_at: string | null;
    trial_ends_at: string | null;
    stripe_subscription_id?: string | null;
  }
  sites: { id: string; url: string; name: string; active: boolean; created_at: string }[]
  totalAudits: number
  totalKeywords: number
  duplicates: { id: string; plan: string; created_at: string }[]
}

const cardStyle = {
  background: '#fff', borderRadius: '12px', padding: '1.5rem',
  border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editPlan, setEditPlan] = useState('')
  const [editName, setEditName] = useState('')
  const [editStatus, setEditStatus] = useState('')

  useEffect(() => {
    fetch(`/api/admin/users/${params.id}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setEditPlan(d.user.plan)
        setEditName(d.user.full_name || '')
        setEditStatus(d.user.status)
        setLoading(false)
      })
  }, [params.id])

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/admin/users/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: editPlan, full_name: editName, status: editStatus }),
    })
    const res = await fetch(`/api/admin/users/${params.id}`)
    const d = await res.json()
    setData(d)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete user ${data?.user.email}? This permanently removes their account and all data.`)) return
    await fetch(`/api/admin/users/${params.id}`, { method: 'DELETE' })
    router.push('/admin/users')
  }

  async function clearTrial() {
    setSaving(true)
    await fetch(`/api/admin/users/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial_ends_at: null }),
    })
    const res = await fetch(`/api/admin/users/${params.id}`)
    setData(await res.json())
    setSaving(false)
  }

  async function impersonate() {
    const res = await fetch(`/api/admin/users/${params.id}/impersonate`, { method: 'POST' })
    const j = await res.json()
    if (j.url) window.open(j.url, '_blank')
    else alert(j.error || 'Failed to generate sign-in link')
  }

  if (loading) return <div style={{ color: '#939393', padding: '2rem' }}>Loading user...</div>
  if (!data) return <div style={{ color: '#ef4444', padding: '2rem' }}>User not found</div>

  const { user, sites, totalAudits, totalKeywords } = data
  const inputStyle = {
    padding: '0.5rem 0.75rem', background: '#f8f9fb',
    border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
    color: '#000', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/admin/users" style={{ color: '#939393', textDecoration: 'none', fontSize: '13px' }}>&larr; Back to Users</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '18px', color: '#2367a0', marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif' }}>
            User Details
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Email</label>
            <div style={{ fontSize: '14px', color: '#000' }}>{user.email}</div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Full Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Plan</label>
            <select value={editPlan} onChange={e => setEditPlan(e.target.value)} style={inputStyle}>
              <option value="starter">Starter ($59.95/mo)</option>
              <option value="pro">Pro ($149/mo)</option>
              <option value="enterprise">Enterprise (Custom)</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Status</label>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={inputStyle}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Trial</label>
            <div style={{ fontSize: '13px', color: user.trial_ends_at ? '#000' : '#939393' }}>
              {user.trial_ends_at
                ? `Ends ${new Date(user.trial_ends_at).toLocaleString()}${new Date(user.trial_ends_at) < new Date() ? ' (expired)' : ''}`
                : 'No active trial'}
              {user.trial_ends_at && (
                <button onClick={clearTrial} disabled={saving} style={{ marginLeft: '10px', background: 'none', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '50px', padding: '2px 10px', fontSize: '11px', cursor: 'pointer', color: '#2367a0', fontWeight: 600 }}>
                  Clear trial
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>User ID</label>
            <div style={{ fontSize: '11px', color: '#939393', fontFamily: 'monospace', wordBreak: 'break-all' }}>{user.id}</div>
          </div>

          {data.duplicates.length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', marginBottom: '6px' }}>
                ⚠ {data.duplicates.length} other profile{data.duplicates.length !== 1 ? 's' : ''} share this email
              </div>
              {data.duplicates.map(d => (
                <div key={d.id} style={{ fontSize: '11px', color: '#000', marginBottom: '4px' }}>
                  <a href={`/admin/users/${d.id}`} style={{ color: '#2367a0', fontFamily: 'monospace' }}>{d.id.slice(0, 8)}…</a>
                  {' — '}{d.plan} — created {new Date(d.created_at).toLocaleDateString()}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Member Since</label>
            <div style={{ fontSize: '13px', color: '#939393' }}>{new Date(user.created_at).toLocaleString()}</div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Last Sign In</label>
            <div style={{ fontSize: '13px', color: '#939393' }}>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '0.5rem 1.5rem', background: '#e4b34f', border: 'none',
              borderRadius: '50px', color: '#fff', fontWeight: 700, cursor: 'pointer',
              fontSize: '13px', fontFamily: 'Montserrat, sans-serif',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={impersonate} style={{
              padding: '0.5rem 1.5rem', background: '#2367a0', border: 'none',
              borderRadius: '50px', color: '#fff', fontWeight: 700, cursor: 'pointer',
              fontSize: '13px', fontFamily: 'Montserrat, sans-serif',
            }}>
              Sign in as user
            </button>
            <button onClick={handleDelete} style={{
              padding: '0.5rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: 'none',
              borderRadius: '50px', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '13px',
            }}>
              Delete User
            </button>
          </div>
        </div>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Sites', value: sites.length, color: '#2367a0' },
              { label: 'Audits', value: totalAudits, color: '#68ccd1' },
              { label: 'Keywords', value: totalKeywords, color: '#e4b34f' },
            ].map(s => (
              <div key={s.label} style={cardStyle}>
                <div style={{ fontSize: '11px', color: '#939393', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: s.color, fontFamily: 'Montserrat, sans-serif' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
              Sites ({sites.length})
            </h2>
            {sites.length === 0 ? (
              <div style={{ color: '#939393', fontSize: '13px' }}>No sites added yet</div>
            ) : (
              sites.map(site => (
                <div key={site.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#000' }}>{site.name || site.url}</div>
                    <div style={{ fontSize: '11px', color: '#939393' }}>{site.url}</div>
                  </div>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                    background: site.active ? 'rgba(104,204,209,0.15)' : 'rgba(239,68,68,0.15)',
                    color: site.active ? '#68ccd1' : '#ef4444', fontWeight: 600,
                  }}>
                    {site.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
