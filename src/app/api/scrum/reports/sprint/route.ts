import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Generate sprint report for a project
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('projectId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
        }

        // Default to last 2 weeks if dates not provided
        const end = endDate ? new Date(endDate) : new Date()
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000)

        console.log(`📊 Generating sprint report for project ${projectId} from ${start.toDateString()} to ${end.toDateString()}`)

        // Get project with all tasks
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                tasks: {
                    include: {
                        assignee: true,
                        subtasks: {
                            include: {
                                assignee: true
                            }
                        },
                        comments: true
                    }
                },
                teamMembers: true,
                meetings: {
                    where: {
                        scheduledAt: {
                            gte: start,
                            lte: end
                        }
                    }
                }
            }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Calculate sprint metrics
        const report = generateSprintReport(project, start, end)

        return NextResponse.json({
            success: true,
            report,
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            }
        })

    } catch (error: any) {
        console.error('Error generating sprint report:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate sprint report' },
            { status: 500 }
        )
    }
}

function generateSprintReport(project: any, startDate: Date, endDate: Date) {
    const allTasks = project.tasks.flatMap((task: any) => [task, ...(task.subtasks || [])])

    // Filter tasks created or updated during sprint
    const sprintTasks = allTasks.filter((task: any) => {
        const createdAt = new Date(task.createdAt)
        const updatedAt = new Date(task.updatedAt)
        return (createdAt >= startDate && createdAt <= endDate) ||
            (updatedAt >= startDate && updatedAt <= endDate)
    })

    // Calculate metrics
    const totalTasks = sprintTasks.length
    const completedTasks = sprintTasks.filter((t: any) => t.status === 'DONE').length
    const inProgressTasks = sprintTasks.filter((t: any) => t.status === 'IN_PROGRESS').length
    const todoTasks = sprintTasks.filter((t: any) => t.status === 'TODO').length
    const blockedTasks = sprintTasks.filter((t: any) => t.status === 'BLOCKED').length

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Calculate story points (estimated hours)
    const totalStoryPoints = sprintTasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0)
    const completedStoryPoints = sprintTasks
        .filter((t: any) => t.status === 'DONE')
        .reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0)

    // Team performance
    const teamPerformance = project.teamMembers.map((member: any) => {
        const memberTasks = sprintTasks.filter((t: any) => t.assigneeId === member.id)
        const completedByMember = memberTasks.filter((t: any) => t.status === 'DONE').length
        const inProgressByMember = memberTasks.filter((t: any) => t.status === 'IN_PROGRESS').length

        return {
            memberId: member.id,
            name: member.name,
            role: member.role,
            tasksAssigned: memberTasks.length,
            tasksCompleted: completedByMember,
            tasksInProgress: inProgressByMember,
            completionRate: memberTasks.length > 0 ? (completedByMember / memberTasks.length) * 100 : 0,
            storyPoints: memberTasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0),
            completedStoryPoints: memberTasks
                .filter((t: any) => t.status === 'DONE')
                .reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0)
        }
    })

    // Priority breakdown
    const priorityBreakdown = {
        critical: sprintTasks.filter((t: any) => t.priority === 'CRITICAL').length,
        high: sprintTasks.filter((t: any) => t.priority === 'HIGH').length,
        medium: sprintTasks.filter((t: any) => t.priority === 'MEDIUM').length,
        low: sprintTasks.filter((t: any) => t.priority === 'LOW').length
    }

    // Type breakdown
    const typeBreakdown = {
        epic: sprintTasks.filter((t: any) => t.type === 'EPIC').length,
        task: sprintTasks.filter((t: any) => t.type === 'TASK').length,
        bug: sprintTasks.filter((t: any) => t.type === 'BUG').length,
        feature: sprintTasks.filter((t: any) => t.type === 'FEATURE').length
    }

    // AI-generated tasks ratio
    const aiGeneratedTasks = sprintTasks.filter((t: any) => t.aiGenerated).length
    const aiGeneratedRatio = totalTasks > 0 ? (aiGeneratedTasks / totalTasks) * 100 : 0

    // Daily progress (simplified - tasks completed per day)
    const dailyProgress = calculateDailyProgress(sprintTasks, startDate, endDate)

    // Velocity (story points completed per sprint)
    const velocity = completedStoryPoints

    // Burndown data
    const burndownData = calculateBurndownData(sprintTasks, startDate, endDate, totalStoryPoints)

    return {
        summary: {
            projectName: project.name,
            totalTasks,
            completedTasks,
            inProgressTasks,
            todoTasks,
            blockedTasks,
            completionRate: Math.round(completionRate * 10) / 10,
            totalStoryPoints: Math.round(totalStoryPoints * 10) / 10,
            completedStoryPoints: Math.round(completedStoryPoints * 10) / 10,
            velocity: Math.round(velocity * 10) / 10,
            aiGeneratedTasks,
            aiGeneratedRatio: Math.round(aiGeneratedRatio * 10) / 10
        },
        teamPerformance: teamPerformance.sort((a, b) => b.completionRate - a.completionRate),
        priorityBreakdown,
        typeBreakdown,
        dailyProgress,
        burndownData,
        meetings: project.meetings.map((m: any) => ({
            title: m.title,
            type: m.type,
            scheduledAt: m.scheduledAt,
            hasTranscript: !!m.transcript
        })),
        insights: generateInsights({
            completionRate,
            velocity,
            blockedTasks,
            teamPerformance,
            aiGeneratedRatio
        })
    }
}

