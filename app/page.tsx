import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ background: '#fff', color: '#000' }}>
      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', maxWidth: '1200px', margin: '0 auto',
      }}>
        <div>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '18px', color: '#2367a0' }}>
            Marketing Machine
          </span>
          <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#68ccd1', marginLeft: '8px' }}>SEO</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="#features" style={{ fontSize: '14px', color: '#939393', textDecoration: 'none' }}>Features</a>
          <a href="#pricing" style={{ fontSize: '14px', color: '#939393', textDecoration: 'none' }}>Pricing</a>
          <Link href="/login" style={{
            padding: '0.5rem 1.25rem', background: '#e4b34f', color: '#fff',
            borderRadius: '50px', fontSize: '14px', fontWeight: 700, textDecoration: 'none',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        textAlign: 'center', padding: '5rem 2rem 4rem', maxWidth: '900px', margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: '50px', fontSize: '12px',
          fontWeight: 600, color: '#68ccd1', background: 'rgba(104,204,209,0.1)',
          marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif',
        }}>
          ALL-IN-ONE SEO PLATFORM
        </div>
        <h1 style={{
          fontFamily: 'Montserrat, sans-serif', fontSize: '48px', fontWeight: 800,
          color: '#2367a0', lineHeight: 1.1, marginBottom: '1.5rem',
        }}>
          Dominate Search Rankings.<br />
          <span style={{ color: '#68ccd1' }}>Grow Your Business.</span>
        </h1>
        <p style={{
          fontSize: '18px', color: '#939393', lineHeight: 1.7, maxWidth: '650px',
          margin: '0 auto 2.5rem',
        }}>
          Stop guessing and start growing. Marketing Machine SEO gives you AI-powered audits,
          real-time rank tracking, competitor insights, and actionable fixes — everything you need
          to climb to page one.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/login" style={{
            padding: '0.75rem 2rem', background: '#e4b34f', color: '#fff',
            borderRadius: '50px', fontSize: '16px', fontWeight: 700, textDecoration: 'none',
            fontFamily: 'Montserrat, sans-serif', boxShadow: '0 4px 15px rgba(228,179,79,0.3)',
          }}>
            Start Free Today
          </Link>
          <a href="#features" style={{
            padding: '0.75rem 2rem', background: 'transparent', color: '#2367a0',
            borderRadius: '50px', fontSize: '16px', fontWeight: 600, textDecoration: 'none',
            border: '1px solid rgba(35,103,160,0.2)',
          }}>
            See Features
          </a>
        </div>
      </section>

      {/* TRUST BAR */}
      <section style={{
        background: '#f8f9fb', padding: '2rem', textAlign: 'center',
        borderTop: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', maxWidth: '800px', margin: '0 auto' }}>
          {[
            { num: '22+', label: 'SEO Tools' },
            { num: 'AI', label: 'Powered Audits' },
            { num: 'Live', label: 'SERP Tracking' },
            { num: '0', label: 'Setup Required' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#2367a0', fontFamily: 'Montserrat, sans-serif' }}>{item.num}</div>
              <div style={{ fontSize: '13px', color: '#939393' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '36px', color: '#2367a0', marginBottom: '1rem' }}>
            Everything You Need to <span style={{ color: '#68ccd1' }}>Rank Higher</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#939393', maxWidth: '600px', margin: '0 auto' }}>
            From technical audits to local SEO, from keyword research to AI visibility — one platform, zero guesswork.
          </p>
        </div>

        {/* FEATURE CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px',
              padding: '2rem', transition: 'box-shadow 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: f.color + '15', display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginBottom: '1rem', fontSize: '20px',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: '#2367a0', marginBottom: '0.5rem' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#939393', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: '#f8f9fb', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '36px', color: '#2367a0', marginBottom: '1rem' }}>
            Up and Running in <span style={{ color: '#68ccd1' }}>3 Minutes</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#939393', marginBottom: '3rem' }}>
            No complex setup. No code. Just results.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            {[
              { step: '1', title: 'Add Your Site', desc: 'Enter your URL and we instantly start analyzing your SEO health across dozens of factors.' },
              { step: '2', title: 'Get AI Insights', desc: 'Our AI engine audits your site, identifies issues, and gives you prioritized fixes with clear instructions.' },
              { step: '3', title: 'Track & Grow', desc: 'Monitor your rankings, watch your score improve, and stay ahead of competitors with automated tracking.' },
            ].map(s => (
              <div key={s.step}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', background: '#68ccd1',
                  color: '#fff', fontSize: '20px', fontWeight: 800, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
                  fontFamily: 'Montserrat, sans-serif',
                }}>
                  {s.step}
                </div>
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', color: '#2367a0', marginBottom: '0.5rem' }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#939393', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DETAILED FEATURE SECTIONS */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        {detailedFeatures.map((section, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center',
            marginBottom: '5rem', direction: i % 2 === 1 ? 'rtl' : 'ltr',
          }}>
            <div style={{ direction: 'ltr' }}>
              <div style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: '50px', fontSize: '11px',
                fontWeight: 600, color: '#68ccd1', background: 'rgba(104,204,209,0.1)',
                marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {section.tag}
              </div>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '28px', color: '#2367a0', marginBottom: '1rem', lineHeight: 1.2 }}>
                {section.title}
              </h3>
              <p style={{ fontSize: '15px', color: '#939393', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                {section.desc}
              </p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {section.bullets.map((b, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px', fontSize: '14px', color: '#000' }}>
                    <span style={{ color: '#68ccd1', fontWeight: 700, fontSize: '16px', lineHeight: '1.4' }}>&#10003;</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{
              direction: 'ltr', background: '#f8f9fb', borderRadius: '20px', padding: '3rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(0,0,0,0.05)', minHeight: '300px',
            }}>
              <div style={{ fontSize: '64px', opacity: 0.8 }}>{section.visual}</div>
            </div>
          </div>
        ))}
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: '#f8f9fb', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '36px', color: '#2367a0', marginBottom: '1rem' }}>
              Simple, Transparent <span style={{ color: '#68ccd1' }}>Pricing</span>
            </h2>
            <p style={{ fontSize: '16px', color: '#939393' }}>
              Start free. Upgrade when you&apos;re ready to scale.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            {plans.map((plan, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '16px', padding: '2rem',
                border: plan.popular ? '2px solid #68ccd1' : '1px solid rgba(0,0,0,0.06)',
                position: 'relative', boxShadow: plan.popular ? '0 8px 30px rgba(104,204,209,0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: '#68ccd1', color: '#fff', fontSize: '11px', fontWeight: 700,
                    padding: '3px 16px', borderRadius: '50px', fontFamily: 'Montserrat, sans-serif',
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', color: '#2367a0', marginBottom: '0.5rem' }}>
                  {plan.name}
                </h3>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '36px', fontWeight: 800, color: '#000', fontFamily: 'Montserrat, sans-serif' }}>
                    {plan.price}
                  </span>
                  {plan.period && <span style={{ fontSize: '14px', color: '#939393' }}>{plan.period}</span>}
                </div>
                <p style={{ fontSize: '13px', color: '#939393', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  {plan.desc}
                </p>
                <Link href="/login" style={{
                  display: 'block', textAlign: 'center', padding: '0.6rem',
                  background: plan.popular ? '#e4b34f' : 'transparent',
                  color: plan.popular ? '#fff' : '#2367a0',
                  border: plan.popular ? 'none' : '1px solid rgba(35,103,160,0.2)',
                  borderRadius: '50px', fontSize: '14px', fontWeight: 700,
                  textDecoration: 'none', fontFamily: 'Montserrat, sans-serif',
                  marginBottom: '1.5rem',
                }}>
                  {plan.cta}
                </Link>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#000', marginBottom: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#68ccd1', fontWeight: 700 }}>&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '36px', color: '#2367a0', marginBottom: '1rem' }}>
            Ready to Outrank Your <span style={{ color: '#68ccd1' }}>Competition</span>?
          </h2>
          <p style={{ fontSize: '16px', color: '#939393', marginBottom: '2rem' }}>
            Join businesses that use Marketing Machine SEO to find and fix SEO issues,
            track their rankings, and grow organic traffic — all from one dashboard.
          </p>
          <Link href="/login" style={{
            display: 'inline-block', padding: '0.85rem 2.5rem', background: '#e4b34f',
            color: '#fff', borderRadius: '50px', fontSize: '16px', fontWeight: 700,
            textDecoration: 'none', fontFamily: 'Montserrat, sans-serif',
            boxShadow: '0 4px 15px rgba(228,179,79,0.3)',
          }}>
            Start Free — No Credit Card
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#2367a0', padding: '3rem 2rem', color: 'rgba(255,255,255,0.7)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', marginBottom: '4px' }}>
              Marketing Machine <span style={{ color: '#68ccd1' }}>SEO</span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>by CGMIMM</div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '13px' }}>
            <a href="#features" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Features</a>
            <a href="#pricing" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Pricing</a>
            <Link href="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Sign In</Link>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            &copy; {new Date().getFullYear()} CGMIMM. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─── DATA ─── */

const features = [
  { icon: '🔍', title: 'AI Site Audit', desc: 'Get a comprehensive SEO health check powered by AI. Scores across technical, content, on-page, performance, and mobile — with clear fixes for every issue.', color: '#2367a0' },
  { icon: '📈', title: 'SERP Tracker', desc: 'See exactly where you rank on Google in real time. Track any keyword and watch your position change over time.', color: '#68ccd1' },
  { icon: '🕷️', title: 'Site Crawler', desc: 'Crawl every page on your site to find broken links, missing meta tags, thin content, image issues, and redirect chains before Google does.', color: '#e4b34f' },
  { icon: '🎯', title: 'Page Optimizer', desc: 'Get AI-powered optimization scores for each page against your target keywords. Receive prioritized fixes with exact instructions.', color: '#2367a0' },
  { icon: '⚡', title: 'Core Web Vitals', desc: 'Measure page speed, LCP, FID, and CLS for both mobile and desktop. Know exactly what\'s slowing you down and how to fix it.', color: '#68ccd1' },
  { icon: '📊', title: 'Google Analytics', desc: 'Pull GA4 data directly into your dashboard. See traffic by source, sessions, users, and bounce rate without leaving the platform.', color: '#e4b34f' },
  { icon: '🔗', title: 'Backlink Analysis', desc: 'View your backlink profile with domain authority, page authority, link type, and spam scores. Know which links help and which hurt.', color: '#2367a0' },
  { icon: '🔎', title: 'Search Console', desc: 'Connect Google Search Console to see your real keyword rankings, impressions, clicks, and CTR — synced to your rank history.', color: '#68ccd1' },
  { icon: '🤖', title: 'AI Visibility', desc: 'Check if AI search engines can find and reference your site. Detect llms.txt, robots.txt, and AI bot access status.', color: '#e4b34f' },
  { icon: '📍', title: 'Local SEO', desc: 'Check your Google Business Profile presence, track local keyword rankings, and monitor your citations across directories.', color: '#2367a0' },
  { icon: '⭐', title: 'Review Management', desc: 'View and respond to Google reviews from your dashboard. Manage multiple locations and keep your reputation strong.', color: '#68ccd1' },
  { icon: '🏗️', title: 'Schema Builder', desc: 'Generate structured data markup for your pages. Organization, FAQ, Product, Review — copy and paste directly into your site.', color: '#e4b34f' },
  { icon: '📢', title: 'Google Ads', desc: 'Track your Google Ads campaign performance, keywords, search terms, and ROAS alongside your organic data.', color: '#2367a0' },
  { icon: '🅱️', title: 'Bing Webmaster', desc: 'Crawl stats, keyword data, and URL submission for Bing. Don\'t ignore the second-largest search engine.', color: '#68ccd1' },
  { icon: '🖼️', title: 'Image Optimizer', desc: 'Compress, resize, and convert images to WebP. Faster images mean faster pages and better rankings.', color: '#e4b34f' },
  { icon: '📡', title: 'Citation Aggregators', desc: 'Push your business NAP data to hundreds of directories at once. Consistent citations boost local rankings.', color: '#2367a0' },
  { icon: '📋', title: 'GBP Creator', desc: 'Create or claim your Google Business Profile with a guided step-by-step wizard. AI-generated descriptions included.', color: '#68ccd1' },
  { icon: '📉', title: 'Rank History', desc: 'Track keyword positions over time across Google, Bing, and Search Console. Spot trends and measure the impact of your changes.', color: '#e4b34f' },
]

const detailedFeatures = [
  {
    tag: 'AI-Powered',
    title: 'Site Audits That Actually Tell You What to Fix',
    desc: 'Most audit tools give you a score and a wall of jargon. Ours gives you a score, a grade, and a prioritized list of exactly what to fix — written in plain English by AI that understands SEO.',
    bullets: [
      'Checks across Technical, Content, On-Page, Performance, and Mobile',
      'Severity-ranked issues so you fix what matters first',
      'AI-written explanations — no SEO expertise needed',
      'Automated scheduled scans so you never miss a regression',
    ],
    visual: '🔍',
  },
  {
    tag: 'Rankings',
    title: 'Know Exactly Where You Stand on Google',
    desc: 'Real-time SERP tracking powered by SerpAPI. See your actual position for every keyword you care about, track changes over time, and know immediately when you gain or lose ground.',
    bullets: [
      'Live Google SERP lookups for any keyword',
      'Position history charts to visualize trends',
      'Google Search Console integration for verified data',
      'Track competitors in the same results',
    ],
    visual: '📈',
  },
  {
    tag: 'Optimization',
    title: 'AI Tells You Exactly How to Optimize Each Page',
    desc: 'Enter your target keywords and our AI fetches your actual page HTML, analyzes every element, and returns a scored report with specific, actionable fixes ranked by priority.',
    bullets: [
      'Analyzes title tags, meta descriptions, H1-H3, images, and content',
      'Keyword density and placement scoring',
      'Prioritized fix list — highest impact first',
      'Import keywords directly from Search Console or Bing',
    ],
    visual: '🎯',
  },
  {
    tag: 'Local SEO',
    title: 'Dominate Your Local Market',
    desc: 'From Google Business Profile management to citation tracking to review monitoring — everything you need to show up when nearby customers search for what you offer.',
    bullets: [
      'Google Business Profile checker and creator wizard',
      'Review management — read and respond from your dashboard',
      'Citation aggregator pushes your NAP to hundreds of directories',
      'Local keyword rank tracking',
    ],
    visual: '📍',
  },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    desc: 'Get started with essential SEO tools. Perfect for personal sites and small projects.',
    cta: 'Start Free',
    popular: false,
    features: [
      '1 site',
      'AI site audits',
      'Page optimizer',
      'Schema builder',
      'Image optimizer',
      'Weekly auto-scans',
    ],
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    desc: 'For growing businesses ready to take SEO seriously and start climbing rankings.',
    cta: 'Get Starter',
    popular: false,
    features: [
      '5 sites',
      'Everything in Free',
      'SERP tracking',
      'Backlink analysis',
      'Google Search Console',
      'Google Analytics',
      'Core Web Vitals',
      'Daily auto-scans',
    ],
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/mo',
    desc: 'For businesses and marketers who want the full competitive edge. Our most popular plan.',
    cta: 'Get Pro',
    popular: true,
    features: [
      '15 sites',
      'Everything in Starter',
      'AI visibility checker',
      'Google Ads integration',
      'Bing Webmaster & Ads',
      'Local SEO suite',
      'Review management',
      'GBP Creator',
      'Site crawler',
      'Hourly auto-scans',
    ],
  },
  {
    name: 'Agency',
    price: '$199',
    period: '/mo',
    desc: 'For agencies managing multiple clients. Unlimited power, unlimited growth.',
    cta: 'Get Agency',
    popular: false,
    features: [
      'Unlimited sites',
      'Everything in Pro',
      'Citation aggregators',
      'White-label reports',
      'Priority support',
      'API access',
      'Custom scan frequency',
      'Team collaboration',
    ],
  },
]
