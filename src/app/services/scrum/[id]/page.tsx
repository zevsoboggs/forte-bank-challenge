'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

import {
  Kanban,
  Plus,
  Users,
  Sparkles,
  FileText,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  MoreVertical,
  ArrowLeft,
  MessageSquare,
  Paperclip,
  X,
  ChevronDown,
  Search,
  Filter,
  Settings,
  Share2,
  BarChart3,
  Video,
  Loader2,
  Briefcase,
  Layout,
  ListTodo
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  type: string
  storyPoints?: number
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  subtasks: Array<{
    id: string
    title: string
    status: string
  }>
  aiGenerated: boolean
  jiraKey?: string
  jiraStatus?: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  teamMembers: Array<{
    id: string
    role: string
    name: string
    email: string
  }>
  _count: {
    tasks: number
  }
}

const STATUS_COLUMNS = [
  { id: 'BACKLOG', label: 'Бэклог', color: 'bg-gray-100 text-gray-700' },
  { id: 'TODO', label: 'К выполнению', color: 'bg-blue-50 text-blue-700' },
  { id: 'IN_PROGRESS', label: 'В работе', color: 'bg-orange-50 text-orange-700' },
  { id: 'IN_REVIEW', label: 'На проверке', color: 'bg-purple-50 text-purple-700' },
  { id: 'DONE', label: 'Готово', color: 'bg-green-50 text-green-700' }
]

