'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

import {
    ArrowLeft,
    TrendingUp,
    Users,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Calendar,
    Loader2,
    Sparkles,
    BarChart3,
    Video,
    Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SprintReport {
    summary: {
        projectName: string
        totalTasks: number
        completedTasks: number
        inProgressTasks: number
        todoTasks: number
        blockedTasks: number
        completionRate: number
        totalStoryPoints: number
        completedStoryPoints: number
        velocity: number
        aiGeneratedTasks: number
        aiGeneratedRatio: number
    }
    teamPerformance: Array<{
        memberId: string
        name: string
        role: string
        tasksAssigned: number
        tasksCompleted: number
        tasksInProgress: number
        completionRate: number
        storyPoints: number
        completedStoryPoints: number
    }>
    priorityBreakdown: {
        critical: number
        high: number
        medium: number
        low: number
    }
    typeBreakdown: {
        epic: number
        task: number
        bug: number
        feature: number
    }
    dailyProgress: Array<{
        date: string
        completed: number
        storyPoints: number
    }>
    burndownData: Array<{
        date: string
        actual: number
        ideal: number
    }>
    meetings: Array<{
        title: string
        type: string
        scheduledAt: string
        hasTranscript: boolean
    }>
    insights: string[]
}

export default function SprintReportPage() {
    const router = useRouter()
    const params = useParams()
    const projectId = params.id as string

    const [report, setReport] = useState<SprintReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        // Set default dates (last 14 days)
        const end = new Date()
        const start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000)

        setEndDate(end.toISOString().split('T')[0])
        setStartDate(start.toISOString().split('T')[0])

        fetchReport(start.toISOString(), end.toISOString())
    }, [])

    const fetchReport = async (start?: string, end?: string) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                projectId,
                ...(start && { startDate: start }),
                ...(end && { endDate: end })
            })
            const response = await fetch(`/api/scrum/reports/sprint?${params}`)
            const data = await response.json()
            setReport(data.report)
        } catch (error) {
            console.error('Error fetching sprint report:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDateChange = () => {
        if (startDate && endDate) {
            fetchReport(
                new Date(startDate).toISOString(),
                new Date(endDate).toISOString()
            )
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-forte-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Генерация отчета...</p>
                </div>
            </div>
        )
    }

    if (!report) {
        return (
            <div className="p-8">
                <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Не удалось загрузить отчет</h2>
                </div>
            </div>
        )
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

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">Отчет по спринту</h1>
                                <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wide border border-white/10">
                                    {report.summary.projectName}
                                </span>
                            </div>
                            <p className="text-gray-300 max-w-2xl text-lg leading-relaxed">
                                Аналитика производительности команды, прогресс по задачам и AI-инсайты.
                            </p>
                        </div>

                        {/* Date Range Selector */}
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                            <div className="flex items-center gap-2 px-2">
                                <Calendar size={16} className="text-gray-300" />
                                <span className="text-sm font-medium text-gray-300">Период:</span>
                            </div>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-forte-primary/50"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-forte-primary/50"
                            />
                            <button
                                onClick={handleDateChange}
                                className="px-4 py-2 bg-forte-primary hover:bg-forte-primary/90 text-white rounded-lg font-bold transition-all shadow-lg"
                            >
                                Обновить
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-5 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <CheckCircle2 size={20} className="text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Всего задач</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{report.summary.totalTasks}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-green-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle2 size={20} className="text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Выполнено</p>
                    </div>
                    <p className="text-3xl font-bold text-green-600">{report.summary.completedTasks}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        {report.summary.completionRate.toFixed(1)}% завершено
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-orange-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <TrendingUp size={20} className="text-orange-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Velocity</p>
                    </div>
                    <p className="text-3xl font-bold text-orange-600">{report.summary.velocity}</p>
                    <p className="text-sm text-gray-500 mt-2">story points</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-purple-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Sparkles size={20} className="text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">AI задачи</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-600">{report.summary.aiGeneratedTasks}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        {report.summary.aiGeneratedRatio.toFixed(0)}% от общего
                    </p>
                </div>

                {report.summary.blockedTasks > 0 && (
                    <div className="bg-white rounded-2xl p-6 border-2 border-red-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-50 rounded-lg">
                                <AlertTriangle size={20} className="text-red-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-600">Заблокировано</p>
                        </div>
                        <p className="text-3xl font-bold text-red-600">{report.summary.blockedTasks}</p>
                    </div>
                )}
            </div>

            {/* Insights */}
            {report.insights.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-6 border-2 border-blue-100 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles className="text-purple-600" size={24} />
                        AI Insights
                    </h2>
                    <div className="space-y-2">
                        {report.insights.map((insight, index) => (
                            <p key={index} className="text-gray-700 font-medium">{insight}</p>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Team Performance */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Trophy className="text-yellow-600" size={24} />
                        Производительность команды
                    </h2>
                    <div className="space-y-4">
                        {report.teamPerformance.map((member, index) => (
                            <div key={member.memberId} className="p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="font-bold text-gray-900">{member.name}</p>
                                        <p className="text-sm text-gray-500">{member.role}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-forte-primary">
                                            {member.completionRate.toFixed(0)}%
                                        </p>
                                        <p className="text-xs text-gray-500">выполнено</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <span>{member.tasksCompleted}/{member.tasksAssigned} задач</span>
                                    <span>•</span>
                                    <span>{member.completedStoryPoints.toFixed(1)} SP</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Priority & Type Breakdown */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Приоритеты</h2>
                        <div className="space-y-3">
                            {Object.entries(report.priorityBreakdown).map(([priority, count]) => (
                                <div key={priority} className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700 capitalize">{priority}</span>
                                    <span className="text-2xl font-bold text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Типы задач</h2>
                        <div className="space-y-3">
                            {Object.entries(report.typeBreakdown).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700 capitalize">{type}</span>
                                    <span className="text-2xl font-bold text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Progress */}
            {report.dailyProgress.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Ежедневный прогресс</h2>
                    <div className="space-y-2">
                        {report.dailyProgress.map((day) => (
                            <div key={day.date} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600 w-32">
                                    {new Date(day.date).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'short'
                                    })}
                                </span>
                                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                                    {day.completed > 0 && (
                                        <div
                                            className="absolute inset-y-0 left-0 bg-forte-gradient rounded-full flex items-center justify-end pr-3"
                                            style={{ width: `${Math.min(day.completed * 20, 100)}%` }}
                                        >
                                            <span className="text-xs font-bold text-white">
                                                {day.completed}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm text-gray-500 w-24 text-right">
                                    {day.storyPoints.toFixed(1)} SP
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Meetings */}
            {report.meetings.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Video className="text-blue-600" size={24} />
                        Встречи за период
                    </h2>
                    <div className="space-y-3">
                        {report.meetings.map((meeting, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-gray-900">{meeting.title}</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(meeting.scheduledAt).toLocaleDateString('ru-RU', {
                                            day: 'numeric',
                                            month: 'long',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                {meeting.hasTranscript && (
                                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                                        С транскриптом
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
