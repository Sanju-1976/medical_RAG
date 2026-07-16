'use client'

import { Bot, User, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cn, formatTime } from '@/lib/utils'

interface Source {
  content: string
  similarity: number
  chunkIndex?: number
}

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp?: string
  isStreaming?: boolean
}

export function MessageBubble({
  role,
  content,
  sources,
  timestamp,
  isStreaming,
}: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false)
  const isAssistant = role === 'assistant'

  return (
    <div className={cn('flex flex-col gap-1 w-full', isAssistant ? 'items-start' : 'items-end')}>
      {/* Author row */}
      <div className="flex items-center gap-2 mb-1">
        {isAssistant ? (
          <>
            <div className="w-6 h-6 rounded-md bg-[#00478d] flex items-center justify-center text-white">
              <Bot size={13} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#00478d]">
              Clinical Assistant
            </span>
            {timestamp && (
              <span className="text-[10px] text-gray-400">{formatTime(timestamp)}</span>
            )}
          </>
        ) : (
          <>
            {timestamp && (
              <span className="text-[10px] text-gray-400">{formatTime(timestamp)}</span>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Patient
            </span>
            <div className="w-6 h-6 rounded-md bg-gray-200 flex items-center justify-center">
              <User size={13} className="text-gray-600" />
            </div>
          </>
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[85%] rounded-xl p-4 shadow-sm transition-transform hover:-translate-y-0.5 duration-200',
          isAssistant
            ? 'bg-[#F0F9FF] border border-[#00478d]/10 rounded-tl-none'
            : 'bg-white border border-gray-200 rounded-tr-none'
        )}
      >
        {isStreaming ? (
          <StreamingText content={content} />
        ) : (
          <FormattedContent content={content} isAssistant={isAssistant} />
        )}

        {/* Sources */}
        {isAssistant && sources && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-[#00478d] transition-colors"
            >
              {showSources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {sources.length} source{sources.length > 1 ? 's' : ''} from report
            </button>
            {showSources && (
              <div className="mt-2 flex flex-col gap-2">
                {sources.map((s, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-2.5 border border-gray-100 text-xs text-gray-600 leading-relaxed"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-400">Excerpt {i + 1}</span>
                      <span className="text-green-600 font-medium">
                        {Math.round(s.similarity * 100)}% match
                      </span>
                    </div>
                    <p className="line-clamp-3">{s.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Streaming text with a blinking cursor */
function StreamingText({ content }: { content: string }) {
  return (
    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
      {content}
      <span className="inline-block w-0.5 h-4 bg-[#00478d] ml-0.5 animate-pulse align-middle" />
    </p>
  )
}

/** Format assistant content: detect bold (**text**), bullet lists, etc. */
function FormattedContent({ content, isAssistant }: { content: string; isAssistant: boolean }) {
  if (!isAssistant) {
    return <p className="text-sm text-gray-800 leading-relaxed">{content}</p>
  }

  // Simple markdown-ish formatting
  const lines = content.split('\n')
  return (
    <div className="text-sm text-gray-800 leading-relaxed flex flex-col gap-1.5">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <h3 key={i} className="font-semibold text-base text-gray-900">{line.slice(2)}</h3>
        }
        if (line.startsWith('## ')) {
          return <h4 key={i} className="font-semibold text-sm text-gray-800">{line.slice(3)}</h4>
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-[#00478d] font-bold mt-0.5">•</span>
              <span>{formatInline(line.slice(2))}</span>
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i}>{formatInline(line)}</p>
      })}
    </div>
  )
}

/** Render **bold** inline patterns */
function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}
