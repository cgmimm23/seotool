'use client'

import { useEffect, useState, useCallback } from 'react'

interface User {
  id: string
  email: string
  full_name: string
  plan: string
  status: string
  role: string
  created_at: string
  last_sign_in_at: string | null
  sites_count: number
}

const planColors: Record<string, string> = {
  free: '#7a8fa8', starter: '#1e90ff', pro: '#ffb400', agency: '#22c55e',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '25' })
    if (search) params.set('search', search)
    if (planFilter) params.set('plan', planFilter)
    if (statusFilter) params.set('status', statusFilter)

    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    setUsers(data.users || [])
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 1)
    setLoading(false)
  }, [page, search, planFilter, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleStatusToggle(userId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    if (!confirm(`${newStatus === 'suspended' ? 'Suspend' : 'Activate'} this user?`)) return
    setActionLoading(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setActionLoading('')
    fetchUsers()
  }

  async function handlePlanChange(userId: string, newPlan: string) {
    setActionLoading(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: newPlan }),
    })
    setActionLoading('')
    fetchUsers()
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    setActionLoading(userId)
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    setActionLoading('')
    fetchUsers()
  }

  const inputStyle = {
    padding: '0.5rem 0.75rem', background: '#0d1b2e',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    color: '#fff', fontSize: '13px', outline: 'none',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', color: '#fff' }}>
          Users <span style={{ fontSize: '16px', color: '#7a8fa8', fontWeight: 400 }}>({total})</span>
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '0.5rem 1.25rem', background: '#ffb400', border: 'none',
            borderRadius: '8px', color: '#0d1b2e', fontWeight: 700, cursor: 'pointer',
            fontSize: '13px', fontFamily: 'Montserrat, sans-serif',
          }}
        >
          + Add User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
        />
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1) }} style={inputStyle}>
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="agency">Agency</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={inputStyle}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#1a2942', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Name', 'Email', 'Plan', 'Status', 'Sites', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#5a6f88' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#5a6f88' }}>No users found</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: actionLoading === user.id ? 0.5 : 1 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <a href={`/admin/users/${user.id}`} style={{ color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
                      {user.full_name || '—'}
                    </a>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#7a8fa8' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={user.plan}
                      onChange={e => handlePlanChange(user.id, e.target.value)}
                      style={{
                        background: 'transparent', border: 'none', fontSize: '12px', fontWeight: 600,
                        color: planColors[user.plan] || '#7a8fa8', cursor: 'pointer', outline: 'none',
                      }}
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="agency">Agency</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 600,
                      background: user.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: user.status === 'active' ? '#22c55e' : '#ef4444',
                    }}>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#7a8fa8' }}>{user.sites_count}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#5a6f88' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleStatusToggle(user.id, user.status)}
                        title={user.status === 'active' ? 'Suspend' : 'Activate'}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          fontSize: '11px', fontWeight: 600,
                          background: user.status === 'active' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                          color: user.status === 'active' ? '#ef4444' : '#22c55e',
                        }}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        title="Delete"
                        style={{
                          padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          fontSize: '11px', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '1rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...inputStyle, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span style={{ padding: '0.5rem 1rem', color: '#7a8fa8', fontSize: '13px' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...inputStyle, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && <AddUserModal onClose={() => { setShowAddModal(false); fetchUsers() }} />}
    </div>
  )
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, plan }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create user')
      setLoading(false)
      return
    }

    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.75rem', background: '#0d1b2e',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#1a2942', borderRadius: '16px', padding: '2rem',
        width: '100%', maxWidth: '420px', border: '1px solid rgba(255,180,0,0.2)',
      }}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', color: '#fff', marginBottom: '1.5rem' }}>
          Add New User
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px', fontWeight: 600 }}>Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px', fontWeight: 600 }}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@example.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px', fontWeight: 600 }}>Password *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px', fontWeight: 600 }}>Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
              <option value="free">Free</option>
              <option value="starter">Starter ($29/mo)</option>
              <option value="pro">Pro ($79/mo)</option>
              <option value="agency">Agency ($199/mo)</option>
            </select>
          </div>

          {error && <p style={{ fontSize: '13px', color: '#ff4444', marginBottom: '0.75rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '0.6rem', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
              color: '#7a8fa8', cursor: 'pointer', fontSize: '13px',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              flex: 1, padding: '0.6rem', background: '#ffb400', border: 'none',
              borderRadius: '8px', color: '#0d1b2e', fontWeight: 700, cursor: 'pointer',
              fontSize: '13px', fontFamily: 'Montserrat, sans-serif',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
