import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST - Create new task
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: projectId } = await params
        const body = await request.json()

        const {
            title,
            description,
            type = 'TASK',
            status = 'TODO',
            priority = 'MEDIUM',
            assigneeId
        } = body

        if (!title || !title.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Create task
        const task = await prisma.task.create({
            data: {
                projectId,
                title: title.trim(),
                description: description?.trim() || null,
                type,
                status,
                priority,
                assigneeId: assigneeId || null
            },
            include: {
                assignee: true,
                subtasks: true
            }
        })

        console.log(`✅ Created task: ${task.title} (${task.id})`)

        return NextResponse.json({ success: true, task })

    } catch (error: any) {
        console.error('❌ Error creating task:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create task' },
            { status: 500 }
        )
    }
}
