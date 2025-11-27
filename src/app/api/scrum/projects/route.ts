import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const projects = await prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                tasks: {
                    select: {
                        _count: {
                            select: {
                                subtasks: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        tasks: true,
                        teamMembers: true
                    }
                }
            }
        })

        return NextResponse.json({ projects })
    } catch (error: any) {
        console.error('Error fetching projects:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch projects' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, description } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const project = await prisma.project.create({
            data: {
                name,
                description,
                createdBy: session.user?.email || 'unknown',
                status: 'ACTIVE'
            }
        })

        return NextResponse.json({ success: true, project })
    } catch (error: any) {
        console.error('Error creating project:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create project' },
            { status: 500 }
        )
    }
}