export default function ProjectDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showJiraExportModal, setShowJiraExportModal] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [createTaskStatus, setCreateTaskStatus] = useState<string>('TODO')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list')
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  useEffect(() => {
    fetchProjectData()
  }, [])

  const fetchProjectData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/scrum/projects/${projectId}`)
      const data = await response.json()
      setProject(data.project)
      setTasks(data.project.tasks || [])
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ))

    try {
      await fetch(`/api/scrum/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
    } catch (error) {
      console.error('Error updating task status:', error)
      fetchProjectData() // Revert on error
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId && taskId !== draggedTaskId) {
      // Handle case where data might be missing or incorrect
    }
    if (taskId) {
      handleStatusChange(taskId, status)
    }
    setDraggedTaskId(null)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-forte-primary animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Загрузка проекта...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!project) return null

  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = []
    acc[task.status].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div className="p-8">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 text-white mb-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-forte-primary opacity-20 rounded-full blur-3xl -mr-20 -mt-20"></div>

        <div className="relative z-10">
          <button
            onClick={() => router.push('/services/scrum')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Назад к проектам</span>
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">{project.name}</h1>
                <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wide border border-white/10">
                  {project.status}
                </span>
              </div>
              <p className="text-gray-300 max-w-2xl text-lg leading-relaxed">
                {project.description || 'Нет описания'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/services/scrum/${projectId}/reports`)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all text-white border border-white/10"
                title="Отчеты"
              >
                <BarChart3 size={20} />
              </button>
              <button
                onClick={() => router.push(`/services/scrum/${projectId}/meetings`)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all text-white border border-white/10"
                title="Встречи"
              >
                <Video size={20} />
              </button>
              <button
                onClick={() => setShowJiraExportModal(true)}
                className="px-5 py-3 bg-forte-primary hover:bg-forte-primary/90 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg"
              >
                <Share2 size={18} />
                Экспорт в Jira
              </button>
            </div>
          </div>

          {/* Quick Stats in Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <ListTodo size={20} className="text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Всего задач</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <CheckCircle2 size={20} className="text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tasks.filter(t => t.status === 'DONE').length}
                </p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Завершено</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Clock size={20} className="text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tasks.filter(t => t.status === 'IN_PROGRESS').length}
                </p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">В работе</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Users size={20} className="text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{project.teamMembers.length}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Участников</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-8">
        {/* Top Row: Team & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-gray-400" />
                Команда
              </h3>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-forte-primary"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {project.teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-2 rounded-xl -mx-2 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-forte-primary font-bold text-sm border-2 border-white shadow-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 truncate">{member.role}</p>
                  </div>
                </div>
              ))}
              {project.teamMembers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Нет участников</p>
              )}
            </div>
          </div>

          {/* Quick Tip Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-100 h-full">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Sparkles size={18} className="text-forte-primary" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 text-sm mb-1">AI Совет</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Попробуйте использовать генератор задач для автоматического создания подзадач из описания эпика.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board or List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                {viewMode === 'kanban' ? 'Доска задач' : 'Список задач'}
              </h2>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                    viewMode === 'kanban'
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <Layout size={14} />
                  Канбан
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all",
                    viewMode === 'list'
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <ListTodo size={14} />
                  Список
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Поиск задач..."
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-forte-primary/20 outline-none w-48 transition-all hover:border-gray-300"
                />
              </div>
              <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all">
                <Filter size={18} />
              </button>
            </div>
          </div>

          {viewMode === 'kanban' ? (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {STATUS_COLUMNS.map(column => (
                <div
                  key={column.id}
                  className="min-w-[260px] w-[260px] flex-shrink-0 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full",
                        column.id === 'TODO' ? 'bg-blue-500' :
                          column.id === 'IN_PROGRESS' ? 'bg-orange-500' :
                            column.id === 'DONE' ? 'bg-green-500' : 'bg-gray-400'
                      )} />
                      <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{column.label}</h3>
                    </div>
                    <span className="px-2 py-0.5 bg-gray-100 rounded-md text-xs font-bold text-gray-500">
                      {tasksByStatus[column.id]?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {tasksByStatus[column.id]?.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                        onStatusChange={handleStatusChange}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                      />
                    ))}
                    <button
                      onClick={() => {
                        setCreateTaskStatus(column.id)
                        setShowCreateTaskModal(true)
                      }}
                      className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium hover:border-forte-primary/50 hover:text-forte-primary hover:bg-forte-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Добавить задачу
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                <div className="col-span-5">Задача</div>
                <div className="col-span-2">Статус</div>
                <div className="col-span-2">Приоритет</div>
                <div className="col-span-2">Исполнитель</div>
                <div className="col-span-1">SP</div>
              </div>
              <div className="divide-y divide-gray-100">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer items-center"
                  >
                    <div className="col-span-5 font-bold text-gray-900 text-sm flex items-center gap-2">
                      {task.aiGenerated && <Sparkles size={14} className="text-purple-500 flex-shrink-0" />}
                      {task.title}
                    </div>
                    <div className="col-span-2">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-xs font-bold",
                        STATUS_COLUMNS.find(c => c.id === task.status)?.color || 'bg-gray-100 text-gray-700'
                      )}>
                        {STATUS_COLUMNS.find(c => c.id === task.status)?.label || task.status}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-xs font-bold",
                        task.priority === 'HIGH' ? 'bg-red-50 text-red-700' :
                          task.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-700' :
                            'bg-blue-50 text-blue-700'
                      )}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      {task.assignee ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                            {task.assignee.name.charAt(0)}
                          </div>
                          <span className="text-xs text-gray-600 truncate">{task.assignee.name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Не назначен</span>
                      )}
                    </div>
                    <div className="col-span-1 text-xs font-bold text-gray-600">
                      {task.storyPoints || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && project && (
        <TaskDetailsModal
          task={selectedTask}
          teamMembers={project.teamMembers}
          onClose={() => {
            setShowTaskModal(false)
            setSelectedTask(null)
          }}
          onUpdate={(updatedTask) => {
            // Update tasks in state immediately
            setTasks(prev => prev.map(t =>
              t.id === updatedTask.id ? updatedTask : t
            ))
            // Update selected task to reflect changes in modal
            setSelectedTask(updatedTask)
          }}
        />
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <AddMemberModal
          projectId={projectId}
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={() => {
            fetchProjectData()
            setShowAddMemberModal(false)
          }}
        />
      )}

      {/* Jira Export Modal */}
      {showJiraExportModal && (
        <JiraExportModal
          projectId={project.id}
          taskCount={tasks.length}
          onClose={() => setShowJiraExportModal(false)}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && project && (
        <CreateTaskModal
          projectId={projectId}
          initialStatus={createTaskStatus}
          teamMembers={project.teamMembers}
          onClose={() => setShowCreateTaskModal(false)}
          onSuccess={() => {
            fetchProjectData()
            setShowCreateTaskModal(false)
          }}
        />
      )}
    </div>
  )
}

// Task Card Component
function TaskCard({ task, onClick, onStatusChange, onDragStart }: {
  task: Task
  onClick: () => void
  onStatusChange: (id: string, status: string) => void
  onDragStart: (e: React.DragEvent) => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={cn(
          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border",
          task.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' :
            task.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-700 border-orange-100' :
              'bg-blue-50 text-blue-700 border-blue-100'
        )}>
          {task.priority}
        </span>
        {task.aiGenerated && (
          <Sparkles size={14} className="text-purple-500" />
        )}
      </div>

      <h4 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-forte-primary transition-colors">
        {task.title}
      </h4>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 border border-white shadow-sm" title={task.assignee.name}>
              {task.assignee.name.charAt(0)}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center">
              <Users size={12} className="text-gray-400" />
            </div>
          )}
          {task.storyPoints && (
            <span className="text-xs font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">
              {task.storyPoints} SP
            </span>
          )}
        </div>

        {task.jiraKey && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-gray-400">{task.jiraKey}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Task Details Modal
function TaskDetailsModal({ task, teamMembers, onClose, onUpdate }: {
  task: Task
  teamMembers: Array<{ id: string, name: string }>
  onClose: () => void
  onUpdate: (updatedTask: Task) => void
}) {
  const [localTask, setLocalTask] = useState(task)

  // Update local task when prop changes
  useEffect(() => {
    setLocalTask(task)
  }, [task])

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/scrum/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (response.ok) {
        const updatedTask = { ...localTask, status: newStatus }
        setLocalTask(updatedTask)
        onUpdate(updatedTask)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleAssigneeChange = async (assigneeId: string) => {
    try {
      const response = await fetch(`/api/scrum/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId })
      })
      if (response.ok) {
        const member = teamMembers.find(m => m.id === assigneeId)
        const updatedTask = {
          ...localTask,
          assignee: member ? { id: member.id, name: member.name } : undefined
        }
        setLocalTask(updatedTask)
        onUpdate(updatedTask)
      }
    } catch (error) {
      console.error('Failed to update assignee:', error)
    }
  }

  const handlePriorityChange = async (priority: string) => {
    try {
      const response = await fetch(`/api/scrum/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      })
      if (response.ok) {
        const updatedTask = { ...localTask, priority }
        setLocalTask(updatedTask)
        onUpdate(updatedTask)
      }
    } catch (error) {
      console.error('Failed to update priority:', error)
    }
  }

  const handleSubtaskToggle = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE'
    try {
      const response = await fetch(`/api/scrum/tasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (response.ok) {
        const updatedTask = {
          ...localTask,
          subtasks: localTask.subtasks.map(s =>
            s.id === subtaskId ? { ...s, status: newStatus } : s
          )
        }
        setLocalTask(updatedTask)
        onUpdate(updatedTask)
      }
    } catch (error) {
      console.error('Failed to update subtask:', error)
    }
  }

  const [enhancing, setEnhancing] = useState(false)

  const handleEnhanceTask = async () => {
    setEnhancing(true)
    try {
      const response = await fetch(`/api/scrum/tasks/${task.id}/enhance`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setLocalTask(data.task)
        onUpdate(data.task)
      } else {
        const error = await response.json()
        alert('Ошибка улучшения задачи: ' + (error.error || 'Неизвестная ошибка'))
      }
    } catch (error) {
      console.error('Failed to enhance task:', error)
      alert('Не удалось улучшить задачу. Проверьте консоль для деталей.')
    } finally {
      setEnhancing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] my-auto shadow-2xl flex overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-400">#{localTask.id.slice(-4)}</span>
              {localTask.aiGenerated && (
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold flex items-center gap-1.5 border border-purple-100">
                  <Sparkles size={12} />
                  AI Generated
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href + `?task=${localTask.id}`)
                  alert('Ссылка скопирована!')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Поделиться"
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={() => {
                  // TODO: Add actions menu
                  alert('Меню действий скоро будет доступно')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Действия"
              >
                <MoreVertical size={18} />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-4">{localTask.title}</h2>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <FileText size={14} className="text-gray-400" />
                  Описание
                </h3>
                <button
                  onClick={handleEnhanceTask}
                  disabled={enhancing}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  {enhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {enhancing ? 'Улучшаем...' : 'Улучшить с AI'}
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {localTask.description || 'Нет описания'}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <ListTodo size={14} className="text-gray-400" />
                Подзадачи
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {localTask.subtasks?.map((subtask, index) => (
                  <div key={subtask.id || `subtask-${index}`} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors group">
                    <button
                      onClick={() => handleSubtaskToggle(subtask.id, subtask.status)}
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
                        subtask.status === 'DONE'
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 hover:border-forte-primary"
                      )}
                    >
                      {subtask.status === 'DONE' && <CheckCircle2 size={10} />}
                    </button>
                    <span className={cn(
                      "text-sm font-medium transition-colors flex-1 truncate",
                      subtask.status === 'DONE' ? "text-gray-400 line-through" : "text-gray-700"
                    )}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
                {(!localTask.subtasks || localTask.subtasks.length === 0) && (
                  <p className="text-xs text-gray-400 italic py-2">Нет подзадач</p>
                )}
              </div>
              <button className="flex items-center gap-1.5 text-xs font-bold text-forte-primary hover:text-forte-primary/80 px-2 py-1.5 rounded-lg hover:bg-forte-primary/5 transition-all w-fit mt-2">
                <Plus size={14} />
                Добавить подзадачу
              </button>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Paperclip size={14} className="text-gray-400" />
                Вложения
              </h3>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-forte-primary/30 hover:bg-gray-50 transition-all cursor-pointer">
                <p className="text-xs text-gray-500 font-medium">Нажмите или перетащите файлы сюда</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 bg-gray-50 border-l border-gray-100 p-5 overflow-y-auto max-h-[90vh]">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Статус</label>
              <select
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-forte-primary/20 outline-none cursor-pointer"
                value={localTask.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {STATUS_COLUMNS.map(col => (
                  <option key={col.id} value={col.id}>{col.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Исполнитель</label>
              <div className="relative">
                <select
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 pl-10 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-forte-primary/20 outline-none appearance-none cursor-pointer"
                  value={localTask.assignee?.id || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                >
                  <option value="">Не назначен</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {localTask.assignee ? (
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                      {localTask.assignee.name.charAt(0)}
                    </div>
                  ) : (
                    <Users size={14} className="text-gray-400" />
                  )}
                </div>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Приоритет</label>
              <div className="flex gap-2">
                {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold border transition-all",
                      localTask.priority === p
                        ? p === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200'
                          : p === 'MEDIUM' ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>Создано</span>
                <span className="font-medium">21 нояб. 2025</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Обновлено</span>
                <span className="font-medium">Только что</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add Member Modal
function AddMemberModal({ projectId, onClose, onSuccess }: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/scrum/projects/${projectId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role })
      })

      if (response.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error adding team member:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Добавить участника</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Имя *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Роль *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all"
            >
              <option value="">-- Выберите роль --</option>
              <option value="Developer">Developer</option>
              <option value="Designer">Designer</option>
              <option value="QA Engineer">QA Engineer</option>
              <option value="Product Manager">Product Manager</option>
              <option value="Tech Lead">Tech Lead</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Jira Export Modal
function JiraExportModal({ projectId, taskCount, onClose }: {
  projectId: string
  taskCount: number
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [projects, setProjects] = useState<Array<{ key: string, name: string }>>([])
  const [selectedProjectKey, setSelectedProjectKey] = useState('')
  const [newProjectKey, setNewProjectKey] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [fetchingProjects, setFetchingProjects] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setFetchingProjects(true)
    try {
      const response = await fetch('/api/scrum/jira-projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch Jira projects:', error)
    } finally {
      setFetchingProjects(false)
    }
  }

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    try {
      const jiraProjectKey = mode === 'existing' ? selectedProjectKey : newProjectKey

      const response = await fetch('/api/scrum/export-to-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          jiraProjectKey,
          createProject: mode === 'new',
          newProjectName: mode === 'new' ? newProjectName : undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export to Jira')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Ошибка экспорта. Проверьте настройки Jira.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Share2 className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Экспорт в Jira</h2>
          <p className="text-gray-500 text-sm">
            Синхронизация задач и статусов с проектом в Jira Software
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success ? (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl text-sm flex items-center gap-2 justify-center font-bold">
            <CheckCircle2 size={16} />
            Экспорт успешно завершен!
          </div>
        ) : (
          <div className="space-y-6 mb-8">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setMode('existing')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                  mode === 'existing' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Существующий проект
              </button>
              <button
                onClick={() => setMode('new')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                  mode === 'new' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Новый проект
              </button>
            </div>

            {mode === 'existing' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">Выберите проект</label>
                {fetchingProjects ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 p-3 bg-gray-50 rounded-xl">
                    <Loader2 size={16} className="animate-spin" />
                    Загрузка проектов...
                  </div>
                ) : (
                  <select
                    value={selectedProjectKey}
                    onChange={(e) => setSelectedProjectKey(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-forte-primary/20 outline-none cursor-pointer"
                  >
                    <option value="">Выберите проект...</option>
                    {projects.map(p => (
                      <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Название проекта</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-forte-primary/20 outline-none"
                    placeholder="Мой проект"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Ключ (Key)</label>
                  <input
                    type="text"
                    value={newProjectKey}
                    onChange={(e) => setNewProjectKey(e.target.value.toUpperCase())}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-forte-primary/20 outline-none uppercase"
                    placeholder="MYPROJ"
                    maxLength={10}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
              <Sparkles size={16} />
              <p>Будет экспортировано задач: {taskCount}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition-all">
            Отмена
          </button>
          <button
            onClick={handleExport}
            disabled={loading || success || (mode === 'existing' && !selectedProjectKey) || (mode === 'new' && (!newProjectKey || !newProjectName))}
            className="flex-1 px-4 py-3 bg-[#0052CC] text-white rounded-xl font-bold hover:bg-[#0052CC]/90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Экспортировать'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Create Task Modal
function CreateTaskModal({ projectId, initialStatus, teamMembers, onClose, onSuccess }: {
  projectId: string
  initialStatus: string
  teamMembers: Array<{ id: string, name: string }>
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'TASK' | 'BUG' | 'EPIC'>('TASK')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [assigneeId, setAssigneeId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/scrum/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          status: initialStatus,
          priority,
          assigneeId: assigneeId || undefined
        })
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        alert('Ошибка: ' + (error.error || 'Не удалось создать задачу'))
      }
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Произошла ошибка при создании задачи')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Новая задача</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Введите название задачи"
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Опишите задачу подробнее"
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Тип</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'TASK' | 'BUG' | 'EPIC')}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all"
              >
                <option value="TASK">Задача</option>
                <option value="BUG">Баг</option>
                <option value="EPIC">Эпик</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all"
              >
                <option value="LOW">Низкий</option>
                <option value="MEDIUM">Средний</option>
                <option value="HIGH">Высокий</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Исполнитель</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all"
            >
              <option value="">Не назначен</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 px-6 py-3 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
