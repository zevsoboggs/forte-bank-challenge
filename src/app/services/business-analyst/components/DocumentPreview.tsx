'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Copy, Loader2, Sparkles, Send, Archive, Eye } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface DocumentPreviewProps {
    sessionId: string | null
}

interface SavedDocument {
    id: string
    title: string
    type: 'BRD' | 'USER_STORIES' | 'USE_CASES'
    content: string
    createdAt: string
}

export default function DocumentPreview({ sessionId }: DocumentPreviewProps) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'BRD' | 'USER_STORIES' | 'USE_CASES'>('BRD')
    const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([])
    const [showSaved, setShowSaved] = useState(false)
    const [viewingDocument, setViewingDocument] = useState<SavedDocument | null>(null)

    const generateDocument = async (type: 'BRD' | 'USER_STORIES' | 'USE_CASES') => {
        if (!sessionId) return

        setLoading(true)
        setActiveTab(type)

        try {
            const response = await fetch('/api/analyst/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, type })
            })

            const data = await response.json()
            setContent(data.content)
        } catch (error) {
            console.error('Failed to generate document:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (sessionId) {
            fetchSavedDocuments()
        }
    }, [sessionId])

    const fetchSavedDocuments = async () => {
        if (!sessionId) return

        try {
            const response = await fetch(`/api/analyst/export-confluence?sessionId=${sessionId}`)
            if (response.ok) {
                const data = await response.json()
                setSavedDocuments(data.documents)
            }
        } catch (error) {
            console.error('Failed to fetch saved documents:', error)
        }
    }

    const saveDocument = async () => {
        if (!content || !sessionId) return

        setSaving(true)
        try {
            const response = await fetch('/api/analyst/export-confluence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    title: `${activeTab} - ${new Date().toLocaleDateString('ru-RU')}`,
                    type: activeTab,
                    sessionId
                })
            })

            if (response.ok) {
                const data = await response.json()
                alert(`✅ ${data.message}`)
                fetchSavedDocuments()
            } else {
                const error = await response.json()
                alert(`Ошибка сохранения: ${error.error || 'Неизвестная ошибка'}`)
            }
        } catch (error) {
            console.error('Failed to save document:', error)
            alert('Произошла ошибка при сохранении документа')
        } finally {
            setSaving(false)
        }
    }

    const viewDocument = (doc: SavedDocument) => {
        setViewingDocument(doc)
        setContent(doc.content)
        setActiveTab(doc.type)
        setShowSaved(false)
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">Документация</h2>
                        <p className="text-xs text-gray-500">Генерация артефактов</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSaved(!showSaved)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                        title="Сохраненные документы"
                    >
                        <Archive size={16} />
                        Сохраненные ({savedDocuments.length})
                    </button>
                    <button
                        onClick={saveDocument}
                        disabled={!content || saving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Сохранить документ"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Сохранение...
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                Сохранить
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => navigator.clipboard.writeText(content)}
                        className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                        title="Копировать"
                        disabled={!content}
                    >
                        <Copy size={18} />
                    </button>
                </div>
            </div>

            <div className="p-4 border-b border-gray-100 bg-white flex gap-2 overflow-x-auto">
                <button
                    onClick={() => generateDocument('BRD')}
                    disabled={!sessionId || loading}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'BRD'
                            ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    {loading && activeTab === 'BRD' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    BRD
                </button>
                <button
                    onClick={() => generateDocument('USER_STORIES')}
                    disabled={!sessionId || loading}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'USER_STORIES'
                            ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    {loading && activeTab === 'USER_STORIES' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    User Stories
                </button>
                <button
                    onClick={() => generateDocument('USE_CASES')}
                    disabled={!sessionId || loading}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'USE_CASES'
                            ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    {loading && activeTab === 'USE_CASES' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Use Cases
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar relative">
                {showSaved && savedDocuments.length > 0 && (
                    <div className="absolute inset-0 bg-white z-10 p-6 overflow-y-auto">
                        <div className="max-w-4xl mx-auto">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Сохраненные документы</h3>
                            <div className="space-y-3">
                                {savedDocuments.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => viewDocument(doc)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileText size={16} className="text-blue-600" />
                                                    <h4 className="font-bold text-gray-900">{doc.title}</h4>
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                                        {doc.type}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(doc.createdAt).toLocaleString('ru-RU')}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    viewDocument(doc)
                                                }}
                                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                title="Просмотреть"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {content ? (
                    <div className="max-w-4xl mx-auto">
                        <ReactMarkdown
                            components={{
                                h1: ({ children }) => (
                                    <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0 pb-2 border-b-2 border-gray-200">
                                        {children}
                                    </h1>
                                ),
                                h2: ({ children }) => (
                                    <h2 className="text-xl font-bold text-gray-900 mb-3 mt-5 first:mt-0">
                                        {children}
                                    </h2>
                                ),
                                h3: ({ children }) => (
                                    <h3 className="text-lg font-bold text-gray-800 mb-2 mt-4 first:mt-0">
                                        {children}
                                    </h3>
                                ),
                                h4: ({ children }) => (
                                    <h4 className="text-base font-bold text-gray-800 mb-2 mt-3">
                                        {children}
                                    </h4>
                                ),
                                p: ({ children }) => (
                                    <p className="text-gray-700 leading-relaxed mb-4">
                                        {children}
                                    </p>
                                ),
                                ul: ({ children }) => (
                                    <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-700">
                                        {children}
                                    </ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="list-decimal pl-6 space-y-2 mb-4 text-gray-700">
                                        {children}
                                    </ol>
                                ),
                                li: ({ children }) => (
                                    <li className="leading-relaxed">
                                        {children}
                                    </li>
                                ),
                                strong: ({ children }) => (
                                    <strong className="font-bold text-gray-900">
                                        {children}
                                    </strong>
                                ),
                                em: ({ children }) => (
                                    <em className="italic text-gray-800">
                                        {children}
                                    </em>
                                ),
                                code: ({ children }) => (
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                                        {children}
                                    </code>
                                ),
                                pre: ({ children }) => (
                                    <pre className="bg-gray-50 p-4 rounded-xl overflow-x-auto mb-4 border border-gray-200">
                                        {children}
                                    </pre>
                                ),
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 rounded-r-lg">
                                        {children}
                                    </blockquote>
                                ),
                                table: ({ children }) => (
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full border-collapse border border-gray-300">
                                            {children}
                                        </table>
                                    </div>
                                ),
                                thead: ({ children }) => (
                                    <thead className="bg-gray-100">
                                        {children}
                                    </thead>
                                ),
                                th: ({ children }) => (
                                    <th className="border border-gray-300 px-4 py-2 text-left font-bold text-gray-900">
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => (
                                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                                        {children}
                                    </td>
                                ),
                                hr: () => (
                                    <hr className="my-6 border-t-2 border-gray-200" />
                                ),
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-8">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p className="max-w-xs">Выберите тип документа сверху, чтобы сгенерировать его на основе диалога.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
