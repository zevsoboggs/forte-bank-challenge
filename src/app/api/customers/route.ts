import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const skip = (page - 1) * limit

        const where = search ? {
            OR: [
                { id: { contains: search, mode: 'insensitive' } },
                { cstDimId: { equals: BigInt(search) } } // Assuming search might be ID
            ]
        } : {}

        // Handle BigInt search safely
        let safeWhere: any = {}
        if (search) {
            // Check if search is a valid number for cstDimId
            const isNum = /^\d+$/.test(search)
            if (isNum) {
                safeWhere = {
                    OR: [
                        { id: { contains: search, mode: 'insensitive' } },
                        { cstDimId: BigInt(search) }
                    ]
                }
            } else {
                safeWhere = {
                    id: { contains: search, mode: 'insensitive' }
                }
            }
        }

        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where: safeWhere,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { transactions: true }
                    }
                }
            }),
            prisma.customer.count({ where: safeWhere })
        ])

        // Convert BigInt to string for JSON serialization
        const serializedCustomers = customers.map(c => ({
            ...c,
            cstDimId: c.cstDimId.toString(),
            transactionCount: c._count.transactions
        }))

        return NextResponse.json({
            customers: serializedCustomers,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                page,
                limit
            }
        })
    } catch (error) {
        console.error('Error fetching customers:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
