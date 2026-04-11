'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { articles, categories } from '@/lib/seo-articles';

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      {/* Sidebar */}
      <aside
        className="learn-sidebar"
        style={{
          width: '280px',
          minWidth: '280px',
          background: '#fff',
          borderRight: '1px solid rgba(0,0,0,0.08)',
          padding: '1.5rem 0',
          overflowY: 'auto',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* Logo / Home */}
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '16px', color: '#2367a0', lineHeight: 1.2 }}>
              AI SEO
            </div>
            <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '9px', color: '#68ccd1', letterSpacing: '0.05em' }}>
              powered by CGMIMM
            </div>
          </Link>
        </div>

        <div style={{ padding: '0 1.25rem 1rem' }}>
          <Link
            href="/learn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: pathname === '/learn' ? '#2367a0' : '#939393',
              textDecoration: 'none',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            &#8592; Learning Center
          </Link>
        </div>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginBottom: '0.75rem' }} />

        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom: '1rem' }}>
            <div
              style={{
                padding: '0.25rem 1.25rem',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#2367a0',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {cat}
            </div>
            {articles
              .filter((a) => a.category === cat)
              .map((a) => {
                const isActive = pathname === `/learn/${a.slug}`;
                return (
                  <Link
                    key={a.slug}
                    href={`/learn/${a.slug}`}
                    style={{
                      display: 'block',
                      padding: '6px 1.25rem 6px 1.5rem',
                      fontSize: '12.5px',
                      color: isActive ? '#2367a0' : '#555',
                      background: isActive ? 'rgba(35,103,160,0.06)' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      textDecoration: 'none',
                      borderLeft: isActive ? '3px solid #2367a0' : '3px solid transparent',
                      lineHeight: 1.5,
                      fontFamily: 'Open Sans, sans-serif',
                    }}
                  >
                    {a.title.length > 42 ? a.title.slice(0, 42) + '...' : a.title}
                  </Link>
                );
              })}
          </div>
        ))}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>

      {/* Mobile sidebar styles */}
      <style>{`
        @media (max-width: 860px) {
          .learn-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
