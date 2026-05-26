import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Bot, ToolLog, PaginatedResponse } from '@cloud-ai/shared'

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'OK' },
  error:   { icon: XCircle,     color: 'text-red-600',   bg: 'bg-red-100',   label: 'Error' },
  timeout: { icon: Clock,       color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Timeout' },
}

interface KnowledgeArgs {
  sources: Array<{ name: string; type: string; chars: number }>
  total_chars: number
}

function KnowledgeLogRow({ log }: { log: ToolLog }) {
  const [open, setOpen] = useState(false)
  const Chevron = open ? ChevronDown : ChevronRight
  const args = log.arguments as KnowledgeArgs
  const totalKb = (args.total_chars / 1000).toFixed(1)

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-100/50 transition-colors"
      >
        <Chevron size={14} className="text-blue-400 shrink-0" />
        <BookOpen size={13} className="text-blue-500 shrink-0" />
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
          Conocimiento
        </span>
        <span className="text-sm flex-1 text-blue-800">
          {args.sources.length} fuente{args.sources.length !== 1 ? 's' : ''} inyectada{args.sources.length !== 1 ? 's' : ''} · {totalKb}k caracteres
        </span>
        <span className="text-xs text-blue-500 shrink-0">
          {new Date(log.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </button>

      {open && (
        <div className="border-t border-blue-200 px-4 py-3 space-y-2 bg-blue-50/50">
          {args.sources.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-mono">{s.type}</span>
              <span className="text-blue-800 font-medium">{s.name}</span>
              <span className="text-blue-500 ml-auto">{(s.chars / 1000).toFixed(1)}k chars</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LogRow({ log }: { log: ToolLog }) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_CONFIG[log.status]
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <Chevron size={14} className="text-muted-foreground shrink-0" />
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', cfg.bg, cfg.color)}>
          {cfg.label}
        </span>
        <code className="text-sm font-mono flex-1 truncate">{log.tool_name}</code>
        <span className="text-xs text-muted-foreground shrink-0">{log.latency_ms}ms</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(log.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Argumentos</p>
            <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-32">{JSON.stringify(log.arguments, null, 2)}</pre>
          </div>
          {log.result !== null && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Resultado</p>
              <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-48">{JSON.stringify(log.result, null, 2)}</pre>
            </div>
          )}
          {log.error_message && (
            <div>
              <p className="text-xs font-medium text-red-600 mb-1">Error</p>
              <p className="text-xs text-red-600 bg-red-50 rounded p-2">{log.error_message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function LogsTab({ bot }: { bot: Bot }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tool-logs', bot.id],
    queryFn: () => api.get<PaginatedResponse<ToolLog>>(`/bots/${bot.id}/logs`),
    refetchInterval: 10_000,
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>

  if (!data?.items.length) {
    return (
      <div className="text-center py-16 bg-card border rounded-lg">
        <Clock size={36} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">No hay ejecuciones de herramientas aún</p>
      </div>
    )
  }

  const successCount = data.items.filter((l) => l.status === 'success').length
  const errorCount = data.items.filter((l) => l.status === 'error').length
  const avgLatency = Math.round(data.items.reduce((s, l) => s + l.latency_ms, 0) / data.items.length)

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="bg-card border rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-600">{successCount}</p>
          <p className="text-xs text-muted-foreground">Exitosas</p>
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-600">{errorCount}</p>
          <p className="text-xs text-muted-foreground">Errores</p>
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <p className="text-xl font-bold">{avgLatency}ms</p>
          <p className="text-xs text-muted-foreground">Latencia promedio</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {data.items.map((log) =>
          log.tool_name === 'knowledge.context_loaded'
            ? <KnowledgeLogRow key={log.id} log={log} />
            : <LogRow key={log.id} log={log} />
        )}
      </div>
    </div>
  )
}
