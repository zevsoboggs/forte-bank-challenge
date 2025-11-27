import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { tenderPlusClient } from '@/lib/tenderplus'

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const categories = await tenderPlusClient.getCategories()

        return NextResponse.json({ categories })
    } catch (error: any) {
        console.error('Error fetching categories:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch categories' },
            { status: 500 }
        )
    }
}
