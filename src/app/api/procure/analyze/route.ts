import { NextResponse } from 'next/server'
import { tenderPlus } from '@/lib/tenderplus'

/**
 * @swagger
 * /api/procure/analyze:
 *   post:
 *     summary: Analyze a tender for risks
 *     description: Uses AI to analyze tender documentation and metadata for potential risks.
 *     tags:
 *       - AI-Procure
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lotId
 *             properties:
 *               lotId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Analysis result
 */
export async function POST(req: Request) {
    try {
        const { lotId, tender } = await req.json()

        if (!lotId) {
            return NextResponse.json({ error: 'Lot ID is required' }, { status: 400 })
        }

        const analysis = await tenderPlus.analyzeTender(lotId, tender)

        return NextResponse.json(analysis)
    } catch (error: any) {
        console.error('Tender Analysis Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
