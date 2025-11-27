import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectId, requirements } = await request.json()

        if (!projectId || !requirements) {
            return NextResponse.json(
                { error: 'Project ID and requirements are required' },
                { status: 400 }
            )
        }

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { teamMembers: true }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        console.log(`🤖 AI генерирует задачи для проекта: ${project.name}`)

        // AI prompt for task generation
        const systemPrompt = `Ты - AI Scrum Master. Твоя задача: анализировать техническое задание и создавать структурированные эпики и задачи для команды разработки.

Правила:
1. Создавай эпики для крупных функциональных блоков
2. Разбивай эпики на конкретные задачи (tasks)
3. Каждая задача должна быть выполнима за 1-3 дня
4. Оценивай сложность в часах (estimatedHours)
5. Назначай приоритет: LOW, MEDIUM, HIGH, CRITICAL
6. Пиши четкие, конкретные описания

Верни JSON в таком формате:
{
  "epics": [
    {
      "title": "Название эпика",
      "description": "Описание эпика",
      "priority": "HIGH",
      "tasks": [
        {
          "title": "Название задачи",
          "description": "Детальное описание",
          "priority": "MEDIUM",
          "estimatedHours": 8
        }
      ]
    }
  ]
}`

        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Техническое задание:\n\n${requirements}` }
            ],
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 3000,
        })

        const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
        console.log(`✅ AI сгенерировал ${aiResponse.epics?.length || 0} эпиков`)

        // Create tasks in database
        const createdTasks = []

        for (const epic of aiResponse.epics || []) {
            // Create epic
            const epicTask = await prisma.task.create({
                data: {
                    projectId,
                    title: epic.title,
                    description: epic.description,
                    type: 'EPIC',
                    priority: epic.priority || 'MEDIUM',
                    aiGenerated: true,
                    status: 'TODO'
                }
            })

            createdTasks.push(epicTask)

            // Create subtasks
            for (const task of epic.tasks || []) {
                // Try to auto-assign to team members (round-robin)
                const assigneeId = project.teamMembers.length > 0
                    ? project.teamMembers[Math.floor(Math.random() * project.teamMembers.length)].id
                    : null

                const subtask = await prisma.task.create({
                    data: {
                        projectId,
                        parentTaskId: epicTask.id,
                        title: task.title,
                        description: task.description,
                        type: 'TASK',
                        priority: task.priority || 'MEDIUM',
                        estimatedHours: task.estimatedHours || 8,
                        assigneeId,
                        aiGenerated: true,
                        status: 'TODO'
                    }
                })

                createdTasks.push(subtask)
            }
        }

        console.log(`✅ Создано ${createdTasks.length} задач в базе данных`)

        return NextResponse.json({
            success: true,
            message: `Создано ${aiResponse.epics?.length || 0} эпиков и ${createdTasks.length} задач`,
            tasksCreated: createdTasks.length
        })

    } catch (error: any) {
        console.error('❌ Error generating tasks:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate tasks' },
            { status: 500 }
        )
    }
}
