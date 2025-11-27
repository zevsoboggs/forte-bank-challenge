import { NextResponse } from 'next/server'
import { tenderPlus } from '@/lib/tenderplus'

/**
 * @swagger
 * /api/procure/tenders:
 *   get:
 *     summary: Get list of tenders
 *     description: Fetches tenders from TenderPlus API (via server proxy to avoid CORS)
 *     tags:
 *       - AI-Procure
 *     responses:
 *       200:
 *         description: List of tenders
 */
export async function GET() {
    try {
        // This runs on the server, so no CORS issues with external API
        const tenders = await tenderPlus.getLots(20)
        return NextResponse.json({ tenders })
    } catch (error: any) {
        console.error('Proxy Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
