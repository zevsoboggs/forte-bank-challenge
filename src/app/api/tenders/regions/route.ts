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

        const regions = await tenderPlusClient.getRegions()

        return NextResponse.json({ regions })
    } catch (error: any) {
        console.error('Error fetching regions:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch regions' },
            { status: 500 }
        )
    }
}
