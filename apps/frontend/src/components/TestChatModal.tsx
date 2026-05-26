import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, RotateCcw, Bot, User, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Bot as BotType } from '@cloud-ai/shared'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface OutgoingMessage {
  content: string
  conversationId: string
  messageId: string
}

function generateTestPhone() {
  return `+569${Math.floor(10_000_000 + Math.random() * 90_000_000)}`
}

export function TestChatModal({ bot, onClose }: { bot: BotType; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const testPhone = useRef(generateTestPhone())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function reset() {
    setMessages([])
    setInput('')
    setApiError('')
    testPhone.current = generateTestPhone()
    inputRef.current?.focus()
  }

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setApiError('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await api.post<OutgoingMessage>(`/bots/${bot.id}/message`, {
        userPhone: testPhone.current,
        content: text,
        channel: 'webchat',
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.content ?? '' }])
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, loading, bot.id])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-background border-l shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Bot size={15} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">{bot.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{testPhone.current}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={reset}
              title="Nueva conversación"
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
              <div className="p-3 bg-muted rounded-full">
                <Bot size={22} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Modo prueba</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  Escribe un mensaje para probar cómo responde el bot con su configuración actual.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Bot size={13} className="text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                )}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center mt-0.5">
                  <User size={13} className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot size={13} className="text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Pensando...</span>
              </div>
            </div>
          )}

          {apiError && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2.5">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3 shrink-0">
          <div className="flex items-end gap-2 bg-muted rounded-xl px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Escribe un mensaje..."
              disabled={loading}
              className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground max-h-32 disabled:opacity-50"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || loading}
              className="shrink-0 p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Enter para enviar · Shift+Enter nueva línea
          </p>
        </div>
      </div>
    </>
  )
}
