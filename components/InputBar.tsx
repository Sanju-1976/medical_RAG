'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Paperclip, SendHorizontal, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUGGESTION_CHIPS = [
  'Explain these results in simple terms',
  'What values are outside normal range?',
  'Dietary recommendations',
  'Compare with past labs',
  'What should I ask my doctor?',
]

interface InputBarProps {
  onSend: (message: string) => void
  onUploadClick: () => void
  isLoading: boolean
  disabled?: boolean
}

export function InputBar({ onSend, onUploadClick, isLoading, disabled }: InputBarProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 128)}px`
    }
  }

  return (
    <div className="px-6 pb-6 bg-[#f7f9fb] pt-3">
      <div className="max-w-[768px] mx-auto">
        {/* Suggestion Chips */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setValue(chip)
                textareaRef.current?.focus()
              }}
              disabled={disabled || isLoading}
              className="shrink-0 text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-[#00478d] hover:text-[#00478d] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Box */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-2 focus-within:border-[#00478d] focus-within:ring-2 focus-within:ring-[#00478d]/20 transition-all">
          <div className="flex items-end gap-2">
            {/* Attachment */}
            <button
              onClick={onUploadClick}
              title="Upload a new report"
              className="p-3 text-gray-400 hover:bg-gray-100 hover:text-[#00478d] rounded-xl transition-colors flex-shrink-0"
            >
              <Paperclip size={18} />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              disabled={disabled || isLoading}
              rows={1}
              placeholder={disabled ? 'Upload a report to start chatting…' : 'Ask a question about your report…'}
              className="flex-1 border-none focus:ring-0 py-3 px-1 bg-transparent resize-none text-sm text-gray-800 placeholder:text-gray-400 max-h-32 disabled:opacity-50"
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!value.trim() || isLoading || disabled}
              className={cn(
                'w-11 h-11 flex items-center justify-center rounded-xl transition-all active:scale-95 flex-shrink-0',
                value.trim() && !isLoading && !disabled
                  ? 'bg-[#00478d] text-white hover:bg-[#005eb8] shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <SendHorizontal size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[10px] text-gray-400 mt-2">
          Clinical Assistant can make mistakes. Always consult a qualified healthcare professional.
        </p>
      </div>
    </div>
  )
}
