import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-auth'

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   get:
 *     summary: Get Customer Details
 *     description: Retrieves detailed information about a customer by their cstDimId.
 *     tags:
 *       - Customers
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Customer Dimension ID (cstDimId)
 *     responses:
 *       200:
 *         description: Customer details found
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const apiKey = request.headers.get('X-API-Key')
        const keyData = await validateApiKey(apiKey)

        if (!keyData) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const cstDimId = params.id

        const customer = await prisma.customer.findUnique({
            where: { cstDimId: BigInt(cstDimId) },
            include: {
                transactions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        return NextResponse.json({
            ...customer,
            cstDimId: customer.cstDimId.toString(),
            transactions: customer.transactions.map(t => ({
                ...t,
                cstDimId: t.cstDimId.toString(),
                amount: t.amount
            }))
        })
    } catch (error) {
        console.error('Error fetching customer:', error)
        return NextResponse.json({ error: 'Invalid ID format or Server Error' }, { status: 500 })
    }
}
