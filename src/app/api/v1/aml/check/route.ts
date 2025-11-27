import { NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'

/**
 * @swagger
 * /api/v1/aml/check:
 *   post:
 *     summary: AML Check
 *     description: Checks a person or entity against AML/Sanctions watchlists.
 *     tags:
 *       - AML
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name or Entity name
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: Date of Birth (YYYY-MM-DD)
 *               country:
 *                 type: string
 *                 description: Country code (ISO 2)
 *     responses:
 *       200:
 *         description: Check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 match:
 *                   type: boolean
 *                 riskScore:
 *                   type: number
 *                 details:
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
        const { name } = body

        // Mock Logic for Demo
        const isSuspicious = name?.toLowerCase().includes('test') || name?.toLowerCase().includes('fraud')

        return NextResponse.json({
            match: isSuspicious,
            riskScore: isSuspicious ? 0.95 : 0.01,
            details: isSuspicious ? 'Match found in OFAC List' : 'No matches found',
            checkedAt: new Date().toISOString()
        })
    } catch (error) {
        console.error('AML check error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
