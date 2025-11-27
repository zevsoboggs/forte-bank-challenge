'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import {
    Key,
    Webhook,
    Plus,
    Trash2,
    Copy,
    CheckCircle,
    Shield,
    Globe,
    Activity
} from 'lucide-react'

export default function DeveloperSettingsPage() {
    const [keys, setKeys] = useState([])
    const [webhooks, setWebhooks] = useState([])
    const [loading, setLoading] = useState(true)
    const [newKeyName, setNewKeyName] = useState('')
    const [newWebhookUrl, setNewWebhookUrl] = useState('')
    const [createdKey, setCreatedKey] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [keysRes, webhooksRes] = await Promise.all([
                fetch('/api/keys'),
                fetch('/api/webhooks')
            ])

            if (keysRes.ok) setKeys(await keysRes.json())
            if (webhooksRes.ok) setWebhooks(await webhooksRes.json())
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error)
        } finally {
            setLoading(false)
        }
    }

    const createKey = async () => {
        if (!newKeyName) return
        try {
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName, scopes: ['read', 'write'] })
            })
            if (res.ok) {
                const data = await res.json()
                setCreatedKey(data.key)
                setNewKeyName('')
                fetchData()
            }
        } catch (error) {
            console.error('Ошибка создания ключа:', error)
        }
    }

    const deleteKey = async (id: string) => {
        if (!confirm('Вы уверены?')) return
        try {
            await fetch(`/api/keys?id=${id}`, { method: 'DELETE' })
            fetchData()
        } catch (error) {
            console.error('Ошибка удаления ключа:', error)
        }
    }

    const createWebhook = async () => {
        if (!newWebhookUrl) return
        try {
            const res = await fetch('/api/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: newWebhookUrl,
                    events: ['transaction.created', 'fraud.detected']
                })
            })
            if (res.ok) {
                setNewWebhookUrl('')
                fetchData()
            }
        } catch (error) {
            console.error('Ошибка создания вебхука:', error)
        }
    }

    const deleteWebhook = async (id: string) => {
        if (!confirm('Вы уверены?')) return
        try {
            await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' })
            fetchData()
        } catch (error) {
            console.error('Ошибка удаления вебхука:', error)
        }
    }

    return (
        <DashboardLayout>
            <div className="p-8 max-w-[1600px] mx-auto">
                <div className="mb-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Настройки разработчика</h1>
                    <p className="text-gray-500">Управление API ключами и вебхуками для интеграции.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* API Keys Section */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                    <Key size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">API Ключи</h2>
                            </div>
                        </div>

                        {/* Create Key Form */}
                        <div className="flex gap-3 mb-8">
                            <input
                                type="text"
                                placeholder="Название ключа (например, Мобильное приложение)"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                                onClick={createKey}
                                disabled={!newKeyName}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Created Key Display */}
                        {createdKey && (
                            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-xl">
                                <p className="text-green-800 text-sm font-bold mb-2">Новый API ключ создан (Скопируйте его сейчас!)</p>
                                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-green-100">
                                    <code className="font-mono text-green-700">{createdKey}</code>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(createdKey)}
                                        className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Keys List */}
                        <div className="space-y-4">
                            {keys.map((key: any) => (
                                <div key={key.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{key.name}</h3>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {key.key.slice(0, 8)}...{key.key.slice(-4)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-gray-400">
                                            {key.lastUsed ? `Исп.: ${new Date(key.lastUsed).toLocaleDateString()}` : 'Не использован'}
                                        </span>
                                        <button
                                            onClick={() => deleteKey(key.id)}
                                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Webhooks Section */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                                    <Webhook size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Вебхуки</h2>
                            </div>
                        </div>

                        {/* Create Webhook Form */}
                        <div className="flex gap-3 mb-8">
                            <input
                                type="text"
                                placeholder="URL Эндпоинта (https://...)"
                                value={newWebhookUrl}
                                onChange={(e) => setNewWebhookUrl(e.target.value)}
                                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <button
                                onClick={createWebhook}
                                disabled={!newWebhookUrl}
                                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Webhooks List */}
                        <div className="space-y-4">
                            {webhooks.map((webhook: any) => (
                                <div key={webhook.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Globe size={16} className="text-gray-400" />
                                            <h3 className="font-bold text-gray-900 truncate max-w-[200px]">{webhook.url}</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-xs font-bold",
                                                webhook.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                                            )}>
                                                {webhook.isActive ? 'Активен' : 'Неактивен'}
                                            </span>
                                            <button
                                                onClick={() => deleteWebhook(webhook.id)}
                                                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {webhook.events.map((event: string) => (
                                            <span key={event} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 font-mono">
                                                {event}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                                        <span className="text-xs text-gray-400 font-mono">Секрет: {webhook.secret.slice(0, 8)}...</span>
                                        <button className="text-xs text-purple-600 font-bold hover:underline">
                                            Логи
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Documentation Link */}
                <div className="mt-8 bg-gray-900 rounded-3xl p-8 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-white/10 rounded-2xl">
                            <Activity size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold mb-1">Документация API</h2>
                            <p className="text-gray-400">Интерактивный Swagger UI для тестирования эндпоинтов.</p>
                        </div>
                    </div>
                    <a
                        href="/api-docs"
                        target="_blank"
                        className="px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                    >
                        Открыть документацию
                    </a>
                </div>
            </div>
        </DashboardLayout>
    )
}

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ')
}
