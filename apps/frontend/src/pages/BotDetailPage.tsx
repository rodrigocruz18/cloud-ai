import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Bot } from '@cloud-ai/shared'

export function BotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: bot, isLoading } = useQuery({
    queryKey: ['bots', id],
    queryFn: () => api.get<Bot>(`/bots/${id}`),
    enabled: !!id,
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>
  if (!bot) return <div className="p-8 text-destructive">Bot no encontrado</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{bot.name}</h2>
        <p className="text-muted-foreground mt-1">{bot.description ?? 'Sin descripción'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <InfoCard label="Provider" value={bot.provider} />
        <InfoCard label="Modelo" value={bot.model} />
        <InfoCard label="Temperatura" value={String(bot.temperature)} />
        <InfoCard label="Estado" value={bot.status} />
      </div>

      <div className="bg-card border rounded-lg p-4">
        <p className="text-sm font-medium mb-2">System Prompt</p>
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded p-3">
          {bot.prompt}
        </pre>
      </div>

      <div className="mt-4 bg-card border rounded-lg p-4">
        <p className="text-sm font-medium mb-1">Webhook URL</p>
        <code className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
          POST /api/v1/bots/{bot.id}/message
        </code>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  )
}
