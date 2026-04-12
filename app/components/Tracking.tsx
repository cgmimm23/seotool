'use client'

import { useEffect } from 'react'

export default function Tracking() {
  useEffect(() => {
    fetch('/api/tracking')
      .then(r => r.text())
      .then(html => {
        if (!html || html.length < 10) return
        const div = document.createElement('div')
        div.innerHTML = html
        const scripts = div.querySelectorAll('script')
        scripts.forEach(script => {
          const s = document.createElement('script')
          if (script.src) {
            s.src = script.src
            s.async = true
          } else {
            s.textContent = script.textContent
          }
          document.head.appendChild(s)
        })
      })
      .catch(() => {})
  }, [])

  return null
}
