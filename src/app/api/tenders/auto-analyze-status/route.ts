import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Global state для хранения статуса анализа
let analysisState = {
    running: false,
    progress: {
        current: 0,
        total: 0,
        message: '',
        currentTender: ''
    },
    stats: {
        analyzed: 0,
        interesting: 0,
        highRisk: 0,
        errors: 0
    },
    logs: [] as string[]
}

export function getAnalysisState() {
    return analysisState
}

export function updateAnalysisState(update: Partial<typeof analysisState>) {
    analysisState = { ...analysisState, ...update }
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        return NextResponse.json(analysisState)
    } catch (error: any) {
        console.error('Status error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to get status' },
            { status: 500 }
        )
    }
}
