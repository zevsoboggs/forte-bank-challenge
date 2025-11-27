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

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                tasks: {
                    where: { parentTaskId: null }, // Only root tasks and epics
                    include: {
                        assignee: true,
                        subtasks: {
                            include: {
                                assignee: true
                            }
                        },
                        _count: {
                            select: { subtasks: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                teamMembers: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        return NextResponse.json({ project })
    } catch (error: any) {
        console.error('Error fetching project:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch project' },
            { status: 500 }
        )
    }
}
