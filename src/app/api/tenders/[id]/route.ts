import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const tender = await prisma.tender.findUnique({
            where: { id },
            include: {
                risks: true,
                suppliers: {
                    orderBy: { matchScore: 'desc' }
                }
            }
        })

        if (!tender) {
            return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
        }

        return NextResponse.json({ tender })
    } catch (error: any) {
        console.error('Error fetching tender:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch tender' },
            { status: 500 }
        )
    }
}
