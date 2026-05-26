import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MessageSquare, ChevronRight, ChevronDown, Bot, Users, Circle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Client, Bot as BotType, Conversation, PaginatedResponse } from '@cloud-ai/shared'

interface ConversationWithBot extends Conversation {
  bots?: { id: string; name: string; client_id: string }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return d.toLocaleDateString('es-CL', { weekday: 'short' })
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

export function ConversationsPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients'),
  })

  const { data: bots } = useQuery({
    queryKey: ['bots'],
    queryFn: () => api.get<BotType[]>('/bots'),
  })

  const queryParams = new URLSearchParams({ pageSize: '50' })
  if (selectedBotId) queryParams.set('botId', selectedBotId)
  else if (selectedClientId) queryParams.set('clientId', selectedClientId)

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', selectedClientId, selectedBotId],
    queryFn: () => api.get<PaginatedResponse<ConversationWithBot>>(`/conversations?${queryParams}`),
  })

  const conversations = data?.items ?? []

  function toggleClient(clientId: string) {
    setExpandedClients((prev) => {
      const next = new Set(prev)
      next.has(clientId) ? next.delete(clientId) : next.add(clientId)
      return next
    })
  }

  function selectClient(clientId: string) {
    setSelectedClientId(clientId)
    setSelectedBotId(null)
    if (!expandedClients.has(clientId)) toggleClient(clientId)
  }

  function selectBot(botId: string, clientId: string) {
    setSelectedBotId(botId)
    setSelectedClientId(clientId)
  }

  function selectAll() {
    setSelectedClientId(null)
    setSelectedBotId(null)
  }

  const botsByClient = (bots ?? []).reduce<Record<string, BotType[]>>((acc, bot) => {
    ;(acc[bot.client_id] ??= []).push(bot)
    return acc
  }, {})

  const selectedLabel = selectedBotId
    ? (bots ?? []).find((b) => b.id === selectedBotId)?.name ?? 'Bot'
    : selectedClientId
      ? (clients ?? []).find((c) => c.id === selectedClientId)?.name ?? 'Cliente'
      : 'Todas las conversaciones'

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r bg-card flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Conversaciones</h2>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {/* All */}
          <button
            onClick={selectAll}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left',
              !selectedClientId && !selectedBotId
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare size={14} />
            Todas
          </button>

          {/* Client → Bot tree */}
          {(clients ?? []).map((client) => {
            const clientBots = botsByClient[client.id] ?? []
            const isExpanded = expandedClients.has(client.id)
            const isClientSelected = selectedClientId === client.id && !selectedBotId

            return (
              <div key={client.id}>
                <button
                  onClick={() => selectClient(client.id)}
                  className={cn(
                    'w-full flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors text-left',
                    isClientSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleClient(client.id) }}
                    className="shrink-0 hover:text-foreground"
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <Users size={13} className="shrink-0" />
                  <span className="truncate flex-1">{client.name}</span>
                  {clientBots.length > 0 && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                      {clientBots.length}
                    </span>
                  )}
                </button>

                {isExpanded && clientBots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => selectBot(bot.id, client.id)}
                    className={cn(
                      'w-full flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-md text-sm transition-colors text-left',
                      selectedBotId === bot.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Bot size={12} className="shrink-0" />
                    <span className="truncate">{bot.name}</span>
                    <Circle
                      size={6}
                      className={cn(
                        'shrink-0 ml-auto fill-current',
                        bot.status === 'active' ? 'text-green-500' : 'text-muted-foreground/40'
                      )}
                    />
                  </button>
                ))}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-lg">{selectedLabel}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data?.total ?? 0} conversaciones
            </p>
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          )}

          <div className="space-y-2">
            {conversations.map((c) => {
              const botName = c.bots?.name ?? (bots ?? []).find((b) => b.id === c.bot_id)?.name
              return (
                <Link
                  key={c.id}
                  to={`/conversations/${c.id}`}
                  className="flex items-center gap-4 bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors group"
                >
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <MessageSquare size={18} className="text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm">{c.user_name ?? c.user_phone}</p>
                      {c.user_name && (
                        <span className="text-xs text-muted-foreground">{c.user_phone}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {botName && (
                        <>
                          <Bot size={10} />
                          <span>{botName}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>{c.channel}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">{formatDate(c.updated_at ?? c.created_at)}</span>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                    )}>
                      {c.status}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {!isLoading && conversations.length === 0 && (
            <div className="text-center py-20 bg-card border rounded-lg border-dashed">
              <MessageSquare size={36} className="mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-sm">Sin conversaciones</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedBotId || selectedClientId
                  ? 'No hay conversaciones para esta selección'
                  : 'Las conversaciones aparecerán aquí cuando los bots reciban mensajes'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
