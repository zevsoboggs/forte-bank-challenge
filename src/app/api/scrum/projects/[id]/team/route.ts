import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
        const { name, email, role } = await request.json()

        if (!name || !email || !role) {
            return NextResponse.json(
                { error: 'Name, email, and role are required' },
                { status: 400 }
            )
        }

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        const teamMember = await prisma.teamMember.create({
            data: {
                projectId,
                name,
                email,
                role
            }
        })

        return NextResponse.json({ success: true, teamMember })
    } catch (error: any) {
        console.error('Error adding team member:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to add team member' },
            { status: 500 }
        )
    }
}
