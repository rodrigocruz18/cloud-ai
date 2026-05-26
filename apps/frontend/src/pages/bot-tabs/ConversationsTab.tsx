import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MessageSquare, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Bot, Conversation, PaginatedResponse } from '@cloud-ai/shared'

export function ConversationsTab({ bot }: { bot: Bot }) {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations', { botId: bot.id }],
    queryFn: () => api.get<PaginatedResponse<Conversation>>(`/conversations?botId=${bot.id}&pageSize=50`),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>

  if (!data?.items.length) {
    return (
      <div className="text-center py-16 bg-card border rounded-lg">
        <MessageSquare size={36} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">Aún no hay conversaciones para este bot</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-w-2xl">
      <p className="text-sm text-muted-foreground mb-4">{data.total} conversaciones en total</p>
      {data.items.map((c) => (
        <Link
          key={c.id}
          to={`/conversations/${c.id}`}
          className="flex items-center gap-4 bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors group"
        >
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{c.user_name ?? c.user_phone}</p>
            <p className="text-xs text-muted-foreground">{c.user_phone} · {c.channel}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-xs text-muted-foreground">
              {new Date(c.updated_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
            )}>
              {c.status}
            </span>
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  )
}
