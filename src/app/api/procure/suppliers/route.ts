import { NextResponse } from 'next/server'
import { tenderPlus } from '@/lib/tenderplus'

/**
 * @swagger
 * /api/procure/suppliers:
 *   post:
 *     summary: Find relevant suppliers for a tender
 *     description: Matches suppliers based on tender requirements and historical data.
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
 *         description: List of suppliers
 */
export async function POST(req: Request) {
    try {
        const { lotId } = await req.json()

        if (!lotId) {
            return NextResponse.json({ error: 'Lot ID is required' }, { status: 400 })
        }

        const suppliers = await tenderPlus.findSuppliers(lotId)

        return NextResponse.json({ suppliers })
    } catch (error: any) {
        console.error('Supplier Matching Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
