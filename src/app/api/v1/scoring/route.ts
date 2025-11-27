import { NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'

/**
 * @swagger
 * /api/v1/scoring:
 *   post:
 *     summary: Score Transaction
 *     description: Real-time fraud scoring for a transaction. Returns risk score and recommendation.
 *     tags:
 *       - Scoring
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - cstDimId
 *             properties:
 *               cstDimId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: KZT
 *               merchantId:
 *                 type: string
 *               transDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Scoring result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 score:
 *                   type: number
 *                   description: Fraud probability (0-1)
 *                 riskLevel:
 *                   type: string
 *                   enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                 recommendation:
 *                   type: string
 *                   enum: [ALLOW, CHALLENGE, BLOCK]
 *                 requestId:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: Request) {
    const apiKey = request.headers.get('X-API-Key')
    const keyData = await validateApiKey(apiKey)

    if (!keyData) {
        return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { amount } = body

        // Mock Logic for Demo
        // In production, this would call the Python ML Service via HTTP/gRPC
        let score = 0.05
        let riskLevel = 'LOW'
        let recommendation = 'ALLOW'

        if (amount > 500000) {
            score = 0.45
            riskLevel = 'MEDIUM'
            recommendation = 'CHALLENGE'
        }
        if (amount > 1000000) {
            score = 0.85
            riskLevel = 'HIGH'
            recommendation = 'BLOCK'
        }

        return NextResponse.json({
            score,
            riskLevel,
            recommendation,
            requestId: crypto.randomUUID()
        })
    } catch (error) {
        console.error('Scoring error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
