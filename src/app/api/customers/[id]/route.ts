import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                transactions: {
                    take: 10,
                    orderBy: { transDate: 'desc' }
                }
            }
        })

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        // Convert BigInt to string
        const serializedCustomer = {
            ...customer,
            cstDimId: customer.cstDimId.toString(),
            transactions: customer.transactions.map(t => ({
                ...t,
                cstDimId: t.cstDimId.toString()
            }))
        }

        return NextResponse.json(serializedCustomer)
    } catch (error) {
        console.error('Error fetching customer:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
