'use client'

import { useEffect, useState } from 'react'

const cardStyle = { background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.08)' }
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
const btnStyle = { padding: '0.5rem 1.25rem', background: '#e4b34f', border: 'none', borderRadius: '50px', color: '#fff', fontWeight: 700 as const, cursor: 'pointer', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }

interface ApiKey { id: string; name: string; key_prefix: string; scopes: string[]; last_used_at: string | null; revoked: boolean; created_at: string }

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newKey, setNewKey] = useState('')
  const [error, setError] = useState('')

  async function fetchKeys() {
    const res = await fetch('/api/v1/api-keys')
    if (res.status === 403) { setError('Enterprise plan required'); setLoading(false); return }
    const data = await res.json()
    setKeys((data.keys || []).filter((k: ApiKey) => !k.revoked))
    setLoading(false)
  }

  useEffect(() => { fetchKeys() }, [])

  async function createKey() {
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName || 'Default', scopes: ['read', 'write'] }),
    })
    const data = await res.json()
    if (data.key) { setNewKey(data.key); fetchKeys() }
    else setError(data.error)
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? Any integrations using it will stop working.')) return
    await fetch('/api/v1/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchKeys()
  }

  if (error === 'Enterprise plan required') {
    return (
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginBottom: '0.5rem' }}>API Access</h2>
        <p style={{ color: '#939393', fontSize: '14px' }}>API access is available on the Enterprise plan. Contact us to upgrade.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0' }}>API Keys</h2>
          <p style={{ fontSize: '13px', color: '#939393' }}>Manage your API keys for programmatic access</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnStyle}>+ New Key</button>
      </div>

      {newKey && (
        <div style={{ ...cardStyle, background: '#f0fdf4', border: '1px solid #22c55e', marginBottom: '1rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>Your new API key (copy it now — it won&apos;t be shown again):</p>
          <code style={{ fontSize: '13px', wordBreak: 'break-all', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '8px 12px', borderRadius: '6px', display: 'block' }}>{newKey}</code>
          <button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey('') }} style={{ ...btnStyle, marginTop: '8px', background: '#22c55e' }}>Copy & Dismiss</button>
        </div>
      )}

      {showCreate && !newKey && (
        <div style={{ ...cardStyle, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Key Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Production" style={inputStyle} />
            </div>
            <button onClick={createKey} style={btnStyle}>Generate</button>
            <button onClick={() => setShowCreate(false)} style={{ ...btnStyle, background: 'transparent', color: '#939393', border: '1px solid rgba(0,0,0,0.1)' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        {loading ? <p style={{ color: '#939393' }}>Loading...</p> : keys.length === 0 ? (
          <p style={{ color: '#939393', fontSize: '14px' }}>No API keys yet. Create one to get started.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                {['Name', 'Key', 'Scopes', 'Last Used', 'Created', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#939393', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500 }}>{k.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: '#939393' }}>{k.key_prefix}</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#68ccd1' }}>{k.scopes.join(', ')}</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#939393' }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#939393' }}>{new Date(k.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => revokeKey(k.id)} style={{ fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
        <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: '#2367a0', marginBottom: '0.75rem' }}>API Documentation</h3>
        <p style={{ fontSize: '13px', color: '#939393', marginBottom: '8px' }}>Base URL: <code style={{ background: '#f8f9fb', padding: '2px 6px', borderRadius: '4px' }}>https://seo.cgmimm.com/api/v1</code></p>
        <p style={{ fontSize: '13px', color: '#939393', marginBottom: '4px' }}>Authentication: <code style={{ background: '#f8f9fb', padding: '2px 6px', borderRadius: '4px' }}>Authorization: Bearer sk_live_...</code></p>
        <div style={{ marginTop: '12px', fontSize: '13px', color: '#939393' }}>
          <p style={{ fontWeight: 600, color: '#000', marginBottom: '4px' }}>Endpoints:</p>
          <p><code>GET /api/v1/sites</code> — List your sites</p>
          <p><code>GET /api/v1/sites/:id/audits</code> — Get audit reports for a site</p>
          <p><code>GET /api/v1/keywords?site_id=...</code> — List keywords</p>
          <p><code>GET /api/v1/rankings?keyword_id=...</code> — Get ranking history</p>
        </div>
      </div>
    </div>
  )
}
