'use client'

import { useEffect, useState } from 'react'

const cardStyle = { background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.08)' }
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
const btnStyle = { padding: '0.5rem 1.25rem', background: '#e4b34f', border: 'none', borderRadius: '50px', color: '#fff', fontWeight: 700 as const, cursor: 'pointer', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }

interface Team { id: string; name: string; owner_id: string; team_members: any[] }
interface Member { id: string; user_id: string; role: string; email: string; full_name: string; invite_status: string }

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  async function fetchTeams() {
    const res = await fetch('/api/teams')
    if (res.status === 403) { setError('Enterprise plan required'); setLoading(false); return }
    const data = await res.json()
    setTeams(data.teams || [])
    if (data.teams?.length > 0 && !selectedTeam) {
      setSelectedTeam(data.teams[0].id)
      fetchMembers(data.teams[0].id)
    }
    setLoading(false)
  }

  async function fetchMembers(teamId: string) {
    const res = await fetch(`/api/teams/${teamId}/members`)
    const data = await res.json()
    setMembers(data.members || [])
  }

  useEffect(() => { fetchTeams() }, [])

  async function createTeam() {
    if (!newTeamName) return
    await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newTeamName }) })
    setNewTeamName('')
    fetchTeams()
  }

  async function inviteMember() {
    if (!inviteEmail || !selectedTeam) return
    const res = await fetch(`/api/teams/${selectedTeam}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setInviteEmail('')
    fetchMembers(selectedTeam)
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this team member?')) return
    await fetch(`/api/teams/${selectedTeam}/members`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    fetchMembers(selectedTeam)
  }

  if (error === 'Enterprise plan required') {
    return (
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginBottom: '0.5rem' }}>Team Collaboration</h2>
        <p style={{ color: '#939393', fontSize: '14px' }}>Team collaboration is available on the Enterprise plan. Contact us to upgrade.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginBottom: '1.5rem' }}>Team Collaboration</h2>

      {teams.length === 0 && !loading ? (
        <div style={cardStyle}>
          <p style={{ color: '#939393', fontSize: '14px', marginBottom: '1rem' }}>Create a team to start collaborating with your colleagues.</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Team name" style={{ ...inputStyle, maxWidth: '300px' }} />
            <button onClick={createTeam} style={btnStyle}>Create Team</button>
          </div>
        </div>
      ) : (
        <>
          {/* Team selector */}
          {teams.length > 1 && (
            <select value={selectedTeam} onChange={e => { setSelectedTeam(e.target.value); fetchMembers(e.target.value) }} style={{ ...inputStyle, maxWidth: '300px', marginBottom: '1rem' }}>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}

          {/* Invite */}
          <div style={{ ...cardStyle, marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: '#2367a0', marginBottom: '0.75rem' }}>Invite Member</h3>
            {error && error !== 'Enterprise plan required' && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Email</label>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={inputStyle}>
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={inviteMember} style={btnStyle}>Invite</button>
            </div>
          </div>

          {/* Members */}
          <div style={cardStyle}>
            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: '#2367a0', marginBottom: '0.75rem' }}>Members ({members.length})</h3>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#000' }}>{m.full_name || m.email}</div>
                  <div style={{ fontSize: '12px', color: '#939393' }}>{m.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(104,204,209,0.15)', color: '#68ccd1', fontWeight: 600, textTransform: 'uppercase' }}>{m.role}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: m.invite_status === 'accepted' ? 'rgba(34,197,94,0.15)' : 'rgba(228,179,79,0.15)', color: m.invite_status === 'accepted' ? '#22c55e' : '#e4b34f', fontWeight: 600 }}>{m.invite_status}</span>
                  <button onClick={() => removeMember(m.id)} style={{ fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
