'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface ChatInterfaceProps {
    sessionId: string | null
    setSessionId: (id: string) => void
    onMessageSent: () => void
}

export default function ChatInterface({ sessionId, setSessionId, onMessageSent }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setLoading(true)

        try {
            const response = await fetch('/api/analyst/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage, sessionId })
            })

            const data = await response.json()

            if (data.sessionId && !sessionId) {
                setSessionId(data.sessionId)
            }

            setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
            onMessageSent()
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-forte-primary/10 flex items-center justify-center text-forte-primary">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">AI Business Analyst</h2>
                        <p className="text-xs text-gray-500">Помощник по сбору требований</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        <Bot size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Начните диалог, чтобы обсудить ваши требования.</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex gap-3 max-w-[85%]",
                            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            msg.role === 'user' ? "bg-gray-900 text-white" : "bg-forte-primary text-white"
                        )}>
                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={cn(
                            "p-3 rounded-2xl text-sm leading-relaxed",
                            msg.role === 'user'
                                ? "bg-gray-900 text-white rounded-tr-none"
                                : "bg-gray-100 text-gray-800 rounded-tl-none"
                        )}>
                            {msg.role === 'assistant' ? (
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-3 last:mb-0 text-gray-800 leading-relaxed">{children}</p>,
                                        strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                                        em: ({ children }) => <em className="italic">{children}</em>,
                                        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                                        li: ({ children }) => <li className="text-gray-800 leading-relaxed">{children}</li>,
                                        h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mb-2 mt-3 first:mt-0">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mb-2 mt-3 first:mt-0">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-sm font-bold text-gray-900 mb-1 mt-2 first:mt-0">{children}</h3>,
                                        code: ({ children }) => <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                                        blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-700 my-2">{children}</blockquote>,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            ) : (
                                <span className="whitespace-pre-wrap">{msg.content}</span>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-forte-primary text-white flex items-center justify-center flex-shrink-0">
                            <Bot size={14} />
                        </div>
                        <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin text-gray-500" />
                            <span className="text-xs text-gray-500">Анализирую...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Опишите вашу идею или требование..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-forte-primary/20 focus:border-forte-primary transition-all"
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        className="bg-forte-primary text-white p-3 rounded-xl hover:bg-forte-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}