function calculateDailyProgress(tasks: any[], startDate: Date, endDate: Date) {
    const days: any[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
        const dayTasks = tasks.filter((t: any) => {
            const updatedAt = new Date(t.updatedAt)
            return updatedAt.toDateString() === currentDate.toDateString() && t.status === 'DONE'
        })

        days.push({
            date: new Date(currentDate).toISOString().split('T')[0],
            completed: dayTasks.length,
            storyPoints: dayTasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0)
        })

        currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
}

function calculateBurndownData(tasks: any[], startDate: Date, endDate: Date, totalStoryPoints: number) {
    const days: any[] = []
    const currentDate = new Date(startDate)
    let remainingPoints = totalStoryPoints

    const daysBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    const idealBurnRate = totalStoryPoints / daysBetween

    while (currentDate <= endDate) {
        const dayCompletedTasks = tasks.filter((t: any) => {
            const updatedAt = new Date(t.updatedAt)
            return updatedAt.toDateString() === currentDate.toDateString() && t.status === 'DONE'
        })

        const completedPoints = dayCompletedTasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0)
        remainingPoints -= completedPoints

        const dayIndex = Math.ceil((currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
        const idealRemaining = totalStoryPoints - (idealBurnRate * dayIndex)

        days.push({
            date: new Date(currentDate).toISOString().split('T')[0],
            actual: Math.max(0, remainingPoints),
            ideal: Math.max(0, idealRemaining)
        })

        currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
}

function generateInsights(data: any): string[] {
    const insights: string[] = []

    // Completion rate insights
    if (data.completionRate >= 90) {
        insights.push('🎉 Отличная производительность! Команда выполнила более 90% задач.')
    } else if (data.completionRate >= 70) {
        insights.push('✅ Хорошая производительность. Большинство задач выполнено.')
    } else if (data.completionRate >= 50) {
        insights.push('⚠️ Средняя производительность. Есть возможность для улучшения.')
    } else {
        insights.push('❌ Низкая производительность. Требуется анализ причин.')
    }

    // Velocity insights
    if (data.velocity > 0) {
        insights.push(`📈 Velocity спринта: ${data.velocity.toFixed(1)} story points выполнено.`)
    }

    // Blocked tasks
    if (data.blockedTasks > 0) {
        insights.push(`🚧 ${data.blockedTasks} задач заблокировано. Требуется внимание.`)
    }

    // Team performance
    const topPerformer = data.teamPerformance[0]
    if (topPerformer && topPerformer.completionRate > 0) {
        insights.push(`⭐ Лучший исполнитель: ${topPerformer.name} (${topPerformer.completionRate.toFixed(0)}% выполнено)`)
    }

    // AI assistance
    if (data.aiGeneratedRatio > 50) {
        insights.push(`🤖 ${data.aiGeneratedRatio.toFixed(0)}% задач создано AI - высокая автоматизация!`)
    }

    return insights
}
