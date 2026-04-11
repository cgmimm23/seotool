import Link from 'next/link';
import { articles, categories } from '@/lib/seo-articles';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEO Learning Center | AI SEO by CGMIMM',
  description:
    'Learn everything about SEO — from beginner fundamentals to advanced strategies. Free, in-depth guides on technical SEO, on-page optimization, link building, and more.',
  openGraph: {
    title: 'SEO Learning Center | AI SEO by CGMIMM',
    description:
      'Free, in-depth SEO guides covering technical SEO, on-page optimization, link building, local SEO, and more.',
    url: 'https://seo.cgmimm.com/learn',
  },
  alternates: { canonical: 'https://seo.cgmimm.com/learn' },
};

const catColors: Record<string, string> = {
  'SEO Fundamentals': '#2367a0',
  'Technical SEO': '#68ccd1',
  'On-Page SEO': '#e4b34f',
  'Off-Page SEO': '#d46b4e',
  'Advanced SEO': '#7c5cbf',
};

export default function LearnHub() {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: '50px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#68ccd1',
            background: 'rgba(104,204,209,0.1)',
            marginBottom: '1rem',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          FREE SEO EDUCATION
        </div>
        <h1
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 800,
            fontSize: '2.5rem',
            color: '#2367a0',
            lineHeight: 1.15,
            marginBottom: '1rem',
          }}
        >
          SEO Learning Center
        </h1>
        <p
          style={{
            color: '#939393',
            fontSize: '1.05rem',
            lineHeight: 1.7,
            maxWidth: '620px',
            margin: '0 auto',
            fontFamily: 'Open Sans, sans-serif',
          }}
        >
          Everything you need to understand and master search engine optimization — from
          foundational concepts to advanced strategies. Written by SEO practitioners, free
          for everyone.
        </p>
      </div>

      {/* Categories */}
      {categories.map((cat) => {
        const catArticles = articles.filter((a) => a.category === cat);
        const color = catColors[cat] || '#2367a0';
        return (
          <section key={cat} style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ width: '4px', height: '24px', borderRadius: '2px', background: color }} />
              <h2
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.3rem',
                  color: '#000',
                  margin: 0,
                }}
              >
                {cat}
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  color: '#939393',
                  fontFamily: 'Open Sans, sans-serif',
                }}
              >
                {catArticles.length} {catArticles.length === 1 ? 'article' : 'articles'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {catArticles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/learn/${a.slug}`}
                  style={{
                    display: 'block',
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    textDecoration: 'none',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                  }}
                  // hover handled with CSS class below
                  className="learn-card"
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.5rem',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    {cat}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#000',
                      margin: '0 0 0.5rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {a.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: '#939393',
                      lineHeight: 1.6,
                      margin: 0,
                      fontFamily: 'Open Sans, sans-serif',
                    }}
                  >
                    {a.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <div
        style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, #2367a0, #68ccd1)',
          borderRadius: '16px',
          padding: '2.5rem 1.5rem',
          marginTop: '2rem',
        }}
      >
        <h2
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 800,
            fontSize: '1.5rem',
            color: '#fff',
            marginBottom: '0.75rem',
          }}
        >
          Ready to Put This Knowledge Into Action?
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.95rem',
            marginBottom: '1.5rem',
            maxWidth: '500px',
            margin: '0 auto 1.5rem',
            fontFamily: 'Open Sans, sans-serif',
            lineHeight: 1.6,
          }}
        >
          AI SEO powered by CGMIMM automates audits, rank tracking, and optimization — so you
          can focus on growing your business.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: '#e4b34f',
            color: '#fff',
            borderRadius: '50px',
            fontSize: '15px',
            fontWeight: 700,
            textDecoration: 'none',
            fontFamily: 'Montserrat, sans-serif',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
          }}
        >
          Start Your 48-Hour Free Trial
        </Link>
      </div>

      <style>{`
        .learn-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-color: rgba(35,103,160,0.2) !important;
        }
      `}</style>
    </div>
  );
}
