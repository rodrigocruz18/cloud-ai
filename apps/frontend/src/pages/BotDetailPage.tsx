import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Check, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { Bot } from '@cloud-ai/shared'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { GeneralTab }       from './bot-tabs/GeneralTab'
import { KnowledgeTab }     from './bot-tabs/KnowledgeTab'
import { ToolsTab }         from './bot-tabs/ToolsTab'
import { ConversationsTab } from './bot-tabs/ConversationsTab'
import { LogsTab }          from './bot-tabs/LogsTab'
import { TestChatModal }    from '@/components/TestChatModal'

const STATUS_STYLES: Record<Bot['status'], string> = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-700',
  draft:    'bg-yellow-100 text-yellow-700',
}
const STATUS_LABELS: Record<Bot['status'], string> = {
  active: 'Activo', inactive: 'Inactivo', draft: 'Borrador',
}

export function BotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [testOpen, setTestOpen] = useState(false)

  const { data: bot, isLoading } = useQuery({
    queryKey: ['bots', id],
    queryFn: () => api.get<Bot>(`/bots/${id}`),
    enabled: !!id,
  })

  const toggleStatus = useMutation({
    mutationFn: () => {
      const next = bot!.status === 'active' ? 'inactive' : 'active'
      return api.put<Bot>(`/bots/${id}`, { status: next })
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['bots', id], updated)
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })

  function copyWebhook() {
    const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api/v1', '') ?? window.location.origin
    void navigator.clipboard.writeText(`${base}/api/v1/bots/${bot?.id}/message`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>
  if (!bot) return <div className="p-8 text-destructive">Bot no encontrado</div>

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-8 py-5">
        <button
          onClick={() => navigate('/bots')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft size={13} /> Bots
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{bot.name}</h2>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[bot.status])}>
              {STATUS_LABELS[bot.status]}
            </span>
            <button
              onClick={copyWebhook}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1 transition-colors"
            >
              {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
              Webhook
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTestOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-primary/40 text-primary hover:bg-primary/5 transition-colors"
            >
              <FlaskConical size={13} /> Probar
            </button>
            <button
              onClick={() => toggleStatus.mutate()}
              disabled={toggleStatus.isPending}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium border transition-colors disabled:opacity-50',
                bot.status === 'active'
                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                  : 'border-green-200 text-green-600 hover:bg-green-50'
              )}
            >
              {toggleStatus.isPending ? '...' : bot.status === 'active' ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>

        {bot.description && (
          <p className="text-sm text-muted-foreground mt-1">{bot.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="general">
          <TabsList className="px-8 bg-background sticky top-0 z-10">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="conocimiento">Conocimiento</TabsTrigger>
            <TabsTrigger value="herramientas">Herramientas</TabsTrigger>
            <TabsTrigger value="conversaciones">Conversaciones</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <div className="px-8">
            <TabsContent value="general">
              <GeneralTab bot={bot} />
            </TabsContent>
            <TabsContent value="conocimiento">
              <KnowledgeTab bot={bot} />
            </TabsContent>
            <TabsContent value="herramientas">
              <ToolsTab bot={bot} />
            </TabsContent>
            <TabsContent value="conversaciones">
              <ConversationsTab bot={bot} />
            </TabsContent>
            <TabsContent value="logs">
              <LogsTab bot={bot} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {testOpen && <TestChatModal bot={bot} onClose={() => setTestOpen(false)} />}
    </div>
  )
}
