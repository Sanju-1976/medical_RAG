'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, FileText, Sparkles } from 'lucide-react'
import { MessageBubble } from '@/components/MessageBubble'
import { InputBar } from '@/components/InputBar'
import { createBrowserClient } from '@/lib/supabase/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { content: string; similarity: number }[]
  created_at?: string
}

interface ChatCanvasProps {
  sessionId: string
  documentId: string
  documentName: string
  onUploadClick: () => void
  isNewSession?: boolean
}

export function ChatCanvas({
  sessionId,
  documentId,
  documentName,
  onUploadClick,
  isNewSession,
}: ChatCanvasProps) {
  const supabase = createBrowserClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load message history on mount
  useEffect(() => {
    if (!sessionId || isNewSession) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return

      fetch(`/api/sessions/${sessionId}/messages`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setMessages(data)
        })
        .catch(console.error)
    })
  }, [sessionId, isNewSession, supabase.auth])

  // Smooth scroll for new messages added to history
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Instant scroll during token streaming (prevents competing smooth-scroll animations and jitter)
  useEffect(() => {
    if (streamingContent && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [streamingContent])

  const sendMessage = async (question: string) => {
    if (isLoading) return
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)
    setStreamingContent('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Unauthenticated')

      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question, documentId, sessionId, history }),
      })

      if (!res.ok) throw new Error('Chat API error')

      // Parse sources from header
      const sourcesHeader = res.headers.get('X-Sources')
      const sources = sourcesHeader ? JSON.parse(decodeURIComponent(sourcesHeader)) : []

      // Stream the response token by token
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setStreamingContent(full)
      }

      // Commit completed message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: full,
          sources,
          created_at: new Date().toISOString(),
        },
      ])
      setStreamingContent('')
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          created_at: new Date().toISOString(),
        },
      ])
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="flex-1 overflow-hidden flex flex-col bg-[#f7f9fb] relative">
      {/* Document indicator */}
      {documentName && (
        <div className="flex justify-center pt-4 absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-gray-200 pointer-events-auto">
            <FileText size={14} className="text-[#1E40AF]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              Analyzing: {documentName}
            </span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pt-16 px-6 pb-6 scroll-smooth"
      >
        <div className="max-w-[768px] mx-auto flex flex-col gap-6">

          {/* Date separator */}
          {messages.length > 0 && (
            <div className="flex items-center gap-4 opacity-50 my-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !streamingContent && (
            <EmptyState documentName={documentName} onSend={sendMessage} />
          )}

          {/* Chat messages */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              sources={msg.sources}
              timestamp={msg.created_at}
            />
          ))}

          {/* Streaming response */}
          {streamingContent && (
            <MessageBubble role="assistant" content={streamingContent} isStreaming />
          )}

          {/* Typing indicator */}
          {isLoading && !streamingContent && (
            <div className="flex items-center gap-2 opacity-60">
              <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
                <Sparkles size={13} className="text-purple-500" />
              </div>
              <div className="flex gap-1">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-purple-500 font-medium">Qwen2.5 thinking…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Bar */}
      <InputBar
        onSend={sendMessage}
        onUploadClick={onUploadClick}
        isLoading={isLoading}
        disabled={!documentId}
      />
    </section>
  )
}

// ─── Empty State ───────────────────────────────────────────────

function EmptyState({
  documentName,
  onSend,
}: {
  documentName: string
  onSend: (msg: string) => void
}) {
  const starters = [
    'What does my blood report say about my cholesterol levels?',
    'Are there any values outside the normal range?',
    'Summarize the key findings of this report.',
    'What dietary changes are recommended based on my results?',
  ]

  return (
    <div className="flex flex-col items-center text-center gap-6 py-12">
      <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center">
        <Sparkles size={32} className="text-purple-500" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {documentName ? `Ready to analyze ${documentName}` : 'Upload a report to get started'}
        </h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Powered by <span className="font-semibold text-purple-600">Qwen2.5-1.5B</span> via HuggingFace · Grounded in your uploaded report
        </p>
      </div>
      {documentName && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
          {starters.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="text-left text-sm p-3 bg-white border border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-gray-700 hover:text-purple-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
