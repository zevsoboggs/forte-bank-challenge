import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
        const body = await request.json()

        // Build update data
        const updateData: any = {}
        if (body.status) updateData.status = body.status
        if (body.priority) updateData.priority = body.priority
        if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId
        if (body.title) updateData.title = body.title
        if (body.description !== undefined) updateData.description = body.description
        if (body.estimatedHours !== undefined) updateData.estimatedHours = body.estimatedHours

        // If task is marked as DONE, set completedAt
        if (body.status === 'DONE') {
            updateData.completedAt = new Date()
        }

        const task = await prisma.task.update({
            where: { id },
            data: updateData,
            include: {
                assignee: true
            }
        })

        return NextResponse.json({ success: true, task })
    } catch (error: any) {
        console.error('Error updating task:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update task' },
            { status: 500 }
        )
    }
}

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

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                assignee: true,
                project: true,
                subtasks: {
                    include: {
                        assignee: true
                    }
                },
                comments: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        return NextResponse.json({ task })
    } catch (error: any) {
        console.error('Error fetching task:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch task' },
            { status: 500 }
        )
    }
}
