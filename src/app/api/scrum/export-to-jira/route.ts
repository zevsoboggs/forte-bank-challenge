import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { jiraClient } from '@/lib/jira'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectId, jiraProjectKey, createProject, newProjectName } = await request.json()

        if (!projectId || !jiraProjectKey) {
            return NextResponse.json(
                { error: 'Project ID and Jira project key are required' },
                { status: 400 }
            )
        }

        // Test Jira connection first
        const connected = await jiraClient.testConnection()
        if (!connected) {
            return NextResponse.json(
                { error: 'Jira connection failed. Please configure JIRA_URL, JIRA_EMAIL, and JIRA_API_TOKEN in environment variables.' },
                { status: 500 }
            )
        }

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
                        }
                    }
                },
                teamMembers: true
            }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        console.log(`🚀 Exporting project "${project.name}" to Jira project ${jiraProjectKey}`)

        let projectExists = await jiraClient.projectExists(jiraProjectKey)

        if (createProject && !projectExists) {
            console.log(`📦 Creating new Jira project ${jiraProjectKey}...`)

            const newJiraProject = await jiraClient.createProject({
                key: jiraProjectKey,
                name: newProjectName || project.name,
                description: project.description || `Exported from Forte.AI`,
                projectTypeKey: 'software'
            })

            if (!newJiraProject) {
                return NextResponse.json(
                    { error: `Failed to create Jira project ${jiraProjectKey}. It might already exist or the key is invalid.` },
                    { status: 500 }
                )
            }

            console.log(`✅ Created Jira project: ${newJiraProject.key}`)
            projectExists = true
        } else if (!projectExists) {
            return NextResponse.json(
                { error: `Jira project ${jiraProjectKey} does not exist. Please create it first or select "New Project".` },
                { status: 404 }
            )
        } else {
            console.log(`✅ Using existing Jira project ${jiraProjectKey}`)
        }

        const results = {
            epicsCreated: 0,
            tasksCreated: 0,
            subtasksCreated: 0,
            errors: 0,
            projectCreated: !projectExists
        }

        // Process each epic/task
        for (const task of project.tasks) {
            if (task.type === 'EPIC') {
                // Create epic in Jira
                const jiraEpic = await jiraClient.createIssue(jiraProjectKey, {
                    summary: task.title,
                    description: task.description || undefined,
                    issueType: 'Epic',
                    priority: mapPriority(task.priority),
                    assigneeEmail: task.assignee?.email
                })

                if (jiraEpic) {
                    results.epicsCreated++

                    // Store Jira key in our database
                    await prisma.task.update({
                        where: { id: task.id },
                        data: {
                            description: `${task.description || ''}\n\n🔗 Jira: ${jiraEpic.key}`
                        }
                    })

                    // Create subtasks
                    for (const subtask of task.subtasks || []) {
                        const jiraSubtask = await jiraClient.createIssue(jiraProjectKey, {
                            summary: subtask.title,
                            description: subtask.description || undefined,
                            issueType: 'Task',
                            priority: mapPriority(subtask.priority),
                            assigneeEmail: subtask.assignee?.email,
                            parentKey: jiraEpic.key
                        })

                        if (jiraSubtask) {
                            results.subtasksCreated++

                            await prisma.task.update({
                                where: { id: subtask.id },
                                data: {
                                    description: `${subtask.description || ''}\n\n🔗 Jira: ${jiraSubtask.key}`
                                }
                            })
                        } else {
                            results.errors++
                        }
                    }
                } else {
                    results.errors++
                }
            } else {
                // Create regular task in Jira
                const jiraTask = await jiraClient.createIssue(jiraProjectKey, {
                    summary: task.title,
                    description: task.description || undefined,
                    issueType: 'Task',
                    priority: mapPriority(task.priority),
                    assigneeEmail: task.assignee?.email
                })

                if (jiraTask) {
                    results.tasksCreated++

                    await prisma.task.update({
                        where: { id: task.id },
                        data: {
                            description: `${task.description || ''}\n\n🔗 Jira: ${jiraTask.key}`
                        }
                    })
                } else {
                    results.errors++
                }
            }
        }

        console.log(`✅ Export complete:`, results)

        const message = results.projectCreated
            ? `Создан новый проект в Jira и экспортировано ${results.epicsCreated} эпиков, ${results.tasksCreated} задач, ${results.subtasksCreated} подзадач`
            : `Экспортировано ${results.epicsCreated} эпиков, ${results.tasksCreated} задач, ${results.subtasksCreated} подзадач в Jira`

        return NextResponse.json({
            success: true,
            message,
            results
        })

    } catch (error: any) {
        console.error('❌ Error exporting to Jira:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to export to Jira' },
            { status: 500 }
        )
    }
}

function mapPriority(priority: string): 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' {
    switch (priority) {
        case 'CRITICAL': return 'Highest'
        case 'HIGH': return 'High'
        case 'MEDIUM': return 'Medium'
        case 'LOW': return 'Low'
        default: return 'Medium'
    }
}
