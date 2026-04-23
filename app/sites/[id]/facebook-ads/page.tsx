'use client'

import { useEffect, useState, Suspense } from 'react'
import MetaConnectBlock from '@/app/components/MetaConnectBlock'

const DAYS_OPTIONS = [7, 14, 28, 90]

function AdStats({ siteId, adAccountId }: { siteId: string; adAccountId: string | null }) {
  const [days, setDays] = useState(28)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accounts, setAccounts] = useState<any[]>([])
  const [currentId, setCurrentId] = useState<string | null>(adAccountId)

  useEffect(() => { setCurrentId(adAccountId) }, [adAccountId])

  useEffect(() => {
    fetch(`/api/meta/ad-accounts?siteId=${siteId}`)
      .then(r => r.json())
      .then(j => { if (j.accounts) setAccounts(j.accounts) })
      .catch(() => {})
  }, [siteId])

  useEffect(() => {
    if (!currentId) { setData(null); return }
    setLoading(true); setError('')
    fetch(`/api/facebook-ads?siteId=${siteId}&days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setData(j) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [currentId, days, siteId])

  async function switchAccount(id: string) {
    await fetch('/api/meta/ad-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, adAccountId: id }),
    })
    setCurrentId(id)
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const curr = data?.account?.currency || 'USD'
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(n || 0)

  if (!currentId) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>No ad account detected</div>
        <div style={{ fontSize: '13px', color: '#7a8fa8', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto' }}>
          The Facebook user you connected doesn&apos;t have an ad account we can read. Make sure you&apos;re an admin on at least one Business Manager ad account, then hit <strong>Reconnect</strong>.
          <br/><br/>
          Also note: access to ads data requires the <code>ads_read</code> permission to be approved in your Meta App Review before non-admin users can connect.
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Ad Account</div>
        <select value={currentId || ''} onChange={e => switchAccount(e.target.value)} className="form-input" style={{ flex: 1, minWidth: '260px', fontSize: '13px' }}>
          {accounts.length === 0 && currentId && <option value={currentId}>{currentId}</option>}
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
        </select>
      </div>

      <div style={{ ...card, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Last</span>
        {DAYS_OPTIONS.map(d => (
          <button key={d} onClick={() => setDays(d)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '11px', fontWeight: days === d ? 700 : 400, border: days === d ? '1px solid #1877F2' : '1px solid rgba(0,0,0,0.1)', background: days === d ? 'rgba(24,119,242,0.08)' : '#fff', color: days === d ? '#1877F2' : '#7a8fa8', cursor: 'pointer', fontFamily: 'Roboto Mono, monospace' }}>{d}d</button>
        ))}
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      {loading && <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading ads data...</div>}

      {data?.totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
          {[
            { label: 'Spend', value: fmtMoney(data.totals.spend) },
            { label: 'Impressions', value: data.totals.impressions.toLocaleString() },
            { label: 'Reach', value: data.totals.reach.toLocaleString() },
            { label: 'Clicks', value: data.totals.clicks.toLocaleString() },
            { label: 'CTR', value: `${data.totals.ctr.toFixed(2)}%` },
            { label: 'CPC', value: fmtMoney(data.totals.cpc) },
            { label: 'CPM', value: fmtMoney(data.totals.cpm) },
            { label: 'Frequency', value: data.totals.frequency.toFixed(2) },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {data?.campaigns?.length > 0 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Campaigns ({data.campaigns.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Campaign', 'Status', 'Objective', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC'].map((h, i) => (
                    <th key={h} style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: i < 3 ? 'left' : 'right', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#0d1b2e' }}>{c.name}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '11px', color: c.status === 'ACTIVE' ? '#00d084' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{c.status}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{c.objective?.replace(/_/g, ' ').toLowerCase() || '—'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#0d1b2e', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{fmtMoney(c.spend)}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#0d1b2e', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{c.impressions.toLocaleString()}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#0d1b2e', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{c.clicks.toLocaleString()}</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{c.ctr.toFixed(2)}%</td>
                    <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{fmtMoney(c.cpc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data && data.campaigns?.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>No campaigns with data in this period.</div>
      )}
    </>
  )
}

function Inner({ params }: { params: { id: string } }) {
  return (
    <MetaConnectBlock siteId={params.id} title="Facebook Ads" description="Meta Ads spend, reach, and campaign performance">
      {({ adAccountId }) => <AdStats siteId={params.id} adAccountId={adAccountId} />}
    </MetaConnectBlock>
  )
}

export default function FacebookAdsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <Inner params={params} />
    </Suspense>
  )
}
