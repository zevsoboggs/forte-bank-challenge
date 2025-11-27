// Jira API Integration
// Для работы нужны переменные окружения:
// JIRA_URL - URL вашего Jira (например: https://your-domain.atlassian.net)
// JIRA_EMAIL - email пользователя Jira
// JIRA_API_TOKEN - API токен из Jira

const JIRA_URL = process.env.JIRA_URL || ''
const JIRA_EMAIL = process.env.JIRA_EMAIL || ''
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || ''

const JIRA_AUTH = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')

export interface JiraIssue {
    key: string
    id: string
    fields: {
        summary: string
        description?: string
        status: {
            name: string
        }
        assignee?: {
            displayName: string
            emailAddress: string
        }
        priority?: {
            name: string
        }
    }
}

export const jiraClient = {
    // Проверка подключения к Jira
    async testConnection(): Promise<boolean> {
        if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
            console.log('⚠️ Jira credentials not configured')
            return false
        }

        try {
            const response = await fetch(`${JIRA_URL}/rest/api/3/myself`, {
                headers: {
                    'Authorization': `Basic ${JIRA_AUTH}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                console.log('✅ Jira connection successful')
                return true
            }

            console.error('❌ Jira connection failed:', response.status)
            return false
        } catch (error) {
            console.error('❌ Jira connection error:', error)
            return false
        }
    },

    // Создать задачу (issue) в Jira
    async createIssue(projectKey: string, data: {
        summary: string
        description?: string
        issueType: 'Epic' | 'Task' | 'Story' | 'Bug'
        priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest'
        assigneeEmail?: string
        parentKey?: string // Для создания подзадач
    }): Promise<JiraIssue | null> {
        if (!JIRA_URL || !JIRA_AUTH) {
            console.log('⚠️ Jira not configured')
            return null
        }

        try {
            const issueData: any = {
                fields: {
                    project: { key: projectKey },
                    summary: data.summary,
                    issuetype: { name: data.issueType },
                }
            }

            if (data.description) {
                issueData.fields.description = {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: data.description
                                }
                            ]
                        }
                    ]
                }
            }

            if (data.priority) {
                issueData.fields.priority = { name: data.priority }
            }

            if (data.assigneeEmail) {
                issueData.fields.assignee = { emailAddress: data.assigneeEmail }
            }

            if (data.parentKey) {
                issueData.fields.parent = { key: data.parentKey }
            }

            const response = await fetch(`${JIRA_URL}/rest/api/3/issue`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${JIRA_AUTH}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(issueData)
            })

            if (!response.ok) {
                const error = await response.text()
                console.error('❌ Failed to create Jira issue:', error)
                return null
            }

            const result = await response.json()
            console.log(`✅ Created Jira issue: ${result.key}`)

            // Fetch full issue data
            return await this.getIssue(result.key)
        } catch (error) {
            console.error('❌ Error creating Jira issue:', error)
            return null
        }
    },

    // Получить задачу по ключу
    async getIssue(issueKey: string): Promise<JiraIssue | null> {
        if (!JIRA_URL || !JIRA_AUTH) return null

        try {
            const response = await fetch(`${JIRA_URL}/rest/api/3/issue/${issueKey}`, {
                headers: {
                    'Authorization': `Basic ${JIRA_AUTH}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                return await response.json()
            }

            return null
        } catch (error) {
            console.error('Error fetching Jira issue:', error)
            return null
        }
    },

    // Обновить статус задачи
    async updateIssueStatus(issueKey: string, statusName: string): Promise<boolean> {
        if (!JIRA_URL || !JIRA_AUTH) return false

        try {
            // Get available transitions
            const transitionsResponse = await fetch(
                `${JIRA_URL}/rest/api/3/issue/${issueKey}/transitions`,
                {
                    headers: {
                        'Authorization': `Basic ${JIRA_AUTH}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            if (!transitionsResponse.ok) return false

            const { transitions } = await transitionsResponse.json()
            const transition = transitions.find((t: any) =>
                t.to.name.toLowerCase() === statusName.toLowerCase()
            )

            if (!transition) {
                console.log(`⚠️ Transition to "${statusName}" not found`)
                return false
            }

            // Execute transition
            const response = await fetch(
                `${JIRA_URL}/rest/api/3/issue/${issueKey}/transitions`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${JIRA_AUTH}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        transition: { id: transition.id }
                    })
                }
            )

            if (response.ok || response.status === 204) {
                console.log(`✅ Updated ${issueKey} status to ${statusName}`)
                return true
            }

            return false
        } catch (error) {
            console.error('Error updating Jira status:', error)
            return false
        }
    },

    // Получить все проекты
    async getProjects(): Promise<Array<{ key: string; name: string }>> {
        if (!JIRA_URL || !JIRA_AUTH) return []

        try {
            const response = await fetch(`${JIRA_URL}/rest/api/3/project`, {
                headers: {
                    'Authorization': `Basic ${JIRA_AUTH}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                return await response.json()
            }

            return []
        } catch (error) {
            console.error('Error fetching Jira projects:', error)
            return []
        }
    },

    // Создать проект в Jira
    async createProject(data: {
        key: string
        name: string
        description?: string
        projectTypeKey?: 'software' | 'business'
        projectTemplateKey?: string
        leadAccountId?: string
    }): Promise<any | null> {
        if (!JIRA_URL || !JIRA_AUTH) {
            console.log('⚠️ Jira not configured')
            return null
        }

        try {
            // Get current user to set as lead
            const userResponse = await fetch(`${JIRA_URL}/rest/api/3/myself`, {
                headers: {
                    'Authorization': `Basic ${JIRA_AUTH}`,
                    'Content-Type': 'application/json'
                }
            })

            let leadAccountId = data.leadAccountId
            if (userResponse.ok && !leadAccountId) {
                const user = await userResponse.json()
                leadAccountId = user.accountId
            }

            const projectData: any = {
                key: data.key.toUpperCase(),
                name: data.name,
                projectTypeKey: data.projectTypeKey || 'software',
                projectTemplateKey: data.projectTemplateKey || 'com.pyxis.greenhopper.jira:gh-simplified-agility-kanban',
                leadAccountId
            }

            if (data.description) {
                projectData.description = data.description
            }

            console.log(`🚀 Creating Jira project: ${data.key}`)

            const response = await fetch(`${JIRA_URL}/rest/api/3/project`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${JIRA_AUTH}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            })

            if (!response.ok) {
                const error = await response.text()
                console.error('❌ Failed to create Jira project:', error)
                return null
            }

            const result = await response.json()
            console.log(`✅ Created Jira project: ${result.key}`)
            return result
        } catch (error) {
            console.error('❌ Error creating Jira project:', error)
            return null
        }
    },

    // Проверить существование проекта
    async projectExists(projectKey: string): Promise<boolean> {
        if (!JIRA_URL || !JIRA_AUTH) return false

        try {
            const response = await fetch(`${JIRA_URL}/rest/api/3/project/${projectKey}`, {
                headers: {
                    'Authorization': `Basic ${JIRA_AUTH}`,
                    'Content-Type': 'application/json'
                }
            })

            return response.ok
        } catch (error) {
            return false
        }
    }
}
