import Link from 'next/link';
import { notFound } from 'next/navigation';
import { articles, getArticleBySlug, getRelatedArticles, categories } from '@/lib/seo-articles';
import type { Metadata } from 'next';

/* ---------- static params for SSG ---------- */
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

/* ---------- dynamic metadata ---------- */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: `${article.title} | AI SEO by CGMIMM`,
    description: article.description,
    openGraph: {
      title: `${article.title} | AI SEO by CGMIMM`,
      description: article.description,
      url: `https://seo.cgmimm.com/learn/${article.slug}`,
      type: 'article',
    },
    alternates: { canonical: `https://seo.cgmimm.com/learn/${article.slug}` },
  };
}

/* ---------- category badge color ---------- */
const catColors: Record<string, string> = {
  'SEO Fundamentals': '#2367a0',
  'Technical SEO': '#68ccd1',
  'On-Page SEO': '#e4b34f',
  'Off-Page SEO': '#d46b4e',
  'Advanced SEO': '#7c5cbf',
};

/* ---------- page component ---------- */
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(slug, 4);
  const color = catColors[article.category] || '#2367a0';

  /* JSON-LD */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    author: { '@type': 'Organization', name: 'CGMIMM' },
    publisher: {
      '@type': 'Organization',
      name: 'AI SEO powered by CGMIMM',
      url: 'https://seo.cgmimm.com',
    },
    mainEntityOfPage: `https://seo.cgmimm.com/learn/${article.slug}`,
    datePublished: '2026-01-15',
    dateModified: '2026-04-10',
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {/* Breadcrumbs */}
        <nav
          style={{
            fontSize: '13px',
            color: '#939393',
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-open-sans), sans-serif',
          }}
        >
          <Link href="/" style={{ color: '#939393', textDecoration: 'none' }}>
            Home
          </Link>
          {' > '}
          <Link href="/learn" style={{ color: '#939393', textDecoration: 'none' }}>
            Learn
          </Link>
          {' > '}
          <span style={{ color: '#555' }}>{article.title}</span>
        </nav>

        {/* Category badge */}
        <div
          style={{
            display: 'inline-block',
            padding: '3px 12px',
            borderRadius: '50px',
            fontSize: '11px',
            fontWeight: 600,
            color,
            background: `${color}15`,
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-montserrat), sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {article.category}
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--font-montserrat), sans-serif',
            fontWeight: 800,
            fontSize: '2rem',
            color: '#2367a0',
            lineHeight: 1.2,
            marginBottom: '0.75rem',
          }}
        >
          {article.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '1.05rem',
            color: '#939393',
            lineHeight: 1.7,
            marginBottom: '2rem',
            fontFamily: 'var(--font-open-sans), sans-serif',
          }}
        >
          {article.description}
        </p>

        {/* Article body */}
        <article
          className="seo-article-body"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* CTA */}
        <div
          style={{
            background: 'linear-gradient(135deg, #2367a0, #68ccd1)',
            borderRadius: '16px',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            marginTop: '3rem',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-montserrat), sans-serif',
              fontWeight: 800,
              fontSize: '1.3rem',
              color: '#fff',
              marginBottom: '0.5rem',
            }}
          >
            Ready to Improve Your SEO?
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.92rem',
              marginBottom: '1.25rem',
              fontFamily: 'var(--font-open-sans), sans-serif',
              lineHeight: 1.6,
              maxWidth: '480px',
              margin: '0 auto 1.25rem',
            }}
          >
            Stop reading, start ranking. AI SEO powered by CGMIMM gives you the tools to put
            everything you just learned into practice — automatically.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '0.7rem 1.75rem',
              background: '#e4b34f',
              color: '#fff',
              borderRadius: '50px',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              fontFamily: 'var(--font-montserrat), sans-serif',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            }}
          >
            Start Your 48-Hour Free Trial
          </Link>
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <section style={{ marginTop: '3rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-montserrat), sans-serif',
                fontWeight: 700,
                fontSize: '1.2rem',
                color: '#000',
                marginBottom: '1rem',
              }}
            >
              Related Articles
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/learn/${r.slug}`}
                  className="learn-card"
                  style={{
                    display: 'block',
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textDecoration: 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: catColors[r.category] || '#2367a0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.35rem',
                      fontFamily: 'var(--font-montserrat), sans-serif',
                    }}
                  >
                    {r.category}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-montserrat), sans-serif',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#000',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {r.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Article body styles */}
      <style>{`
        .seo-article-body h2 {
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 700;
          font-size: 1.35rem;
          color: #2367a0;
          margin: 2rem 0 0.75rem;
          line-height: 1.3;
        }
        .seo-article-body h3 {
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 600;
          font-size: 1.08rem;
          color: #000;
          margin: 1.5rem 0 0.5rem;
          line-height: 1.35;
        }
        .seo-article-body p {
          font-family: var(--font-open-sans), sans-serif;
          font-size: 0.95rem;
          color: #333;
          line-height: 1.8;
          margin: 0 0 1rem;
        }
        .seo-article-body ul,
        .seo-article-body ol {
          font-family: var(--font-open-sans), sans-serif;
          font-size: 0.95rem;
          color: #333;
          line-height: 1.8;
          margin: 0 0 1rem;
          padding-left: 1.5rem;
        }
        .seo-article-body li {
          margin-bottom: 0.35rem;
        }
        .seo-article-body a {
          color: #2367a0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .seo-article-body a:hover {
          color: #68ccd1;
        }
        .seo-article-body pre {
          background: #f4f5f7;
          border-radius: 8px;
          padding: 1rem;
          overflow-x: auto;
          margin: 0 0 1rem;
        }
        .seo-article-body code {
          font-family: var(--font-roboto-mono), monospace;
          font-size: 0.85rem;
          background: rgba(0,0,0,0.04);
          padding: 2px 5px;
          border-radius: 4px;
        }
        .seo-article-body pre code {
          background: none;
          padding: 0;
        }
        .seo-article-body strong {
          color: #000;
        }
        .seo-article-body table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-open-sans), sans-serif;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        .seo-article-body th,
        .seo-article-body td {
          text-align: left;
          padding: 8px 12px;
          border-bottom: 1px solid #eee;
        }
        .learn-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-color: rgba(35,103,160,0.2) !important;
        }
      `}</style>
    </>
  );
}
