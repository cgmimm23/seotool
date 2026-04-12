import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminSupabase()
  const { data } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', ['ga_measurement_id', 'gtm_id', 'fb_pixel_id', 'custom_head_script'])

  const settings: Record<string, string> = {}
  ;(data || []).forEach((row: any) => { if (row.value) settings[row.key] = row.value })

  let scripts = ''

  if (settings.ga_measurement_id) {
    scripts += `<script async src="https://www.googletagmanager.com/gtag/js?id=${settings.ga_measurement_id}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${settings.ga_measurement_id}');</script>`
  }

  if (settings.gtm_id) {
    scripts += `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${settings.gtm_id}');</script>`
  }

  if (settings.fb_pixel_id) {
    scripts += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${settings.fb_pixel_id}');fbq('track','PageView');</script>`
  }

  if (settings.custom_head_script) {
    scripts += settings.custom_head_script
  }

  return new NextResponse(scripts, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
