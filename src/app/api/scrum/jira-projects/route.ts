import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { jiraClient } from '@/lib/jira'

// GET - Get all available Jira projects
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Test connection first
        const connected = await jiraClient.testConnection()
        if (!connected) {
            return NextResponse.json(
                { error: 'Jira connection failed' },
                { status: 500 }
            )
        }

        // Get all projects
        const projects = await jiraClient.getProjects()

        return NextResponse.json({
            success: true,
            projects
        })

    } catch (error: any) {
        console.error('Error fetching Jira projects:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch Jira projects' },
            { status: 500 }
        )
    }
}
