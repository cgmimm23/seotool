import { spawn } from 'child_process'

// Self-hosted Postfix on this box (DKIM-signed for cgmimm.com). Replaces Resend.
// Best-effort: never throws — callers are usually inside user-facing flows.
export function sendMail(opts: {
  to: string | string[]
  subject: string
  html: string
  from?: string
}): Promise<void> {
  return new Promise((resolve) => {
    const to = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to
    const msg = [
      `From: ${opts.from || 'SEO by CGMIMM <no-reply@cgmimm.com>'}`,
      `To: ${to}`,
      `Subject: ${opts.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      opts.html,
    ].join('\r\n')
    try {
      const sm = spawn('/usr/sbin/sendmail', ['-t', '-i', '-f', 'no-reply@cgmimm.com'])
      sm.on('error', (e) => {
        console.error('[sendMail]', e)
        resolve()
      })
      sm.on('close', () => resolve())
      sm.stdin.end(msg)
    } catch (e) {
      console.error('[sendMail]', e)
      resolve()
    }
  })
}
