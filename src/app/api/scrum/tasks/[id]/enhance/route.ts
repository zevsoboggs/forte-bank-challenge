import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Get current task data
        const task = await prisma.task.findUnique({
            where: { id },
            include: { subtasks: true }
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Generate enhancement with Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

        const prompt = `
Ты - эксперт Agile Project Manager. Улучши следующую задачу:

Название: "${task.title}"
Описание: "${task.description || 'Нет описания'}"

Задачи:
1. Улучши описание задачи: сделай его более профессиональным, четким и подробным. Используй формат User Story если применимо.
2. Предложи 3-5 конкретных подзадач для выполнения этой задачи.

ВАЖНО: Верни ТОЛЬКО JSON объект (без markdown блоков) со следующей структурой:
{
    "description": "улучшенное описание на русском языке...",
    "subtasks": ["подзадача 1", "подзадача 2", "подзадача 3"]
}
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        console.log('📝 Gemini raw response:', text)

        // Parse JSON from response (handle potential markdown code blocks)
        let jsonStr = text.trim()

        // Remove markdown code blocks if present
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')

        // Try to extract JSON object if there's extra text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            jsonStr = jsonMatch[0]
        }

        console.log('📋 Parsed JSON string:', jsonStr)

        const enhancement = JSON.parse(jsonStr)

        if (!enhancement.description || !enhancement.subtasks || !Array.isArray(enhancement.subtasks)) {
            throw new Error('Invalid response format from Gemini')
        }

        // Update task description
        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                description: enhancement.description,
                aiGenerated: true
            }
        })

        // Create subtasks separately
        for (const subtaskTitle of enhancement.subtasks) {
            await prisma.task.create({
                data: {
                    projectId: task.projectId,
                    title: subtaskTitle,
                    description: `Подзадача для: ${task.title}`,
                    type: 'SUBTASK',
                    status: 'TODO',
                    priority: task.priority,
                    parentTaskId: task.id,
                    aiGenerated: true
                }
            })
        }

        // Fetch complete task with subtasks
        const finalTask = await prisma.task.findUnique({
            where: { id },
            include: {
                subtasks: true,
                assignee: true
            }
        })

        return NextResponse.json({ success: true, task: finalTask })

    } catch (error: any) {
        console.error('Error enhancing task:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to enhance task' },
            { status: 500 }
        )
    }
}
