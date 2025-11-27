'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  ChevronRight,
  Loader2,
  Bell,
  XCircle,
  Briefcase,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  description?: string
  status: string
  tasks?: Array<{
    _count?: {
      subtasks: number
    }
  }>
  _count: {
    tasks: number
    teamMembers: number
  }
}

export default function ScrumMasterPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showTaskGeneratorModal, setShowTaskGeneratorModal] = useState(false)
  const [reminders, setReminders] = useState<any>(null)
  const [loadingReminders, setLoadingReminders] = useState(false)

  useEffect(() => {
    fetchProjects()
    fetchReminders()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/scrum/projects')
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReminders = async () => {
    setLoadingReminders(true)
    try {
      const response = await fetch('/api/scrum/reminders')
      const data = await response.json()
      setReminders(data.reminders)
    } catch (error) {
      console.error('Error fetching reminders:', error)
    } finally {
      setLoadingReminders(false)
    }
  }

  return (
    <div className="p-8">
      {/* Premium Header Card */}
      <div className="bg-gradient-to-br from-forte-primary to-forte-secondary rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-5 rounded-full blur-3xl -ml-10 -mb-10"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Kanban className="text-white" size={24} />
              </div>
              <span className="text-blue-100 font-medium tracking-wide uppercase text-sm">Сервисы</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">AI-Scrum Master</h1>
            <p className="text-blue-100 max-w-xl text-lg">
              Интеллектуальное управление проектами: от генерации задач до контроля спринтов.
            </p>
          </div>
          <button
            onClick={() => setShowTaskGeneratorModal(true)}
            className="px-6 py-3 bg-white text-forte-primary rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg transform hover:-translate-y-0.5"
          >
            <Sparkles size={20} />
            Создать задачи из ТЗ
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
              <Briefcase size={24} className="text-blue-600" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Проекты</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{projects.length}</p>
          <p className="text-sm text-gray-500">Активных проектов</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-2xl group-hover:bg-green-100 transition-colors">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Задачи</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {projects.reduce((sum, p) => {
              return sum + (p.tasks?.reduce((taskSum, t) => taskSum + (t._count?.subtasks || 0), 0) || 0)
            }, 0)}
          </p>
          <p className="text-sm text-gray-500">Всего задач</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-2xl group-hover:bg-orange-100 transition-colors">
              <Clock size={24} className="text-orange-600" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Спринт</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">0</p>
          <p className="text-sm text-gray-500">Задач в работе</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-2xl group-hover:bg-purple-100 transition-colors">
              <Users size={24} className="text-purple-600" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Команда</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {projects.reduce((sum, p) => sum + (p._count?.teamMembers || 0), 0)}
          </p>
          <p className="text-sm text-gray-500">Участников</p>
        </div>
      </div>

      {/* Deadline Reminders */}
      {reminders && (reminders.critical?.length > 0 || reminders.urgent?.length > 0) && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-xl">
                <Bell className="text-red-600" size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Важные напоминания</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {reminders.critical?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide flex items-center gap-2 mb-2">
                    <XCircle size={16} />
                    Просроченные ({reminders.critical.length})
                  </h3>
                  {reminders.critical.slice(0, 5).map((task: any) => (
                    <div
                      key={task.taskId}
                      className="p-4 bg-red-50/50 border border-red-100 rounded-2xl cursor-pointer hover:border-red-300 hover:shadow-sm transition-all group"
                      onClick={() => router.push(`/services/scrum/${task.project.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 group-hover:text-red-700 transition-colors">{task.title}</p>
                          <p className="text-xs text-red-600/80 mt-1 font-medium">
                            {task.project.name} • Просрочено на {task.daysOverdue} {task.daysOverdue === 1 ? 'день' : 'дней'}
                          </p>
                        </div>
                        {task.assignee && (
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-red-600 font-bold text-xs shadow-sm border border-red-100">
                            {task.assignee.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reminders.urgent?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide flex items-center gap-2 mb-2">
                    <AlertCircle size={16} />
                    Срочные - сегодня ({reminders.urgent.length})
                  </h3>
                  {reminders.urgent.slice(0, 5).map((task: any) => (
                    <div
                      key={task.taskId}
                      className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl cursor-pointer hover:border-orange-300 hover:shadow-sm transition-all group"
                      onClick={() => router.push(`/services/scrum/${task.project.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{task.title}</p>
                          <p className="text-xs text-orange-600/80 mt-1 font-medium">
                            {task.project.name} • Дедлайн сегодня
                          </p>
                        </div>
                        {task.assignee && (
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-orange-600 font-bold text-xs shadow-sm border border-orange-100">
                            {task.assignee.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Мои проекты</h2>
            <p className="text-gray-500 mt-1">Управление активными проектами и командами</p>
          </div>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus size={18} />
            Новый проект
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 text-forte-primary animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Загрузка проектов...</p>
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/services/scrum/${project.id}`)}
                className="p-6 rounded-2xl border border-gray-100 hover:border-forte-primary/30 hover:shadow-lg transition-all cursor-pointer group bg-gray-50/50 hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:border-forte-primary/20 transition-colors">
                      <Briefcase size={24} className="text-forte-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-forte-primary transition-colors mb-1">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-gray-500 line-clamp-1 mb-3">{project.description}</p>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-100">
                          <Kanban size={14} className="text-gray-400" />
                          <span className="font-medium text-gray-700">
                            {project.tasks?.reduce((sum, t) => sum + (t._count?.subtasks || 0), 0) || 0} задач
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-100">
                          <Users size={14} className="text-gray-400" />
                          <span className="font-medium text-gray-700">{project._count?.teamMembers || 0} участников</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border",
                      project.status === 'ACTIVE'
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    )}>
                      {project.status === 'ACTIVE' ? 'Активен' : project.status}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:bg-forte-primary group-hover:border-forte-primary transition-all shadow-sm">
                      <ArrowRight size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
              <Kanban className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Нет активных проектов</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Создайте свой первый проект, чтобы начать управлять задачами и командой с помощью AI</p>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-8 py-4 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all inline-flex items-center gap-2 shadow-lg transform hover:-translate-y-0.5"
            >
              <Plus size={20} />
              Создать первый проект
            </button>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onSuccess={() => {
            setShowNewProjectModal(false)
            fetchProjects()
          }}
        />
      )}

      {/* Task Generator Modal */}
      {showTaskGeneratorModal && (
        <TaskGeneratorModal
          onClose={() => setShowTaskGeneratorModal(false)}
          projects={projects}
          onSuccess={() => {
            setShowTaskGeneratorModal(false)
            fetchProjects()
          }}
        />
      )}
    </div>
  )
}

// New Project Modal Component
function NewProjectModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/scrum/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      })

      if (response.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Новый проект</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <XCircle className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Название проекта *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Например: Система онлайн-банкинга"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 focus:border-forte-primary/50 transition-all outline-none font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Краткое описание проекта..."
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 focus:border-forte-primary/50 transition-all outline-none resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="flex-1 px-6 py-3.5 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Создание...
                </>
              ) : (
                'Создать проект'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Task Generator Modal Component
function TaskGeneratorModal({ onClose, projects, onSuccess }: {
  onClose: () => void
  projects: Project[]
  onSuccess: () => void
}) {
  const [projectId, setProjectId] = useState('')
  const [requirements, setRequirements] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!projectId || !requirements) return

    setLoading(true)
    try {
      const response = await fetch('/api/scrum/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, requirements })
      })

      if (response.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error generating tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-forte-gradient rounded-2xl shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Генерация задач из ТЗ</h2>
            <p className="text-sm text-gray-500 font-medium">AI автоматически создаст структуру задач</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 hover:bg-gray-100 rounded-full transition-colors">
            <XCircle className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Выберите проект *
            </label>
            <div className="relative">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 focus:border-forte-primary/50 transition-all outline-none appearance-none font-medium"
              >
                <option value="">-- Выберите проект --</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" size={20} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Техническое задание *
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={8}
              placeholder={`Опишите требования к проекту, например:

1. Регистрация и авторизация пользователей
2. Создание и редактирование задач
3. Назначение задач исполнителям
4. Канбан-доска для визуализации
...`}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 focus:border-forte-primary/50 transition-all outline-none font-mono text-sm resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
            <div className="p-1 bg-blue-100 rounded-lg h-fit">
              <Sparkles size={16} className="text-blue-600" />
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>AI автоматически:</strong> Создаст эпики и задачи, разобьет на подзадачи,
              оценит сложность и распределит по исполнителям.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Отмена
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !projectId || !requirements}
              className="flex-1 px-6 py-3.5 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Сгенерировать задачи
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
