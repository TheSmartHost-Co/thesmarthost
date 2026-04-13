'use client'

import React, { useState, useRef, useEffect } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'

interface NoteInputProps {
  value: string
  onSend: (note: string) => Promise<void>
  placeholder?: string
  multiline?: boolean
  compact?: boolean
  disabled?: boolean
}

const NoteInput: React.FC<NoteInputProps> = ({
  value,
  onSend,
  placeholder = 'Add a note...',
  multiline = false,
  compact = false,
  disabled = false,
}) => {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Reset draft when the saved value changes externally (e.g. different item selected)
  useEffect(() => {
    setDraft('')
  }, [value])

  const handleSend = async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === value) {
      setDraft('')
      return
    }
    setSending(true)
    try {
      await onSend(trimmed)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      if (multiline && e.shiftKey) return // allow newline
      e.preventDefault()
      if (!sending) handleSend()
    }
  }

  const hasContent = draft.trim().length > 0 && draft.trim() !== value
  const bubbleSize = compact ? 'text-xs px-2.5 py-1.5' : 'text-sm px-3 py-2'
  const inputSize = compact ? 'text-xs px-2 py-1.5' : 'text-sm px-3 py-2'
  const buttonSize = compact ? 'w-7 h-7' : 'w-8 h-8'
  const iconSize = compact ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <div className="space-y-2">
      {/* Saved note bubble */}
      {value && (
        <div className="flex justify-end">
          <div className={`${bubbleSize} bg-teal-50 text-teal-900 rounded-2xl rounded-br-sm max-w-[85%] whitespace-pre-wrap break-words`}>
            {value}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-1.5">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={2}
            className={`flex-1 ${inputSize} border border-gray-200 hover:border-gray-300 focus:border-teal-300 focus:ring-1 focus:ring-teal-300 rounded-xl bg-gray-50 focus:bg-white resize-none transition-colors disabled:opacity-50`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            className={`flex-1 ${inputSize} border border-gray-200 hover:border-gray-300 focus:border-teal-300 focus:ring-1 focus:ring-teal-300 rounded-xl bg-gray-50 focus:bg-white transition-colors disabled:opacity-50`}
          />
        )}

        <button
          onClick={handleSend}
          disabled={disabled || sending || !hasContent}
          className={`${buttonSize} flex-shrink-0 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
            hasContent && !sending
              ? 'bg-teal-500 text-white hover:bg-teal-600'
              : 'bg-gray-100 text-gray-300'
          } disabled:cursor-default`}
        >
          {sending ? (
            <div className={`${iconSize} border-2 border-white border-t-transparent rounded-full animate-spin`} />
          ) : (
            <PaperAirplaneIcon className={iconSize} />
          )}
        </button>
      </div>
    </div>
  )
}

export default NoteInput
