import { createAdminSupabase } from '@/lib/supabase-admin'
import crypto from 'crypto'

export async function dispatchWebhook(event: string, userId: string, payload: object) {
  try {
    const supabase = createAdminSupabase()

    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .contains('events', [event])

    if (!webhooks || webhooks.length === 0) return

    for (const webhook of webhooks) {
      const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload })
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex')

      try {
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10000),
        })

        await supabase.from('webhook_deliveries').insert({
          webhook_id: webhook.id,
          event,
          payload,
          response_status: res.status,
          response_body: (await res.text()).slice(0, 500),
          success: res.ok,
        })

        if (res.ok) {
          await supabase.from('webhooks').update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
          }).eq('id', webhook.id)
        } else {
          const newCount = (webhook.failure_count || 0) + 1
          await supabase.from('webhooks').update({
            failure_count: newCount,
            active: newCount < 10,
          }).eq('id', webhook.id)
        }
      } catch (err: any) {
        await supabase.from('webhook_deliveries').insert({
          webhook_id: webhook.id,
          event,
          payload,
          response_status: 0,
          response_body: err.message?.slice(0, 500) || 'Connection failed',
          success: false,
        })

        const newCount = (webhook.failure_count || 0) + 1
        await supabase.from('webhooks').update({
          failure_count: newCount,
          active: newCount < 10,
        }).eq('id', webhook.id)
      }
    }
  } catch (err) {
    console.error('Webhook dispatch error:', err)
  }
}
