'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface ReportData {
  report: { url: string; overall_score: number; grade: string; summary: string; categories: Record<string, number>; checks: { status: string; category: string; title: string; detail: string }[]; created_at: string }
  client_name: string
  branding: { company_name: string; logo_url?: string; primary_color: string; secondary_color: string; footer_text?: string }
}

export default function PublicReportPage() {
  const params = useParams()
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/reports/${params.token}`)
      .then(r => { if (!r.ok) throw new Error(r.status === 410 ? 'This report link has expired.' : 'Report not found.'); return r.json() })
      .then(setData)
      .catch(e => setError(e.message))
  }, [params.token])

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb' }}>
      <div style={{ textAlign: 'center', color: '#939393' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#128274;</div>
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#2367a0' }}>{error}</p>
      </div>
    </div>
  )

  if (!data) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#939393' }}>Loading report...</div>

  const { report, client_name, branding } = data
  const checks = report.checks || []
  const passing = checks.filter(c => c.status === 'pass')
  const warnings = checks.filter(c => c.status === 'warn')
  const failing = checks.filter(c => c.status === 'fail')

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb' }}>
      {/* Header */}
      <div style={{ background: branding.primary_color, padding: '2rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {branding.logo_url && <img src={branding.logo_url} alt="" style={{ height: '36px' }} />}
            <div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff' }}>
                {branding.company_name || 'SEO by CGMIMM'}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>SEO Audit Report</div>
            </div>
          </div>
          {client_name && <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>Prepared for: <strong>{client_name}</strong></div>}
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        {/* Score */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: branding.primary_color, fontFamily: 'Montserrat, sans-serif' }}>{report.overall_score}</div>
            <div style={{ fontSize: '12px', color: '#939393' }}>Overall Score</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: branding.secondary_color, fontFamily: 'Montserrat, sans-serif' }}>{report.grade}</div>
            <div style={{ fontSize: '12px', color: '#939393' }}>Grade</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>{failing.length}</div>
            <div style={{ fontSize: '12px', color: '#939393' }}>Issues</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#22c55e', fontFamily: 'Montserrat, sans-serif' }}>{passing.length}</div>
            <div style={{ fontSize: '12px', color: '#939393' }}>Passing</div>
          </div>
        </div>

        {/* URL & Date */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '14px', color: '#000' }}>URL: <strong>{report.url}</strong></div>
          <div style={{ fontSize: '13px', color: '#939393', marginTop: '4px' }}>Audited: {new Date(report.created_at).toLocaleString()}</div>
          {report.summary && <div style={{ fontSize: '14px', color: '#000', marginTop: '12px', lineHeight: 1.6 }}>{report.summary}</div>}
        </div>

        {/* Categories */}
        {report.categories && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: branding.primary_color, marginBottom: '1rem' }}>Category Scores</h3>
            {Object.entries(report.categories).map(([cat, score]) => (
              <div key={cat} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#000' }}>{cat}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: branding.primary_color }}>{score}/100</span>
                </div>
                <div style={{ height: '6px', background: '#f0f4f8', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: (score as number) >= 80 ? '#22c55e' : (score as number) >= 50 ? '#e4b34f' : '#ef4444', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Checks */}
        {[{ title: 'Issues to Fix', items: failing, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
          { title: 'Warnings', items: warnings, color: '#e4b34f', bg: 'rgba(228,179,79,0.08)' },
          { title: 'Passing', items: passing, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
        ].map(section => section.items.length > 0 && (
          <div key={section.title} style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.08)', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: section.color, marginBottom: '1rem' }}>
              {section.title} ({section.items.length})
            </h3>
            {section.items.map((check, i) => (
              <div key={i} style={{ padding: '10px 12px', marginBottom: '6px', background: section.bg, borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>{check.title}</div>
                <div style={{ fontSize: '13px', color: '#939393', marginTop: '2px' }}>{check.detail}</div>
              </div>
            ))}
          </div>
        ))}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#939393', fontSize: '12px' }}>
          {branding.footer_text || `Report generated by ${branding.company_name || 'SEO by CGMIMM'}`}
        </div>

        {/* Print button */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button onClick={() => window.print()} style={{ padding: '0.6rem 2rem', background: branding.primary_color, border: 'none', borderRadius: '50px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
            Download as PDF
          </button>
        </div>
      </div>
    </div>
  )
}
