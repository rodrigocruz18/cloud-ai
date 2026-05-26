import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Globe, Mail, Folder, Calendar, Users, ShoppingBag, Check, Settings } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Bot } from '@cloud-ai/shared'
import { HttpRequestConfigurator } from './tools/HttpRequestConfigurator'

interface CatalogTool {
  name: string
  label: string
  description: string
  category: string
  integrationRequired: string | null
  icon: string
}

const ICONS: Record<string, React.ElementType> = {
  globe: Globe, mail: Mail, folder: Folder,
  calendar: Calendar, users: Users, 'shopping-bag': ShoppingBag,
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', email: 'Email', calendar: 'Agenda / Reservas',
  storage: 'Almacenamiento', crm: 'CRM', ecommerce: 'E-commerce',
}

// Tools that have their own dedicated configurator instead of simple toggle
const CONFIGURABLE_TOOLS: Record<string, string> = {
  'http.request': 'HTTP Request',
}

export function ToolsTab({ bot }: { bot: Bot }) {
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState<string[]>(bot.enabled_tools ?? [])
  const [saved, setSaved] = useState(false)
  const [configuringTool, setConfiguringTool] = useState<string | null>(null)

  const { data: catalog } = useQuery({
    queryKey: ['tools-catalog'],
    queryFn: () => api.get<CatalogTool[]>('/tools'),
  })

  const mutation = useMutation({
    mutationFn: () => api.put<Bot>(`/bots/${bot.id}`, { enabled_tools: enabled }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['bots', bot.id], updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  function toggle(toolName: string) {
    setEnabled((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    )
  }

  // ── Configurator sub-view ────────────────────────────────────────────────
  if (configuringTool === 'http.request') {
    return (
      <HttpRequestConfigurator
        bot={bot}
        onBack={() => setConfiguringTool(null)}
      />
    )
  }

  // ── Main list ────────────────────────────────────────────────────────────
  const grouped = (catalog ?? []).reduce<Record<string, CatalogTool[]>>((acc, tool) => {
    ;(acc[tool.category] ??= []).push(tool)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Activa las herramientas disponibles para este bot. Las marcadas con{' '}
          <Settings size={11} className="inline" /> requieren configuración adicional.
        </p>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
        >
          {mutation.isPending ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
        </button>
      </div>

      {Object.entries(grouped).map(([category, tools]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <div className="space-y-2">
            {tools.map((tool) => {
              const Icon = ICONS[tool.icon] ?? Globe
              const isEnabled = enabled.includes(tool.name)
              const isConfigurable = tool.name in CONFIGURABLE_TOOLS

              return (
                <div
                  key={tool.name}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-all',
                    isEnabled ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
                  )}
                >
                  {/* Icon */}
                  <div className={cn('p-2 rounded-lg shrink-0', isEnabled ? 'bg-primary/10' : 'bg-muted')}>
                    <Icon size={16} className={isEnabled ? 'text-primary' : 'text-muted-foreground'} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tool.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
                    {tool.integrationRequired && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                        Requiere: {tool.integrationRequired}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isConfigurable && (
                      <button
                        onClick={() => setConfiguringTool(tool.name)}
                        className={cn(
                          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border font-medium transition-colors',
                          isEnabled
                            ? 'border-primary/40 text-primary hover:bg-primary/10'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <Settings size={11} />
                        Configurar
                      </button>
                    )}

                    {/* Toggle */}
                    <button
                      onClick={() => toggle(tool.name)}
                      className={cn(
                        'w-10 h-6 rounded-full border-2 relative transition-all shrink-0',
                        isEnabled ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-muted'
                      )}
                      title={isEnabled ? 'Desactivar' : 'Activar'}
                    >
                      <span className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all',
                        isEnabled ? 'left-4' : 'left-0.5'
                      )} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
