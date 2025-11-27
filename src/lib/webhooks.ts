import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

interface WebhookPayload {
    event: string
    data: any
    timestamp: number
}

export async function dispatchWebhook(event: string, data: any) {
    try {
        // Find all active endpoints subscribed to this event
        const endpoints = await prisma.webhookEndpoint.findMany({
            where: {
                isActive: true,
                events: { has: event }
            }
        })

        if (endpoints.length === 0) return

        const timestamp = Date.now()
        const payload: WebhookPayload = {
            event,
            data,
            timestamp
        }
        const payloadString = JSON.stringify(payload)

        // Dispatch to all endpoints
        const promises = endpoints.map(async (endpoint) => {
            const signature = crypto
                .createHmac('sha256', endpoint.secret)
                .update(`${timestamp}.${payloadString}`)
                .digest('hex')

            try {
                const response = await fetch(endpoint.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Forte-Signature': `t=${timestamp},v1=${signature}`,
                        'Forte-Event': event
                    },
                    body: payloadString
                })

                // Log the attempt
                await prisma.webhookEvent.create({
                    data: {
                        endpointId: endpoint.id,
                        event,
                        payload: payload as any,
                        statusCode: response.status,
                        success: response.ok
                    }
                })
            } catch (error) {
                console.error(`Failed to send webhook to ${endpoint.url}:`, error)

                // Log failure
                await prisma.webhookEvent.create({
                    data: {
                        endpointId: endpoint.id,
                        event,
                        payload: payload as any,
                        statusCode: 0,
                        success: false
                    }
                })
            }
        })

        await Promise.all(promises)
    } catch (error) {
        console.error('Error dispatching webhooks:', error)
    }
}
