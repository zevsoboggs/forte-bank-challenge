'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

import {
    Video,
    ArrowLeft,
    Calendar,
    Users,
    Link as LinkIcon,
    FileText,
    Upload,
    Loader2,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    MessageSquare,
    Clock,
    Radio,
    RefreshCw,
    StopCircle
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
    summary?: string
    keyDecisions?: Array<{
        decision: string
        context: string
    }>
    actionItems?: Array<{
        task: string
        assignee: string | null
        priority: string
        deadline: string | null
    }>
    vexaBotStatus?: string
    vexaBotId?: string
    createdBy: string
    project: {
        id: string
        name: string
    }
    notes: Array<{
        id: string
        content: string
        speaker?: string
        isDecision: boolean
        isAction: boolean
        timestamp: string
        createdAt: string
    }>
}

export default function MeetingDetailPage() {
    const router = useRouter()
    const params = useParams()
    const projectId = params.id as string
    const meetingId = params.meetingId as string

    const [meeting, setMeeting] = useState<Meeting | null>(null)
    const [loading, setLoading] = useState(true)
    const [transcribing, setTranscribing] = useState(false)
    const [fetchingTranscript, setFetchingTranscript] = useState(false)
    const [stoppingBot, setStoppingBot] = useState(false)
    const [showTranscriptModal, setShowTranscriptModal] = useState(false)

    useEffect(() => {
        fetchMeeting()
    }, [])

    // Auto-check bot status when meeting loads
    useEffect(() => {
        if (!meeting) return

        const shouldCheckStatus = meeting.vexaBotStatus === 'requesting' || meeting.vexaBotStatus === 'active'

        if (shouldCheckStatus) {
            console.log('🔄 Auto-checking bot status...')

            const checkStatus = async () => {
                try {
                    const response = await fetch(`/api/scrum/meetings/${meetingId}/connect-bot`, {
                        method: 'GET'
                    })

                    if (response.ok) {
                        const data = await response.json()
                        if (data.fullTranscript) {
                            console.log('✅ Transcript ready! Auto-analyzed.')
                            // Wait a bit for analysis to complete
                            setTimeout(async () => {
                                await fetchMeeting()
                            }, 1000)
                        }
                    }
                } catch (error) {
                    console.error('Error auto-checking status:', error)
                }
            }

            // Check after 2 seconds
            const timer = setTimeout(checkStatus, 2000)
            return () => clearTimeout(timer)
        }
    }, [meeting, meetingId])

    // Poll for updates if bot is active
    useEffect(() => {
        if (!meeting) return

        if (meeting.vexaBotStatus === 'active') {
            console.log('🔄 Polling for updates every 30 seconds...')

            const pollInterval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/scrum/meetings/${meetingId}/connect-bot`, {
                        method: 'GET'
                    })

                    if (response.ok) {
                        const data = await response.json()
                        if (data.status === 'completed') {
                            console.log('✅ Meeting completed, reloading...')
                            await fetchMeeting()
                        }
                    }
                } catch (error) {
                    console.error('Error polling status:', error)
                }
            }, 30000) // Every 30 seconds

            return () => clearInterval(pollInterval)
        }
    }, [meeting, meetingId])

    const fetchMeeting = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/scrum/meetings/${meetingId}`)
            const data = await response.json()
            setMeeting(data.meeting)
        } catch (error) {
            console.error('Error fetching meeting:', error)
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

    const handleFetchTranscript = async () => {
        if (!meeting) return

        setFetchingTranscript(true)
        try {
            const response = await fetch(`/api/scrum/meetings/${meetingId}/connect-bot`, {
                method: 'GET'
            })

            if (response.ok) {
                const data = await response.json()
                if (data.fullTranscript) {
                    // Transcript received, now analyze it
                    console.log('📝 Transcript fetched, analyzing...')
                    await handleAnalyzeTranscript(data.fullTranscript)
                } else {
                    alert('Транскрипт еще не готов. Попробуйте позже.')
                }
            } else {
                const error = await response.json()
                alert('Ошибка: ' + error.error)
            }
        } catch (error) {
            console.error('Error fetching transcript:', error)
            alert('Произошла ошибка при получении транскрипта')
        } finally {
            setFetchingTranscript(false)
        }
    }

    const handleAnalyzeTranscript = async (transcriptText: string) => {
        try {
            const formData = new FormData()
            formData.append('transcript', transcriptText)

            const response = await fetch(`/api/scrum/meetings/${meetingId}/transcribe`, {
                method: 'POST',
                body: formData
            })

            if (response.ok) {
                console.log('✅ Analysis complete')
                await fetchMeeting()
            } else {
                const error = await response.json()
                alert('Ошибка анализа: ' + error.error)
            }
        } catch (error) {
            console.error('Error analyzing transcript:', error)
            alert('Произошла ошибка при анализе')
        }
    }

    const handleStopBot = async () => {
        if (!meeting || !confirm('Остановить запись встречи?')) return

        setStoppingBot(true)
        try {
            const response = await fetch(`/api/scrum/meetings/${meetingId}/connect-bot`, {
                method: 'DELETE'
            })

            if (response.ok) {
                console.log('✅ Bot stopped')
                await fetchMeeting()
                // Automatically fetch and analyze transcript
                setTimeout(() => handleFetchTranscript(), 1000)
            } else {
                const error = await response.json()
                alert('Ошибка: ' + error.error)
            }
        } catch (error) {
            console.error('Error stopping bot:', error)
            alert('Произошла ошибка при остановке бота')
        } finally {
            setStoppingBot(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-forte-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Загрузка встречи...</p>
                </div>
            </div>
        )
    }

    if (!meeting) {
        return (
            <div className="p-8">
                <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Встреча не найдена</h2>
                    <button
                        onClick={() => router.push(`/services/scrum/${projectId}/meetings`)}
                        className="mt-4 px-6 py-3 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all"
                    >
                        Назад к встречам
                    </button>
                </div>
            </div>
        )
    }

    const keyDecisions = meeting.keyDecisions || []
    const actionItems = meeting.actionItems || []
    const hasAnalysis = !!meeting.summary

    return (
        <div className="p-8">
            <div className="mb-6">
                <button
                    onClick={() => router.push(`/services/scrum/${projectId}/meetings`)}
                    className="flex items-center gap-2 text-gray-600 hover:text-forte-primary transition-colors mb-4"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Назад к встречам</span>
                </button>

                <div className="flex items-center gap-3">
                    <div className="p-3 bg-forte-gradient rounded-xl shadow-forte">
                        <Video className="text-white" size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{meeting.title}</h1>
                        <p className="text-gray-500 text-sm mt-1">{meeting.project.name}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Meeting Info Card */}
                <div className="col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Информация о встрече</h2>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Calendar size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Дата и время</p>
                                <p className="font-medium text-gray-900">
                                    {new Date(meeting.scheduledAt).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <FileText size={20} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Тип встречи</p>
                                <p className="font-medium text-gray-900">{getMeetingTypeLabel(meeting.type)}</p>
                            </div>
                        </div>

                        {meeting.attendees && (
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <Users size={20} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Участники</p>
                                    <p className="font-medium text-gray-900">{meeting.attendees}</p>
                                </div>
                            </div>
                        )}

                        {meeting.meetingUrl && (
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 rounded-lg">
                                    <LinkIcon size={20} className="text-orange-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-500">Ссылка</p>
                                    <a
                                        href={meeting.meetingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-forte-primary hover:underline truncate block"
                                    >
                                        {meeting.meetingUrl}
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bot Status and Controls */}
                    {meeting.vexaBotStatus && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            {/* Bot Status Indicator */}
                            <div className={cn(
                                "p-4 rounded-xl border-2 mb-4",
                                meeting.vexaBotStatus === 'active' ? "bg-blue-50 border-blue-200" :
                                    meeting.vexaBotStatus === 'completed' ? "bg-green-50 border-green-200" :
                                        meeting.vexaBotStatus === 'failed' ? "bg-red-50 border-red-200" :
                                            "bg-gray-50 border-gray-200"
                            )}>
                                <div className="flex items-center gap-3">
                                    {meeting.vexaBotStatus === 'active' && (
                                        <>
                                            <Radio className="text-blue-600 animate-pulse" size={24} />
                                            <div className="flex-1">
                                                <p className="font-bold text-blue-900">Бот активен</p>
                                                <p className="text-sm text-blue-700">Встреча записывается</p>
                                            </div>
                                        </>
                                    )}
                                    {meeting.vexaBotStatus === 'completed' && (
                                        <>
                                            <CheckCircle2 className="text-green-600" size={24} />
                                            <div className="flex-1">
                                                <p className="font-bold text-green-900">Запись завершена</p>
                                                <p className="text-sm text-green-700">Транскрипт готов к анализу</p>
                                            </div>
                                        </>
                                    )}
                                    {meeting.vexaBotStatus === 'requesting' && (
                                        <>
                                            <Loader2 className="text-gray-600 animate-spin" size={24} />
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">Подключение бота...</p>
                                                <p className="text-sm text-gray-700">Ожидайте</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {meeting.meetingPlatform && (
                                    <div className="mt-3 pt-3 border-t border-current/10">
                                        <p className="text-xs text-gray-600">
                                            Платформа: <span className="font-mono">{meeting.meetingPlatform === 'google_meet' ? 'Google Meet' : 'Microsoft Teams'}</span>
                                            {meeting.meetingId && <> • ID: <span className="font-mono">{meeting.meetingId}</span></>}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Bot Controls */}
                            {meeting.vexaBotStatus === 'active' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleFetchTranscript}
                                        disabled={fetchingTranscript}
                                        className="px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {fetchingTranscript ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Получение...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw size={18} />
                                                Получить транскрипт
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleStopBot}
                                        disabled={stoppingBot}
                                        className="px-4 py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {stoppingBot ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Остановка...
                                            </>
                                        ) : (
                                            <>
                                                <StopCircle size={18} />
                                                Остановить запись
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {meeting.vexaBotStatus === 'completed' && !meeting.transcript && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                        <p className="text-sm text-blue-800">
                                            💡 Транскрипт и анализ загружаются автоматически...
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleFetchTranscript}
                                        disabled={fetchingTranscript}
                                        className="w-full px-6 py-4 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {fetchingTranscript ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Получение и анализ...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={20} />
                                                Загрузить вручную
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {!meeting.transcript && !meeting.vexaBotStatus && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button
                                onClick={() => setShowTranscriptModal(true)}
                                className="w-full px-6 py-4 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all flex items-center justify-center gap-2"
                            >
                                <Upload size={20} />
                                Загрузить аудио или транскрипт
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Card */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <CheckCircle2 size={20} className="text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-600">Транскрипт</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {meeting.transcript ? 'Есть' : 'Нет'}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <Sparkles size={20} className="text-purple-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-600">AI анализ</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {meeting.notes.length > 0 ? 'Готов' : 'Нет'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Transcript Section */}
            {meeting.transcript && (
                <>
                    {!hasAnalysis && (
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-orange-600 mt-0.5" size={20} />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-orange-900 mb-1">
                                        Транскрипт готов, но AI анализ не выполнен
                                    </p>
                                    <p className="text-xs text-orange-700">
                                        Нажмите кнопку "Проанализировать AI" справа от заголовка, чтобы создать резюме и задачи
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FileText size={24} />
                                Транскрипт встречи
                            </h2>
                            {!hasAnalysis && (
                                <button
                                    onClick={async () => {
                                        if (!meeting.transcript) return
                                        setTranscribing(true)
                                        try {
                                            const formData = new FormData()
                                            formData.append('transcript', meeting.transcript)

                                            const response = await fetch(`/api/scrum/meetings/${meetingId}/transcribe`, {
                                                method: 'POST',
                                                body: formData
                                            })

                                            if (response.ok) {
                                                await fetchMeeting()
                                            } else {
                                                alert('Ошибка анализа')
                                            }
                                        } catch (error) {
                                            console.error('Error:', error)
                                            alert('Ошибка анализа')
                                        } finally {
                                            setTranscribing(false)
                                        }
                                    }}
                                    disabled={transcribing}
                                    className="px-4 py-2 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {transcribing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Анализ...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            Проанализировать AI
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 max-h-96 overflow-y-auto">
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {meeting.transcript}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* AI Analysis Section */}
            {hasAnalysis && (
                <>
                    {/* Summary */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Sparkles size={24} className="text-purple-600" />
                            Резюме встречи
                        </h2>
                        <p className="text-gray-700 leading-relaxed">{meeting.summary}</p>
                    </div>

                    {/* Key Decisions */}
                    {keyDecisions.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <CheckCircle2 size={24} className="text-green-600" />
                                Ключевые решения
                            </h2>
                            <div className="space-y-4">
                                {keyDecisions.map((decision: any, index: number) => (
                                    <div key={index} className="p-4 bg-green-50 rounded-xl border-2 border-green-100">
                                        <p className="font-bold text-gray-900 mb-2">{decision.decision}</p>
                                        <p className="text-sm text-gray-600">{decision.context}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Items */}
                    {actionItems.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock size={24} className="text-orange-600" />
                                Экшн-айтемы
                            </h2>
                            <div className="space-y-3">
                                {actionItems.map((item: any, index: number) => (
                                    <div key={index} className="p-4 bg-orange-50 rounded-xl border-2 border-orange-100 flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900 mb-1">{item.task}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                                {item.assignee && (
                                                    <span className="flex items-center gap-1">
                                                        <Users size={14} />
                                                        {item.assignee}
                                                    </span>
                                                )}
                                                {item.deadline && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={14} />
                                                        {new Date(item.deadline).toLocaleDateString('ru-RU')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                            item.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                                                item.priority === 'LOW' ? 'bg-gray-100 text-gray-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                        )}>
                                            {item.priority}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Transcript Upload Modal */}
            {showTranscriptModal && (
                <TranscriptUploadModal
                    meetingId={meetingId}
                    onClose={() => setShowTranscriptModal(false)}
                    onSuccess={() => {
                        setShowTranscriptModal(false)
                        fetchMeeting()
                    }}
                />
            )}
        </div>
    )
}

// Transcript Upload Modal Component
function TranscriptUploadModal({ meetingId, onClose, onSuccess }: {
    meetingId: string
    onClose: () => void
    onSuccess: () => void
}) {
    const [method, setMethod] = useState<'text' | 'audio'>('text')
    const [transcript, setTranscript] = useState('')
    const [audioFile, setAudioFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setUploading(true)

        try {
            const formData = new FormData()

            if (method === 'text' && transcript) {
                formData.append('transcript', transcript)
            } else if (method === 'audio' && audioFile) {
                formData.append('audio', audioFile)
            }

            const response = await fetch(`/api/scrum/meetings/${meetingId}/transcribe`, {
                method: 'POST',
                body: formData
            })

            if (response.ok) {
                onSuccess()
            } else {
                const error = await response.json()
                alert('Ошибка: ' + error.error)
            }
        } catch (error) {
            console.error('Error uploading transcript:', error)
            alert('Произошла ошибка при загрузке')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-forte-gradient rounded-xl">
                        <Sparkles className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Загрузить транскрипт</h2>
                        <p className="text-sm text-gray-500">AI автоматически проанализирует встречу</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Выберите способ загрузки
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMethod('text')}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all",
                                    method === 'text'
                                        ? 'border-forte-primary bg-forte-primary/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                )}
                            >
                                <FileText className="w-8 h-8 mx-auto mb-2 text-forte-primary" />
                                <p className="font-bold text-gray-900">Вставить текст</p>
                                <p className="text-xs text-gray-500 mt-1">Если уже есть транскрипт</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('audio')}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all",
                                    method === 'audio'
                                        ? 'border-forte-primary bg-forte-primary/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                )}
                            >
                                <Upload className="w-8 h-8 mx-auto mb-2 text-forte-primary" />
                                <p className="font-bold text-gray-900">Загрузить аудио</p>
                                <p className="text-xs text-gray-500 mt-1">AI создаст транскрипт</p>
                            </button>
                        </div>
                    </div>

                    {method === 'text' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Текст транскрипта *
                            </label>
                            <textarea
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                                rows={12}
                                required
                                placeholder="Вставьте транскрипт встречи..."
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 transition-all font-mono text-sm"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Аудио файл *
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="audio-upload"
                                    required
                                />
                                <label
                                    htmlFor="audio-upload"
                                    className="cursor-pointer inline-block px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                                >
                                    Выбрать файл
                                </label>
                                {audioFile && (
                                    <p className="mt-3 text-sm text-gray-600">
                                        Выбран: {audioFile.name}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 mt-3">
                                    Поддерживаемые форматы: MP3, WAV, M4A, WebM
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
                        <p className="text-sm text-blue-800">
                            💡 <strong>AI автоматически:</strong> Извлечет ключевые решения, создаст экшн-айтемы,
                            определит ответственных и создаст задачи в проекте
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={uploading}
                            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={uploading || (method === 'text' && !transcript) || (method === 'audio' && !audioFile)}
                            className="flex-1 px-6 py-3 bg-forte-gradient text-white rounded-xl font-bold hover:shadow-forte transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Обработка...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Загрузить и проанализировать
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
