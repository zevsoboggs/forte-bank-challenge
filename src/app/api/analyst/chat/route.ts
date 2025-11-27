import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM_PROMPT = `
You are an expert Business Analyst AI agent for a bank. Your goal is to help users (bank employees) define and refine business requirements for new features or process improvements.

Follow this process:
1.  **Understand the Goal**: Ask clarifying questions to understand what the user wants to achieve.
2.  **Gather Requirements**: Ask about specific requirements, constraints, stakeholders, and success metrics.
3.  **Structure**: Help the user structure their thoughts into standard business analysis artifacts (BRD, User Stories, Use Cases).
4.  **Refine**: Suggest improvements or point out gaps in the requirements.

Be professional, concise, and helpful. Do not just generate a document immediately; engage in a dialogue to ensure quality.
`

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } })
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const { message, sessionId } = await request.json()

        let currentSessionId = sessionId

        // Create session if not exists
        if (!currentSessionId) {
            const newSession = await prisma.analystSession.create({
                data: {
                    userId: user.id,
                    title: message.slice(0, 50) + '...'
                }
            })
            currentSessionId = newSession.id
        }

        // Save user message
        await prisma.analystMessage.create({
            data: {
                sessionId: currentSessionId,
                role: 'user',
                content: message
            }
        })

        // Get history
        const history = await prisma.analystMessage.findMany({
            where: { sessionId: currentSessionId },
            orderBy: { createdAt: 'asc' }
        })

        // Generate response
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })
        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Understood. I am ready to act as an expert Business Analyst.' }] },
                ...history.slice(0, -1).map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }))
            ]
        })

        const result = await chat.sendMessage(message)
        const responseText = result.response.text()

        // Save assistant response
        await prisma.analystMessage.create({
            data: {
                sessionId: currentSessionId,
                role: 'assistant',
                content: responseText
            }
        })

        return NextResponse.json({
            response: responseText,
            sessionId: currentSessionId
        })

    } catch (error) {
        console.error('Error in analyst chat:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
