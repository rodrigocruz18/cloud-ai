import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Bot, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import type { Bot as BotType } from '@cloud-ai/shared'

const STATUS_STYLES: Record<BotType['status'], string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-700',
  draft: 'bg-yellow-100 text-yellow-700',
}

export function BotsPage() {
  const { data: bots, isLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: () => api.get<BotType[]>('/bots'),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Bots</h2>
          <p className="text-muted-foreground mt-1">Administra tus agentes IA</p>
        </div>
        <Link
          to="/bots/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo bot
        </Link>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando...</p>}

      <div className="space-y-3">
        {bots?.map((bot) => (
          <Link
            key={bot.id}
            to={`/bots/${bot.id}`}
            className="flex items-center gap-4 bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{bot.name}</p>
              <p className="text-sm text-muted-foreground truncate">{bot.description ?? 'Sin descripción'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[bot.status]}`}>
                {bot.status}
              </span>
              <span className="text-xs text-muted-foreground">{bot.provider} / {bot.model}</span>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Link>
        ))}

        {!isLoading && bots?.length === 0 && (
          <div className="text-center py-16 bg-card border rounded-lg">
            <Bot size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No hay bots aún</p>
            <p className="text-sm text-muted-foreground mt-1">Crea tu primer bot para empezar</p>
          </div>
        )}
      </div>
    </div>
  )
}
