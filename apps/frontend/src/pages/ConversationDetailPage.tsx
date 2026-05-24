import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Conversation, Message } from '@cloud-ai/shared'
import { cn } from '@/lib/utils'

interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['conversations', id],
    queryFn: () => api.get<ConversationWithMessages>(`/conversations/${id}`),
    enabled: !!id,
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>
  if (!data) return <div className="p-8 text-destructive">Conversación no encontrada</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{data.user_phone}</h2>
        <p className="text-sm text-muted-foreground">{data.channel} · {data.status}</p>
      </div>

      <div className="space-y-3">
        {data.messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-start' : 'justify-end'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-muted text-foreground rounded-bl-sm'
                  : 'bg-primary text-primary-foreground rounded-br-sm'
              )}
            >
              {msg.content}
              <p className={cn(
                'text-[10px] mt-1',
                msg.role === 'user' ? 'text-muted-foreground' : 'text-primary-foreground/70'
              )}>
                {new Date(msg.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
