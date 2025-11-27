import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateWebhookSecret } from '@/lib/api-auth'

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: List Webhooks
 *     description: Returns a list of all registered webhooks (Admin only).
 *     tags:
 *       - Webhooks
 *     responses:
 *       200:
 *         description: List of webhooks
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Register Webhook
 *     description: Registers a new webhook endpoint.
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Webhook registered
 *   delete:
 *     summary: Delete Webhook
 *     description: Removes a webhook endpoint.
 *     tags:
 *       - Webhooks
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the webhook to delete
 *     responses:
 *       200:
 *         description: Webhook deleted
 */
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const endpoints = await prisma.webhookEndpoint.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(endpoints)
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url, events } = body

    const secret = generateWebhookSecret()

    const endpoint = await prisma.webhookEndpoint.create({
        data: {
            url,
            events: events || [],
            secret
        }
    })

    return NextResponse.json(endpoint)
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    await prisma.webhookEndpoint.delete({
        where: { id }
    })

    return NextResponse.json({ success: true })
}
