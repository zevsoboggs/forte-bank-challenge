import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-auth'

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     summary: Create or Update Customer
 *     description: Creates a new customer or updates an existing one based on cstDimId.
 *     tags:
 *       - Customers
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
 *             properties:
 *               cstDimId:
 *                 type: string
 *                 description: Unique Customer Dimension ID (Bank's ID)
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               riskLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *     responses:
 *       200:
 *         description: Customer saved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export async function POST(request: Request) {
    try {
        const apiKey = request.headers.get('X-API-Key')
        const keyData = await validateApiKey(apiKey)

        if (!keyData) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { cstDimId, firstName, lastName, phoneNumber, email, riskLevel } = body

        if (!cstDimId) {
            return NextResponse.json({ error: 'cstDimId is required' }, { status: 400 })
        }

        const customer = await prisma.customer.upsert({
            where: { cstDimId: BigInt(cstDimId) },
            update: {
                firstName,
                lastName,
                phoneNumber,
                email,
                riskLevel: riskLevel || undefined
            },
            create: {
                cstDimId: BigInt(cstDimId),
                firstName,
                lastName,
                phoneNumber,
                email,
                riskLevel: riskLevel || 'LOW'
            }
        })

        return NextResponse.json({
            success: true,
            cstDimId: customer.cstDimId.toString(),
            message: 'Customer saved successfully'
        })
    } catch (error) {
        console.error('Customer ingestion error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
