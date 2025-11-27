import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Get meeting details with notes
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

        const meeting = await prisma.meeting.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                notes: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
        }

        return NextResponse.json({ meeting })
    } catch (error: any) {
        console.error('Error fetching meeting:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch meeting' },
            { status: 500 }
        )
    }
}

// PATCH - Update meeting
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const updates = await request.json()

        const meeting = await prisma.meeting.update({
            where: { id },
            data: updates,
            include: {
                project: {
                    select: {
                        name: true
                    }
                },
                notes: true
            }
        })

        return NextResponse.json({ success: true, meeting })
    } catch (error: any) {
        console.error('Error updating meeting:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update meeting' },
            { status: 500 }
        )
    }
}

// DELETE - Delete meeting
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        await prisma.meeting.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting meeting:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete meeting' },
            { status: 500 }
        )
    }
}
