
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

import {
    Video,
    Plus,
    Calendar,
    Users,
    FileText,
    Clock,
    Loader2,
    ArrowLeft,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Radio
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Meeting {
    id: string
    title: string
    type: string
    scheduledAt: string
    meetingUrl?: string
    meetingPlatform?: string
    meetingId?: string
    attendees?: string
    transcript?: string
    vexaBotStatus?: string
    vexaBotId?: string
    createdBy: string
    project: {
        name: string
    }
    notes: Array<{
        id: string
        content: string
        keyDecisions?: string
        actionItems?: string
        aiGenerated: boolean
        createdAt: string
    }>
}

interface Project {
    id: string
    name: string
}

export default function MeetingsPage() {
    const router = useRouter()
    const params = useParams()
    const projectId = params.id as string

    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [showNewMeetingModal, setShowNewMeetingModal] = useState(false)

    useEffect(() => {
        fetchMeetings()
        fetchProject()
    }, [])

    const fetchProject = async () => {
        try {
            const response = await fetch(`/api/scrum/projects/${projectId}`)
            const data = await response.json()
            setProject(data.project)
        } catch (error) {
            console.error('Error fetching project:', error)
        }
    }

    const fetchMeetings = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/scrum/meetings?projectId=${projectId}`)
            const data = await response.json()
            setMeetings(data.meetings || [])
        } catch (error) {
            console.error('Error fetching meetings:', error)
        } finally {
            setLoading(false)
        }
    }

    const getMeetingTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            'STANDUP': 'Stand-up',
            'PLANNING': 'Планирование',
            'RETRO': 'Ретроспектива',
            'REVIEW': 'Ревью',
            'OTHER': 'Другое'
        }
        return types[type] || type
    }

    const getMeetingTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'STANDUP': 'bg-blue-50 text-blue-700',
            'PLANNING': 'bg-purple-50 text-purple-700',
            'RETRO': 'bg-orange-50 text-orange-700',
            'REVIEW': 'bg-green-50 text-green-700',
            'OTHER': 'bg-gray-50 text-gray-700'
        }
        return colors[type] || 'bg-gray-50 text-gray-700'
    }

    return (
        <div className="p-8">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 text-white mb-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-forte-primary opacity-20 rounded-full blur-3xl -mr-20 -mt-20"></div>

                <div className="relative z-10">
                    <button
                        onClick={() => router.push(`/services/scrum/${projectId}`)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Назад к проекту</span>
                    </button>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">Встречи</h1>
                                <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wide border border-white/10">
                                    {project?.name || 'Загрузка...'}
                                </span>
                            </div>
                            <p className="text-gray-300 max-w-2xl text-lg leading-relaxed">
                                Планируйте встречи, записывайте транскрипты и получайте AI-аналитику автоматически.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowNewMeetingModal(true)}
                            className="px-6 py-3 bg-forte-primary hover:bg-forte-primary/90 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg"
                        >
                            <Plus size={20} />
                            Подключиться к встрече
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Video size={20} className="text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Всего встреч</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{meetings.length}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle2 size={20} className="text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">С транскриптом</p>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                        {meetings.filter(m => m.transcript).length}
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Sparkles size={20} className="text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">AI анализов</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-600">
                        {meetings.filter(m => m.notes.length > 0).length}
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Clock size={20} className="text-orange-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Предстоящих</p>
                    </div>
                    <p className="text-3xl font-bold text-orange-600">
                        {meetings.filter(m => new Date(m.scheduledAt) > new Date()).length}
                    </p>
                </div>
            </div>

            {/* Meetings List */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Все встречи</h2>

                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 text-forte-primary animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Загрузка встреч...</p>
                    </div>
                ) : meetings.length > 0 ? (
                    <div className="space-y-3">
                        {meetings.map((meeting) => {
                            const isPast = new Date(meeting.scheduledAt) < new Date()
                            const hasTranscript = !!meeting.transcript
                            const hasAnalysis = meeting.notes.length > 0

                            return (
                                <div
                                    key={meeting.id}
                                    onClick={() => router.push(`/services/scrum/${projectId}/meetings/${meeting.id}`)}
                                    className="p-5 rounded-2xl border-2 border-gray-100 hover:border-forte-primary/30 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-forte-primary transition-colors">
                                                    {meeting.title}
                                                </h3>
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                                    getMeetingTypeColor(meeting.type)
                                                )}>
                                                    {getMeetingTypeLabel(meeting.type)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    <span>
                                                        {new Date(meeting.scheduledAt).toLocaleDateString('ru-RU', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                {meeting.attendees && (
                                                    <div className="flex items-center gap-2">
                                                        <Users size={14} />
                                                        <span>{meeting.attendees}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {meeting.vexaBotStatus === 'active' && (
                                                <div className="flex items-center gap-1 text-blue-600 text-sm animate-pulse">
                                                    <Radio size={16} />
                                                    <span className="font-medium">Бот активен</span>
                                                </div>
                                            )}
                                            {meeting.vexaBotStatus === 'completed' && (
                                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                                    <CheckCircle2 size={16} />
                                                    <span className="font-medium">Записано</span>
                                                </div>
                                            )}
                                            {hasTranscript && (
                                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                                    <FileText size={16} />
                                                    <span className="font-medium">Транскрипт</span>
                                                </div>
                                            )}
                                            {hasAnalysis && (
                                                <div className="flex items-center gap-1 text-purple-600 text-sm">
                                                    <Sparkles size={16} />
                                                    <span className="font-medium">AI анализ</span>
                                                </div>
                                            )}
                                            {!isPast && (
                                                <div className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700">
                                                    Предстоит
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Нет встреч</h3>
                        <p className="text-gray-500 mb-6">Запланируйте первую встречу для проекта</p>
                        <button
                            onClick={() => setShowNewMeetingModal(true)}
                            className="px-6 py-3 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all inline-flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Подключиться к встрече
                        </button>
                    </div>
                )}
            </div>

            {/* New Meeting Modal */}
            {showNewMeetingModal && (
                <NewMeetingModal
                    projectId={projectId}
                    onClose={() => setShowNewMeetingModal(false)}
                    onSuccess={() => {
                        setShowNewMeetingModal(false)
                        fetchMeetings()
                    }}
                />
            )}
        </div>
    )
}

// New Meeting Modal Component
function NewMeetingModal({ projectId, onClose, onSuccess }: {
    projectId: string
    onClose: () => void
    onSuccess: () => void
}) {
    const [title, setTitle] = useState('')
    const [type, setType] = useState('STANDUP')
    const [scheduledAt, setScheduledAt] = useState('')
    const [meetingUrl, setMeetingUrl] = useState('')
    const [attendees, setAttendees] = useState('')
    const [loading, setLoading] = useState(false)
    const [connectBot, setConnectBot] = useState(true)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Create meeting
            const response = await fetch('/api/scrum/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    title,
                    type,
                    scheduledAt,
                    meetingUrl,
                    attendees
                })
            })

            if (!response.ok) {
                throw new Error('Failed to create meeting')
            }

            const data = await response.json()
            const meetingId = data.meeting.id

            // Connect bot if URL provided and option is checked
            if (meetingUrl && connectBot) {
                console.log('🤖 Connecting bot to meeting...')

                const botResponse = await fetch(`/api/scrum/meetings/${meetingId}/connect-bot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ meetingUrl })
                })

                if (!botResponse.ok) {
                    const errorData = await botResponse.json()
                    console.warn('⚠️ Failed to connect bot:', errorData.error)
                    setError(`Встреча создана, но не удалось подключить бота: ${errorData.error}`)
                    setTimeout(() => {
                        onSuccess()
                    }, 2000)
                    return
                }

                console.log('✅ Bot connected successfully')
            }

            onSuccess()
        } catch (error: any) {
            console.error('Error creating meeting:', error)
            setError(error.message || 'Ошибка при создании встречи')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Подключиться к встрече</h2>
                <p className="text-gray-600 text-sm mb-4">
                    Бот автоматически подключится, запишет и проанализирует встречу
                </p>

                {/* Info block about Vexa */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-100 rounded-xl p-3 mb-4">
                    <div className="flex items-start gap-2">
                        <div className="p-1.5 bg-blue-600 rounded-lg">
                            <Radio className="text-white" size={16} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-blue-900 mb-0.5">
                                AI-ассистент Forte.AI
                            </p>
                            <p className="text-xs text-blue-700">
                                Автоматическая запись, транскрибация, создание задач
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Название встречи *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="Например: Daily Stand-up"
                            className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Тип встречи *
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all text-sm"
                            >
                                <option value="STANDUP">Stand-up</option>
                                <option value="PLANNING">Планирование</option>
                                <option value="RETRO">Ретроспектива</option>
                                <option value="REVIEW">Ревью</option>
                                <option value="OTHER">Другое</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Дата и время *
                            </label>
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Ссылка на встречу (Google Meet или Teams) *
                        </label>
                        <input
                            type="url"
                            value={meetingUrl}
                            onChange={(e) => setMeetingUrl(e.target.value)}
                            required
                            placeholder="https://meet.google.com/..."
                            className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Поддерживается: Google Meet, Microsoft Teams
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Участники
                        </label>
                        <input
                            type="text"
                            value={attendees}
                            onChange={(e) => setAttendees(e.target.value)}
                            placeholder="Имена участников через запятую"
                            className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2.5 p-3 bg-blue-50 rounded-xl">
                        <input
                            type="checkbox"
                            id="connectBot"
                            checked={connectBot}
                            onChange={(e) => setConnectBot(e.target.checked)}
                            className="w-4 h-4 text-forte-primary rounded focus:ring-2 focus:ring-forte-primary/20"
                        />
                        <label htmlFor="connectBot" className="text-xs font-medium text-gray-700 cursor-pointer">
                            Автоматически подключить AI-бота к встрече
                        </label>
                    </div>

                    {error && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title || !scheduledAt || !meetingUrl}
                            className="flex-1 px-4 py-2.5 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {connectBot ? 'Подключение...' : 'Создание...'}
                                </>
                            ) : (
                                <>
                                    <Radio size={18} />
                                    Подключиться
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

