'use client'
import { useEffect, useRef, useState } from 'react'
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/20/solid'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for non-secure contexts / denied clipboard permission.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

interface Props {
  text: () => string
  label?: string
  copiedLabel?: string
  className?: string
  primary?: boolean
}

export default function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied', className = '', primary = false }: Props) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )
  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyText(text())
    setState(ok ? 'ok' : 'fail')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 1800)
  }
  const base = primary
    ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-sm'
    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${base} ${className}`}
    >
      {state === 'ok' ? (
        <CheckIcon className={`h-4 w-4 ${primary ? 'text-white' : 'text-emerald-600'}`} />
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4" />
      )}
      {state === 'ok' ? copiedLabel : state === 'fail' ? 'Copy failed' : label}
    </button>
  )
}
