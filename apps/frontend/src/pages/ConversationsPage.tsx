import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'
import type { Conversation, PaginatedResponse } from '@cloud-ai/shared'

export function ConversationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<PaginatedResponse<Conversation>>('/conversations'),
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Conversaciones</h2>
        <p className="text-muted-foreground mt-1">Historial de conversaciones de todos los bots</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando...</p>}

      <div className="space-y-3">
        {data?.items.map((c) => (
          <Link
            key={c.id}
            to={`/conversations/${c.id}`}
            className="flex items-center gap-4 bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{c.user_phone}</p>
              <p className="text-sm text-muted-foreground">{c.channel} · {new Date(c.created_at).toLocaleDateString('es-CL')}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
              {c.status}
            </span>
          </Link>
        ))}

        {!isLoading && data?.items.length === 0 && (
          <div className="text-center py-16 bg-card border rounded-lg">
            <MessageSquare size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">Sin conversaciones</p>
          </div>
        )}
      </div>
    </div>
  )
}
