import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-auth'
import { dispatchWebhook } from '@/lib/webhooks'

/**
 * @swagger
 * /api/v1/transactions:
 *   post:
 *     summary: Create a new transaction
 *     description: Ingests a transaction for fraud analysis and processing.
 *     tags:
 *       - Transactions
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cstDimId
 *               - amount
 *               - direction
 *               - docNo
 *               - transDate
 *             properties:
 *               cstDimId:
 *                 type: string
 *                 description: Customer Dimension ID
 *               amount:
 *                 type: number
 *                 description: Transaction amount
 *               direction:
 *                 type: string
 *                 description: Transaction direction (e.g., 'in', 'out')
 *               docNo:
 *                 type: string
 *                 description: Document number
 *               transDate:
 *                 type: string
 *                 format: date-time
 *                 description: Transaction date
 *     responses:
 *       200:
 *         description: Transaction processed successfully
 *       401:
 *         description: Unauthorized (Invalid API Key)
 *       500:
 *         description: Internal Server Error
 */
export async function POST(request: Request) {
    const apiKey = request.headers.get('X-API-Key')
    const keyData = await validateApiKey(apiKey)

    if (!keyData) {
        return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { cstDimId, amount, direction, docNo, transDate } = body

        // Validate cstDimId
        if (!cstDimId || !/^\d+$/.test(String(cstDimId))) {
            return NextResponse.json({ error: 'Invalid cstDimId. Must be a numeric string.' }, { status: 400 })
        }

        // 1. Save Transaction
        const transaction = await prisma.transaction.create({
            data: {
                cstDimId: BigInt(cstDimId),
                amount,
                direction,
                docNo,
                transDate: new Date(transDate),
                transDateTime: new Date(),
                isFraud: false // Initial state
            }
        })

        // 2. Trigger Webhook
        await dispatchWebhook('transaction.created', {
            id: transaction.id,
            amount: transaction.amount,
            cstDimId: transaction.cstDimId.toString()
        })

        // 3. Async Scoring (Mock call to ML service for now, or real if integrated)
        // For now, we'll just dispatch a mock fraud event if amount > 1000000
        if (amount > 1000000) {
            await dispatchWebhook('fraud.detected', {
                transactionId: transaction.id,
                riskLevel: 'HIGH',
                score: 0.85
            })
        }

        return NextResponse.json({
            success: true,
            id: transaction.id,
            message: 'Transaction processed'
        })
    } catch (error) {
        console.error('Transaction ingestion error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
