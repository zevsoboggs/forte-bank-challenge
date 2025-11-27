import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Check for upcoming deadlines and send reminders
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

        // Find tasks with upcoming deadlines
        const upcomingTasks = await prisma.task.findMany({
            where: {
                dueDate: {
                    gte: now,
                    lte: threeDaysFromNow
                },
                status: {
                    not: 'DONE'
                }
            },
            include: {
                assignee: true,
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        // Find overdue tasks
        const overdueTasks = await prisma.task.findMany({
            where: {
                dueDate: {
                    lt: now
                },
                status: {
                    not: 'DONE'
                }
            },
            include: {
                assignee: true,
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        // Categorize tasks by urgency
        const reminders = {
            critical: [] as any[], // Overdue
            urgent: [] as any[],    // Due within 24 hours
            upcoming: [] as any[]   // Due within 3 days
        }

        overdueTasks.forEach(task => {
            reminders.critical.push({
                taskId: task.id,
                title: task.title,
                dueDate: task.dueDate,
                assignee: task.assignee,
                project: task.project,
                daysOverdue: Math.floor((now.getTime() - task.dueDate!.getTime()) / (24 * 60 * 60 * 1000))
            })
        })

        upcomingTasks.forEach(task => {
            const daysUntilDue = Math.floor((task.dueDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

            if (task.dueDate! <= oneDayFromNow) {
                reminders.urgent.push({
                    taskId: task.id,
                    title: task.title,
                    dueDate: task.dueDate,
                    assignee: task.assignee,
                    project: task.project,
                    daysUntilDue
                })
            } else {
                reminders.upcoming.push({
                    taskId: task.id,
                    title: task.title,
                    dueDate: task.dueDate,
                    assignee: task.assignee,
                    project: task.project,
                    daysUntilDue
                })
            }
        })

        console.log(`📅 Deadline check: ${reminders.critical.length} overdue, ${reminders.urgent.length} urgent, ${reminders.upcoming.length} upcoming`)

        return NextResponse.json({
            success: true,
            reminders,
            summary: {
                critical: reminders.critical.length,
                urgent: reminders.urgent.length,
                upcoming: reminders.upcoming.length,
                total: reminders.critical.length + reminders.urgent.length + reminders.upcoming.length
            }
        })

    } catch (error: any) {
        console.error('Error checking deadlines:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to check deadlines' },
            { status: 500 }
        )
    }
}

// POST - Send reminder notifications
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { taskIds, type } = await request.json()

        if (!taskIds || !Array.isArray(taskIds)) {
            return NextResponse.json(
                { error: 'Task IDs array is required' },
                { status: 400 }
            )
        }

        // In a real implementation, this would send emails or push notifications
        // For now, we'll just log the reminders

        const tasks = await prisma.task.findMany({
            where: {
                id: { in: taskIds }
            },
            include: {
                assignee: true,
                project: {
                    select: {
                        name: true
                    }
                }
            }
        })

        const notifications = tasks.map(task => ({
            to: task.assignee?.email || 'unassigned',
            subject: getReminderSubject(type, task),
            message: getReminderMessage(type, task)
        }))

        // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        console.log(`📧 Would send ${notifications.length} reminder notifications:`)
        notifications.forEach(notif => {
            console.log(`   → ${notif.to}: ${notif.subject}`)
        })

        return NextResponse.json({
            success: true,
            notificationsSent: notifications.length,
            notifications
        })

    } catch (error: any) {
        console.error('Error sending reminders:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to send reminders' },
            { status: 500 }
        )
    }
}

function getReminderSubject(type: string, task: any): string {
    switch (type) {
        case 'critical':
            return `🚨 Просрочена задача: ${task.title}`
        case 'urgent':
            return `⚠️ Срочная задача истекает сегодня: ${task.title}`
        case 'upcoming':
            return `📅 Напоминание о задаче: ${task.title}`
        default:
            return `Напоминание: ${task.title}`
    }
}

function getReminderMessage(type: string, task: any): string {
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'не указан'

    switch (type) {
        case 'critical':
            return `
Здравствуйте!

Задача "${task.title}" просрочена!

Проект: ${task.project.name}
Дедлайн был: ${dueDate}
Приоритет: ${task.priority}

Пожалуйста, обновите статус задачи или установите новый дедлайн.

С уважением,
Forte.AI AI-Scrum Master
            `.trim()

        case 'urgent':
            return `
Здравствуйте!

Срочное напоминание: задача "${task.title}" должна быть завершена сегодня!

Проект: ${task.project.name}
Дедлайн: ${dueDate}
Приоритет: ${task.priority}

С уважением,
Forte.AI AI-Scrum Master
            `.trim()

        case 'upcoming':
            return `
Здравствуйте!

Напоминаем о задаче "${task.title}".

Проект: ${task.project.name}
Дедлайн: ${dueDate}
Приоритет: ${task.priority}
Статус: ${task.status}

С уважением,
Forte.AI AI-Scrum Master
            `.trim()

        default:
            return `Напоминание о задаче: ${task.title}`
    }
}
