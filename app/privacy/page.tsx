export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <a href="/" style={{ fontSize: '13px', color: '#68ccd1', textDecoration: 'none' }}>&larr; Back to Home</a>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '32px', color: '#2367a0', margin: '1.5rem 0 0.5rem' }}>Privacy Policy</h1>
      <p style={{ fontSize: '13px', color: '#939393', marginBottom: '2rem' }}>Last updated: April 11, 2026</p>

      <div style={{ fontSize: '15px', color: '#4a6080', lineHeight: 1.8 }}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>1. Introduction</h2>
        <p>AI SEO powered by CGMIMM ("we," "our," or "us") operates the website seo.cgmimm.com (the "Platform"). This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our Platform.</p>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>2. Information We Collect</h2>
        <p><strong>Account Information:</strong> When you create an account, we collect your name, email address, and authentication credentials.</p>
        <p><strong>Website Data:</strong> When you add a site to the Platform, we access and analyze publicly available data from that website, including page content, meta tags, images, headings, and technical SEO elements.</p>
        <p><strong>Payment Information:</strong> Payment processing is handled by Stripe. We do not store your credit card numbers. Stripe&apos;s privacy policy governs payment data handling.</p>
        <p><strong>Usage Data:</strong> We collect information about how you use the Platform, including pages visited, features used, audit reports generated, and interaction with our AI tools.</p>
        <p><strong>Google Account Data:</strong> If you connect your Google account, we access Google Search Console, Google Analytics, and Google Business Profile data as authorized by you. We use OAuth tokens to access this data and store access/refresh tokens securely on our servers.</p>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Provide, maintain, and improve the Platform</li>
          <li>Generate AI-powered SEO audits, reports, and recommendations</li>
          <li>Track keyword rankings and website performance</li>
          <li>Process payments and manage subscriptions</li>
          <li>Send transactional emails (password resets, account notifications)</li>
          <li>Send weekly SEO reports (you can opt out in Settings)</li>
          <li>Send product updates and announcements (you can unsubscribe)</li>
          <li>Provide customer support</li>
        </ul>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>4. AI and Data Processing</h2>
        <p>Our Platform uses artificial intelligence (Claude by Anthropic) to analyze your website data and generate SEO recommendations. Your website content is sent to AI services for analysis. We do not use your data to train AI models. AI-generated content is provided as recommendations only.</p>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>5. Data Sharing</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Stripe:</strong> For payment processing</li>
          <li><strong>Anthropic:</strong> For AI-powered analysis (website content only, not personal data)</li>
          <li><strong>Resend:</strong> For transactional and marketing emails</li>
          <li><strong>SerpAPI:</strong> For search engine ranking data</li>
          <li><strong>Moz:</strong> For backlink analysis</li>
          <li><strong>Google APIs:</strong> For Search Console, Analytics, and Business Profile data (only when you connect your account)</li>
          <li><strong>Supabase:</strong> For database hosting and authentication</li>
          <li><strong>DigitalOcean:</strong> For application hosting</li>
        </ul>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>6. Data Retention</h2>
        <p>We retain your data for as long as your account is active. When you delete your account, we delete your data within 30 days. Audit reports, keyword data, and ranking history are deleted when you remove a site from the Platform.</p>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>7. Data Security</h2>
        <p>We use industry-standard security measures including encryption in transit (TLS/SSL), encrypted database connections, secure authentication via Supabase, and API keys stored server-side (never exposed to browsers).</p>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>8. Your Rights</h2>
        <p>You have the right to:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your account and data</li>
          <li>Export your data</li>
          <li>Opt out of marketing emails</li>
          <li>Disconnect third-party integrations at any time</li>
        </ul>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>9. Cookies</h2>
        <p>We use essential cookies for authentication and session management. We do not use advertising or tracking cookies.</p>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>10. Children&apos;s Privacy</h2>
        <p>The Platform is not intended for children under 18. We do not knowingly collect data from children.</p>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>11. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or an in-app notification.</p>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginTop: '2rem' }}>12. Contact</h2>
        <p>For privacy-related questions, contact us at <a href="mailto:jonathan@cgmimm.com" style={{ color: '#68ccd1' }}>jonathan@cgmimm.com</a>.</p>
      </div>
    </div>
  )
}
