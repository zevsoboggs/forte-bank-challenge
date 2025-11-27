import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { content, title, type, sessionId } = await request.json()

        if (!content || !title || !type) {
            return NextResponse.json(
                { error: 'Content, title, and type are required' },
                { status: 400 }
            )
        }

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            )
        }

        // Save document to database
        const document = await prisma.analystDocument.create({
            data: {
                sessionId,
                title,
                type,
                content,
                createdBy: session.user.email
            }
        })

        console.log(`✅ Document saved: ${document.title} (${document.id})`)

        return NextResponse.json({
            success: true,
            documentId: document.id,
            message: 'Документ успешно сохранен'
        })

    } catch (error: any) {
        console.error('❌ Error saving document:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to save document' },
            { status: 500 }
        )
    }
}

// GET - Get all documents for a session
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('sessionId')

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            )
        }

        const documents = await prisma.analystDocument.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ documents })

    } catch (error: any) {
        console.error('❌ Error fetching documents:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch documents' },
            { status: 500 }
        )
    }
}
