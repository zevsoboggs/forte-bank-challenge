import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function validateApiKey(key: string | null) {
    if (!key) return null

    const apiKey = await prisma.apiKey.findUnique({
        where: { key }
    })

    if (apiKey) {
        // Update last used asynchronously
        prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsed: new Date() }
        }).catch(console.error)
    }

    return apiKey
}

export function generateApiKey() {
    return `sk_live_${crypto.randomBytes(24).toString('hex')}`
}

export function generateWebhookSecret() {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`
}
