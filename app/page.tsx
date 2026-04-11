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
            AI SEO
          </span>
          <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#68ccd1', marginLeft: '8px' }}>powered by CGMIMM</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
        textAlign: 'center', padding: '3rem 1.25rem 2.5rem', maxWidth: '900px', margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: '50px', fontSize: '12px',
          fontWeight: 600, color: '#68ccd1', background: 'rgba(104,204,209,0.1)',
          marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif',
        }}>
          AI-POWERED SEO PLATFORM
        </div>
        <h1 className="hero-title" style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 800,
          color: '#2367a0', lineHeight: 1.1, marginBottom: '1.5rem',
        }}>
          AI That Finds, Fixes, and<br />
          <span style={{ color: '#68ccd1' }}>Ranks Your Site Higher.</span>
        </h1>
        <p className="hero-sub" style={{
          color: '#939393', lineHeight: 1.7, maxWidth: '650px',
          margin: '0 auto 2.5rem',
        }}>
          SEO by CGMIMM uses artificial intelligence to audit your site, diagnose issues,
          write your fix list, and track your climb to page one — automatically. Stop paying
          consultants for answers AI delivers in seconds.
        </p>
        <div className="hero-buttons">
          <Link href="/login" style={{
            padding: '0.75rem 2rem', background: '#e4b34f', color: '#fff',
            borderRadius: '50px', fontSize: '16px', fontWeight: 700, textDecoration: 'none',
            fontFamily: 'Montserrat, sans-serif', boxShadow: '0 4px 15px rgba(228,179,79,0.3)',
          }}>
            Start 14-Day Free Trial
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
        <div className="trust-bar" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {[
            { num: '100%', label: 'AI Driven' },
            { num: '22+', label: 'AI Tools' },
            { num: 'Real-Time', label: 'AI Analysis' },
            { num: '0', label: 'SEO Expertise Needed' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#2367a0', fontFamily: 'Montserrat, sans-serif' }}>{item.num}</div>
              <div style={{ fontSize: '13px', color: '#939393' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mobile-section" style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 className="section-title" style={{ fontFamily: 'Montserrat, sans-serif', color: '#2367a0', marginBottom: '1rem' }}>
            AI Does the Work. <span style={{ color: '#68ccd1' }}>You Get the Results.</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#939393', maxWidth: '600px', margin: '0 auto' }}>
            Every feature is powered by AI. It analyzes your site, writes your action plan, tracks your rankings,
            and tells you exactly what to do next — no SEO expertise required.
          </p>
        </div>

        {/* FEATURE CARDS */}
        <div className="grid-features">
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
      <section className="mobile-section" style={{ background: '#f8f9fb', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="section-title" style={{ fontFamily: 'Montserrat, sans-serif', color: '#2367a0', marginBottom: '1rem' }}>
            Your AI SEO Team in <span style={{ color: '#68ccd1' }}>3 Minutes</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#939393', marginBottom: '3rem' }}>
            No consultants. No learning curve. AI handles everything.
          </p>

          <div className="steps-grid">
            {[
              { step: '1', title: 'Add Your Site', desc: 'Enter your URL. AI immediately crawls your site and begins a deep analysis across dozens of ranking factors.' },
              { step: '2', title: 'AI Diagnoses Everything', desc: 'AI audits your technical SEO, content quality, page speed, keywords, and backlinks — then writes your fix list in plain English.' },
              { step: '3', title: 'AI Tracks Your Growth', desc: 'AI continuously monitors your rankings, alerts you to changes, runs scheduled audits, and tells you what to do next.' },
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
      <section className="mobile-section" style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        {detailedFeatures.map((section, i) => (
          <div key={i} className="detail-section" style={{
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
            <div className="detail-visual" style={{
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
      <section id="pricing" className="mobile-section" style={{ background: '#f8f9fb', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="section-title" style={{ fontFamily: 'Montserrat, sans-serif', color: '#2367a0', marginBottom: '1rem' }}>
              Simple, Transparent <span style={{ color: '#68ccd1' }}>Pricing</span>
            </h2>
            <p style={{ fontSize: '16px', color: '#939393' }}>
              Start free. Upgrade when you&apos;re ready to scale.
            </p>
          </div>

          <div className="pricing-grid">
            {plans.map((plan, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '16px', padding: '2rem',
                border: plan.popular ? '2px solid #68ccd1' : '1px solid rgba(0,0,0,0.06)',
                position: 'relative', boxShadow: plan.popular ? '0 8px 30px rgba(104,204,209,0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex', flexDirection: 'column',
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
                {(plan as any).contactLink ? (
                  <a href="mailto:jonathan@cgmimm.com?subject=Enterprise%20Pricing%20Inquiry" style={{
                    display: 'block', textAlign: 'center', padding: '0.6rem',
                    background: 'transparent', color: '#2367a0',
                    border: '1px solid rgba(35,103,160,0.2)',
                    borderRadius: '50px', fontSize: '14px', fontWeight: 700,
                    textDecoration: 'none', fontFamily: 'Montserrat, sans-serif',
                    marginBottom: '1.5rem',
                  }}>
                    {plan.cta}
                  </a>
                ) : (
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
                )}
                <ul style={{ listStyle: 'none', padding: 0, flex: 1 }}>
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

      {/* TESTIMONIALS */}
      <section className="mobile-section" style={{ padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="section-title" style={{ fontFamily: 'Montserrat, sans-serif', color: '#2367a0', marginBottom: '1rem' }}>
              Trusted by Businesses <span style={{ color: '#68ccd1' }}>Like Yours</span>
            </h2>
          </div>
          <div className="grid-features">
            {[
              { name: 'Sarah M.', role: 'Marketing Director', quote: 'We went from page 3 to page 1 for our main keywords in 6 weeks. The AI audit found issues we had no idea existed, and the fix instructions were so clear our intern could implement them.' },
              { name: 'David R.', role: 'Agency Owner', quote: 'Managing SEO for 12 clients used to take my team all week. Now AI handles the audits and tracking automatically. We just review and execute. Game changer for our agency.' },
              { name: 'Jessica L.', role: 'E-commerce Founder', quote: 'I tried 3 other SEO tools before this one. The difference is the AI actually tells you what to fix in plain English. No jargon, no guessing. Our organic traffic is up 140% in 3 months.' },
            ].map((t, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '2rem' }}>
                <div style={{ fontSize: '14px', color: '#4a6080', lineHeight: 1.7, marginBottom: '1.25rem', fontStyle: 'italic' }}>
                  &ldquo;{t.quote}&rdquo;
                </div>
                <div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', color: '#2367a0' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: '#939393' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO AUDIT */}
      <section className="mobile-section" style={{ background: '#f8f9fb', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="section-title" style={{ fontFamily: 'Montserrat, sans-serif', color: '#2367a0', marginBottom: '1rem' }}>
            Try It <span style={{ color: '#68ccd1' }}>Free</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#939393', marginBottom: '2rem' }}>
            Enter any URL and see what AI finds — no signup required.
          </p>
          <form action="/login" style={{ display: 'flex', gap: '8px', maxWidth: '500px', margin: '0 auto' }}>
            <input
              type="url"
              name="url"
              placeholder="https://yoursite.com"
              required
              style={{
                flex: 1, padding: '0.75rem 1rem', background: '#fff',
                border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50px',
                fontSize: '15px', outline: 'none',
              }}
            />
            <button type="submit" style={{
              padding: '0.75rem 1.5rem', background: '#e4b34f', border: 'none',
              borderRadius: '50px', color: '#fff', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap',
            }}>
              Audit My Site
            </button>
          </form>
          <p style={{ fontSize: '12px', color: '#939393', marginTop: '12px' }}>
            Start your 14-day free trial — no credit card required
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mobile-section" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 className="section-title" style={{ fontFamily: 'Montserrat, sans-serif', color: '#2367a0', marginBottom: '1rem' }}>
            Let AI Handle Your <span style={{ color: '#68ccd1' }}>SEO</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#939393', marginBottom: '2rem' }}>
            Stop spending hours on SEO you don&apos;t fully understand. Let AI audit your site,
            write your fix list, track your rankings, and tell you what to do next — automatically.
          </p>
          <Link href="/login" style={{
            display: 'inline-block', padding: '0.85rem 2.5rem', background: '#e4b34f',
            color: '#fff', borderRadius: '50px', fontSize: '16px', fontWeight: 700,
            textDecoration: 'none', fontFamily: 'Montserrat, sans-serif',
            boxShadow: '0 4px 15px rgba(228,179,79,0.3)',
          }}>
            Start 14-Day Free Trial
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#2367a0', padding: '3rem 2rem', color: 'rgba(255,255,255,0.7)',
      }}>
        <div className="footer-inner" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', marginBottom: '4px' }}>
              AI SEO <span style={{ color: '#68ccd1' }}>powered by CGMIMM</span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>AI-Powered SEO Platform</div>
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
  { icon: '🔍', title: 'AI Site Audit', desc: 'AI crawls your entire site, scores it across technical SEO, content, performance, and mobile — then writes your personalized fix list in plain English. No expertise needed.', color: '#2367a0' },
  { icon: '📈', title: 'AI Rank Tracker', desc: 'AI monitors your Google rankings in real time, detects position changes, and explains why you moved up or down so you always know your next move.', color: '#68ccd1' },
  { icon: '🕷️', title: 'AI Site Crawler', desc: 'AI crawls every page on your site, finds broken links, missing tags, thin content, and redirect chains — then summarizes the critical issues to fix first.', color: '#e4b34f' },
  { icon: '🎯', title: 'AI Page Optimizer', desc: 'AI reads your actual page HTML, analyzes it against your target keywords, and delivers a scored report with specific fixes ranked by impact.', color: '#2367a0' },
  { icon: '⚡', title: 'AI Speed Analysis', desc: 'AI measures your Core Web Vitals — LCP, FID, CLS — for mobile and desktop, then tells you exactly what\'s slowing you down and how to fix it.', color: '#68ccd1' },
  { icon: '📊', title: 'AI Analytics', desc: 'AI pulls your GA4 data and interprets it for you — traffic trends, source breakdowns, bounce rates — surfacing insights you\'d miss reading raw numbers.', color: '#e4b34f' },
  { icon: '🔗', title: 'AI Backlink Analysis', desc: 'AI evaluates your backlink profile — domain authority, spam scores, link types — and identifies which links are helping your rankings and which are hurting them.', color: '#2367a0' },
  { icon: '🔎', title: 'AI Search Console', desc: 'AI connects to Google Search Console, syncs your real ranking data, and highlights the keywords where you\'re closest to page one — your biggest quick wins.', color: '#68ccd1' },
  { icon: '🤖', title: 'AI Visibility Check', desc: 'AI checks if ChatGPT, Perplexity, and other AI search engines can find your site. Stay visible in the new era of AI-powered search.', color: '#e4b34f' },
  { icon: '📍', title: 'AI Local SEO', desc: 'AI audits your local presence — Google Business Profile, citations, local keywords — and tells you exactly how to outrank nearby competitors.', color: '#2367a0' },
  { icon: '⭐', title: 'AI Review Manager', desc: 'AI surfaces your Google reviews across locations, helps you respond professionally, and monitors your reputation so nothing slips through.', color: '#68ccd1' },
  { icon: '🏗️', title: 'AI Schema Generator', desc: 'AI generates structured data markup for your pages — Organization, FAQ, Product, Review — perfectly formatted and ready to paste into your site.', color: '#e4b34f' },
  { icon: '📢', title: 'AI Ads Intelligence', desc: 'AI pulls your Google Ads data alongside organic performance, giving you a unified view of paid and organic so you can optimize total search spend.', color: '#2367a0' },
  { icon: '🅱️', title: 'AI Bing Optimization', desc: 'AI manages your Bing presence — crawl stats, keyword data, URL submissions — so you capture traffic from the second-largest search engine automatically.', color: '#68ccd1' },
  { icon: '🖼️', title: 'AI Image Optimizer', desc: 'AI compresses, resizes, and converts your images to WebP in one click. Faster images mean faster pages, better rankings, and happier visitors.', color: '#e4b34f' },
  { icon: '📡', title: 'AI Citation Builder', desc: 'AI pushes your business data to hundreds of directories at once, ensuring consistent NAP citations that boost your local search authority.', color: '#2367a0' },
  { icon: '📋', title: 'AI GBP Creator', desc: 'AI walks you through creating your Google Business Profile step by step and auto-generates optimized business descriptions that attract customers.', color: '#68ccd1' },
  { icon: '📉', title: 'AI Trend Analysis', desc: 'AI tracks your keyword positions over time across Google, Bing, and Search Console — spotting trends and measuring the real impact of every change you make.', color: '#e4b34f' },
]

const detailedFeatures = [
  {
    tag: 'AI Intelligence',
    title: 'AI Audits Your Site and Writes Your Fix List',
    desc: 'Other tools dump raw data on you and expect you to figure it out. Our AI reads your site like a senior SEO consultant — then writes a prioritized action plan in plain English that anyone on your team can execute.',
    bullets: [
      'AI checks Technical, Content, On-Page, Performance, and Mobile factors',
      'Issues ranked by severity — fix what moves the needle first',
      'AI explains every issue and writes the exact fix in plain English',
      'Scheduled AI scans run automatically so you catch regressions instantly',
    ],
    visual: '🔍',
  },
  {
    tag: 'AI Monitoring',
    title: 'AI Watches Your Rankings 24/7',
    desc: 'AI tracks your Google position for every keyword in real time, detects when you move up or down, and cross-references Search Console data to show you verified rankings — not estimates.',
    bullets: [
      'AI-powered live SERP lookups for any keyword',
      'AI detects ranking changes and surfaces trends you\'d miss',
      'Google Search Console integration for verified click and impression data',
      'AI identifies your closest-to-page-one keywords — your biggest quick wins',
    ],
    visual: '📈',
  },
  {
    tag: 'AI Optimization',
    title: 'AI Reads Your Page and Tells You Exactly What to Change',
    desc: 'AI fetches your actual page HTML, reads every title tag, heading, image, and paragraph — then scores it against your target keywords and delivers specific fixes ranked by impact. It\'s like having an SEO expert review every page.',
    bullets: [
      'AI analyzes title tags, meta descriptions, H1-H3, images, content depth',
      'AI scores keyword placement, density, and semantic relevance',
      'Prioritized fix list — AI puts the highest-impact changes first',
      'AI imports keywords from Search Console and Bing automatically',
    ],
    visual: '🎯',
  },
  {
    tag: 'AI Local',
    title: 'AI Dominates Your Local Market For You',
    desc: 'AI manages your entire local SEO presence — auditing your Google Business Profile, monitoring reviews, pushing citations to directories, and tracking local keyword rankings — so nearby customers always find you first.',
    bullets: [
      'AI checks and creates your Google Business Profile with optimized descriptions',
      'AI monitors reviews and helps you respond professionally',
      'AI pushes your business data to hundreds of directories at once',
      'AI tracks your local keyword rankings against nearby competitors',
    ],
    visual: '📍',
  },
]

const plans = [
  {
    name: 'Starter',
    price: '$59.95',
    period: '/mo',
    desc: 'Everything you need to rank one site higher. AI handles the audits, tracking, and optimization for you.',
    cta: 'Get Started',
    popular: false,
    features: [
      '1 site',
      'AI site audits',
      'AI page optimizer',
      'AI rank tracker',
      'AI site crawler',
      'Core Web Vitals',
      'Backlink analysis',
      'Google Search Console',
      'Google Analytics',
      'Schema builder',
      'Image optimizer',
      'Daily auto-scans',
    ],
  },
  {
    name: 'Pro',
    price: '$149',
    period: '/mo',
    desc: 'For businesses and marketers managing multiple sites. Our most popular plan — full AI power across 5 sites.',
    cta: 'Get Pro',
    popular: true,
    features: [
      '5 sites',
      'Everything in Starter',
      'AI visibility checker',
      'Google Ads integration',
      'Bing Webmaster & Ads',
      'Local SEO suite',
      'Review management',
      'GBP Creator',
      'Citation aggregators',
      'Hourly auto-scans',
      'AI trend analysis',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For agencies and large teams managing many sites. Custom pricing, dedicated support, and unlimited scale.',
    cta: 'Contact Us',
    popular: false,
    contactLink: true,
    features: [
      'Unlimited sites',
      'Everything in Pro',
      'Dedicated account manager',
      'Custom AI scan frequency',
      'White-label reports',
      'API access',
      'Team collaboration',
      'Custom integrations',
    ],
  },
]
