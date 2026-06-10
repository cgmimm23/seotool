import { prisma } from '@/lib/db'
import crypto from 'crypto'

export async function dispatchWebhook(event: string, userId: string, payload: object) {
  try {
    // TENANT SCOPING: only this user's active webhooks subscribed to `event`.
    const webhooks = await prisma.webhooks.findMany({
      where: {
        user_id: userId,
        active: true,
        events: { has: event },
      },
    })

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

        await prisma.webhook_deliveries.create({
          data: {
            webhook_id: webhook.id,
            event,
            payload: payload as object,
            response_status: res.status,
            response_body: (await res.text()).slice(0, 500),
            success: res.ok,
          },
        })

        if (res.ok) {
          await prisma.webhooks.update({
            where: { id: webhook.id },
            data: {
              last_triggered_at: new Date(),
              failure_count: 0,
            },
          })
        } else {
          const newCount = (webhook.failure_count || 0) + 1
          await prisma.webhooks.update({
            where: { id: webhook.id },
            data: {
              failure_count: newCount,
              active: newCount < 10,
            },
          })
        }
      } catch (err: any) {
        await prisma.webhook_deliveries.create({
          data: {
            webhook_id: webhook.id,
            event,
            payload: payload as object,
            response_status: 0,
            response_body: err.message?.slice(0, 500) || 'Connection failed',
            success: false,
          },
        })

        const newCount = (webhook.failure_count || 0) + 1
        await prisma.webhooks.update({
          where: { id: webhook.id },
          data: {
            failure_count: newCount,
            active: newCount < 10,
          },
        })
      }
    }
  } catch (err) {
    console.error('Webhook dispatch error:', err)
  }
}
