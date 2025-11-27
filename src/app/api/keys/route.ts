import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateApiKey } from '@/lib/api-auth'

/**
 * @swagger
 * /api/keys:
 *   get:
 *     summary: List API Keys
 *     description: Returns a list of all API keys (Admin only).
 *     tags:
 *       - API Keys
 *     responses:
 *       200:
 *         description: List of API keys
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create API Key
 *     description: Generates a new API key.
 *     tags:
 *       - API Keys
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
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: API Key created
 *   delete:
 *     summary: Delete API Key
 *     description: Revokes an API key.
 *     tags:
 *       - API Keys
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the key to delete
 *     responses:
 *       200:
 *         description: API Key deleted
 */
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(keys)
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, scopes } = body

    const key = generateApiKey()

    const apiKey = await prisma.apiKey.create({
        data: {
            name,
            key,
            scopes: scopes || []
        }
    })

    return NextResponse.json(apiKey)
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

    await prisma.apiKey.delete({
        where: { id }
    })

    return NextResponse.json({ success: true })
}
