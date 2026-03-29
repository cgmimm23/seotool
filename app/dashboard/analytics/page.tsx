'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AnalyticsPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  const stats = [
    { label: 'Impressions', value: '124,841', delta: '▲ 8%', up: true },
    { label: 'Clicks', value: '8,412', delta: '▲ 12%', up: true },
    { label: 'Avg CTR', value: '6.8%', delta: '▲ 0.4%', up: true },
    { label: 'Avg Position', value: '11.2', delta: '▲ 1.3 pos', up: true },
  ]

  const topPages = [
    { page: '/', clicks: 2841, impressions: 31200, ctr: '9.1%', position: 4.2 },
    { page: '/pricing', clicks: 1204, impressions: 18400, ctr: '6.5%', position: 7.8 },
    { page: '/blog/seo-tips', clicks: 984, impressions: 19300, ctr: '5.1%', position: 9.4 },
    { page: '/features', clicks: 741, impressions: 16100, ctr: '4.6%', position: 12.1 },
    { page: '/about', clicks: 412, impressions: 9800, ctr: '4.2%', position: 14.5 },
  ]

  const topKeywords = [
    { keyword: 'seo audit tool', clicks: 842, impressions: 9200, ctr: '9.2%', position: 3.8 },
    { keyword: 'free seo checker', clicks: 634, impressions: 11400, ctr: '5.6%', position: 6.2 },
    { keyword: 'website seo analyzer', clicks: 521, impressions: 8700, ctr: '6.0%', position: 5.1 },
    { keyword: 'seo rank tracker', clicks: 398, impressions: 7200, ctr: '5.5%', position: 8.4 },
    { keyword: 'keyword position checker', clicks: 312, impressions: 6100, ctr: '5.1%', position: 9.7 },
  ]

  const chartBars = [42, 38, 55, 61, 48, 52, 70, 65, 78, 82, 71, 68, 85, 90, 88, 76, 92, 87, 95, 89, 84, 91, 98, 88, 94, 86, 92, 96, 89, 100]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Analytics</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Google Search Console & GA4 data</p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => alert('Connect Google Search Console in Settings to pull live data.')}
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Connect Google
        </button>
      </div>

      {/* Notice */}
      <div style={{ background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '10px', padding: '0.85rem 1.1rem', fontSize: '13px', color: '#4a6080', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#1e90ff', fontSize: '16px' }}>ℹ</span>
        Showing sample data. Connect Google Search Console in <strong style={{ color: '#1e90ff', cursor: 'pointer' }}>Settings</strong> to see your real analytics.
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{s.value}</div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: s.up ? '#00d084' : '#ff4444' }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Chart + Top pages */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Clicks over time</div>
            <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Last 30 days</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px', padding: '0 4px' }}>
            {chartBars.map((h, i) => (
              <div
                key={i}
                title={`${Math.round(h * 10)} clicks`}
                style={{
                  flex: 1, borderRadius: '2px 2px 0 0',
                  height: `${h}%`,
                  background: i >= 24 ? '#1e90ff' : 'rgba(30,144,255,0.25)',
                  transition: 'opacity 0.2s',
                  cursor: 'pointer',
                  minWidth: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
            <span>Mar 1</span><span>Mar 15</span><span>Mar 29</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top pages</div>
          {topPages.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < topPages.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: '#4a6080', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{p.page}</div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                <span style={{ color: '#0d1b2e', fontWeight: 600 }}>{p.clicks.toLocaleString()}</span>
                <span style={{ color: '#00d084', fontFamily: 'Roboto Mono, monospace' }}>{p.ctr}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top keywords table */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top Keywords</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Keyword', 'Clicks', 'Impressions', 'CTR', 'Position'].map(h => (
                <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400, padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topKeywords.map((k, i) => (
              <tr key={i} style={{ borderBottom: i < topKeywords.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <td style={{ padding: '0.65rem 0.75rem', fontSize: '13px', fontWeight: 500 }}>{k.keyword}</td>
                <td style={{ padding: '0.65rem 0.75rem', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>{k.clicks.toLocaleString()}</td>
                <td style={{ padding: '0.65rem 0.75rem', fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: '#7a8fa8' }}>{k.impressions.toLocaleString()}</td>
                <td style={{ padding: '0.65rem 0.75rem', fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: '#00d084' }}>{k.ctr}</td>
                <td style={{ padding: '0.65rem 0.75rem', fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: '#ffa500' }}>{k.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
