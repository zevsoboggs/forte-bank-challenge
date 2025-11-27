'use client'

import { useState } from 'react'

import ChatInterface from './components/ChatInterface'
import DocumentPreview from './components/DocumentPreview'

export default function BusinessAnalystPage() {
    const [sessionId, setSessionId] = useState<string | null>(null)

    return (
        <div className="p-8">
            <div className="h-[calc(100vh-160px)] flex gap-6">
                <div className="w-1/2 h-full">
                    <ChatInterface
                        sessionId={sessionId}
                        setSessionId={setSessionId}
                        onMessageSent={() => { }}
                    />
                </div>
                <div className="w-1/2 h-full">
                    <DocumentPreview sessionId={sessionId} />
                </div>
            </div>
        </div>
    )
}
