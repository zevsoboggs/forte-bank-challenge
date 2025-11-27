import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Get all meetings for a project
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('projectId')

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
        }

        const meetings = await prisma.meeting.findMany({
            where: { projectId },
            include: {
                project: {
                    select: {
                        name: true
                    }
                },
                notes: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { scheduledAt: 'desc' }
        })

        return NextResponse.json({ meetings })
    } catch (error: any) {
        console.error('Error fetching meetings:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch meetings' },
            { status: 500 }
        )
    }
}

// POST - Create a new meeting
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectId, title, type, scheduledAt, meetingUrl, attendees } = await request.json()

        if (!projectId || !title || !scheduledAt) {
            return NextResponse.json(
                { error: 'Project ID, title, and scheduled time are required' },
                { status: 400 }
            )
        }

        const meeting = await prisma.meeting.create({
            data: {
                projectId,
                title,
                type: type || 'STANDUP',
                scheduledAt: new Date(scheduledAt),
                duration: 60, // Default 60 minutes
                meetingUrl,
                attendees: attendees || '',
                createdBy: session.user?.email || 'unknown'
            },
            include: {
                project: {
                    select: {
                        name: true
                    }
                }
            }
        })

        return NextResponse.json({ success: true, meeting })
    } catch (error: any) {
        console.error('Error creating meeting:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create meeting' },
            { status: 500 }
        )
    }
}
