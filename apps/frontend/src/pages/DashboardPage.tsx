import { useQuery } from '@tanstack/react-query'
import { Bot, MessageSquare, Activity } from 'lucide-react'
import { api } from '@/lib/api'
import type { Bot as BotType, PaginatedResponse, Conversation } from '@cloud-ai/shared'

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="bg-card border rounded-lg p-6 flex items-center gap-4">
      <div className="p-3 bg-primary/10 rounded-lg">
        <Icon size={20} className="text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data: bots } = useQuery({
    queryKey: ['bots'],
    queryFn: () => api.get<BotType[]>('/bots'),
  })

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<PaginatedResponse<Conversation>>('/conversations?pageSize=5'),
  })

  const activeBots = bots?.filter((b) => b.status === 'active').length ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Resumen de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Bot} label="Bots activos" value={activeBots} />
        <StatCard icon={MessageSquare} label="Conversaciones totales" value={conversations?.total ?? 0} />
        <StatCard icon={Activity} label="Bots totales" value={bots?.length ?? 0} />
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Conversaciones recientes</h3>
        {conversations?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay conversaciones aún.</p>
        )}
        <div className="space-y-3">
          {conversations?.items.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{c.user_phone}</p>
                <p className="text-xs text-muted-foreground">{c.channel}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
