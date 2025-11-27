import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

// POST - Transcribe and analyze meeting
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

        // Support both FormData and URLSearchParams
        const contentType = request.headers.get('content-type') || ''
        let transcript: string | null = null
        let audioFile: File | null = null

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            transcript = formData.get('transcript') as string
            audioFile = formData.get('audio') as File | null
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData()
            transcript = formData.get('transcript') as string
        } else {
            // Try JSON
            try {
                const body = await request.json()
                transcript = body.transcript
            } catch {
                const formData = await request.formData()
                transcript = formData.get('transcript') as string
                audioFile = formData.get('audio') as File | null
            }
        }

        let finalTranscript = transcript

        // If audio file provided, transcribe it using Whisper
        if (audioFile && !transcript) {
            console.log('🎙️ Transcribing audio file...')

            const transcription = await openai.audio.transcriptions.create({
                file: audioFile,
                model: 'whisper-1',
                language: 'ru' // Russian language
            })

            finalTranscript = transcription.text
            console.log('✅ Transcription complete')
        }

        if (!finalTranscript) {
            return NextResponse.json(
                { error: 'Either transcript text or audio file is required' },
                { status: 400 }
            )
        }

        // Update meeting with transcript
        await prisma.meeting.update({
            where: { id },
            data: { transcript: finalTranscript }
        })

        // Analyze transcript with AI
        console.log('🤖 Analyzing transcript with AI...')

        const analysisPrompt = `
Ты - AI-ассистент для анализа транскриптов встреч разработчиков.

Проанализируй следующий транскрипт встречи и извлеки:

1. **Ключевые решения** - важные решения, принятые на встрече
2. **Экшн-айтемы** - конкретные задачи и действия, которые нужно выполнить
3. **Назначения** - кто ответственен за какие задачи
4. **Важные обсуждения** - значимые технические обсуждения или дискуссии
5. **Дедлайны** - упомянутые сроки и даты

Верни результат в JSON формате:

{
  "summary": "Краткое резюме встречи (2-3 предложения)",
  "keyDecisions": [
    { "decision": "Текст решения", "context": "Контекст и причина" }
  ],
  "actionItems": [
    {
      "task": "Описание задачи",
      "assignee": "Имя ответственного или null",
      "priority": "HIGH | MEDIUM | LOW",
      "deadline": "YYYY-MM-DD или null"
    }
  ],
  "discussions": [
    { "topic": "Тема обсуждения", "summary": "Краткое содержание" }
  ]
}

Транскрипт встречи:

${finalTranscript}
`

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'Ты - эксперт в анализе встреч разработчиков. Извлекай точную и структурированную информацию.' },
                { role: 'user', content: analysisPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2
        })

        const analysis = JSON.parse(completion.choices[0].message.content || '{}')
        console.log('✅ Analysis complete')

        // Update meeting with analysis results
        await prisma.meeting.update({
            where: { id },
            data: {
                summary: analysis.summary || 'Анализ встречи завершен',
                keyDecisions: analysis.keyDecisions || [],
                actionItems: analysis.actionItems || []
            }
        })

        // Create meeting note with summary
        const meetingNote = await prisma.meetingNote.create({
            data: {
                meetingId: id,
                content: analysis.summary || 'Анализ встречи завершен',
                timestamp: new Date(),
                speaker: 'AI Assistant',
                isDecision: false,
                isAction: false
            }
        })

        // Get meeting with project info to create tasks
        const meeting = await prisma.meeting.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        teamMembers: true
                    }
                }
            }
        })

        // Create tasks from action items
        const tasksCreated = []
        if (analysis.actionItems && analysis.actionItems.length > 0) {
            console.log(`📋 Creating ${analysis.actionItems.length} tasks from action items...`)

            for (const item of analysis.actionItems) {
                // Try to find team member by name
                let assigneeId = null
                if (item.assignee && meeting?.project.teamMembers) {
                    const member = meeting.project.teamMembers.find(m =>
                        m.name.toLowerCase().includes(item.assignee.toLowerCase()) ||
                        item.assignee.toLowerCase().includes(m.name.toLowerCase())
                    )
                    assigneeId = member?.id
                }

                // Map priority
                const priority = item.priority === 'HIGH' ? 'HIGH' :
                    item.priority === 'LOW' ? 'LOW' : 'MEDIUM'

                const task = await prisma.task.create({
                    data: {
                        projectId: meeting!.project.id,
                        title: item.task,
                        description: `Создано из встречи: ${meeting!.title}\n\nДата встречи: ${meeting!.scheduledAt.toLocaleDateString('ru-RU')}`,
                        type: 'TASK',
                        status: 'TODO',
                        priority,
                        assigneeId,
                        dueDate: item.deadline ? new Date(item.deadline) : null,
                        aiGenerated: true
                    }
                })

                tasksCreated.push(task)
            }

            console.log(`✅ Created ${tasksCreated.length} tasks`)
        }

        return NextResponse.json({
            success: true,
            transcript: finalTranscript,
            analysis,
            meetingNote,
            tasksCreated: tasksCreated.length
        })

    } catch (error: any) {
        console.error('❌ Error transcribing/analyzing meeting:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to transcribe meeting' },
            { status: 500 }
        )
    }
}
