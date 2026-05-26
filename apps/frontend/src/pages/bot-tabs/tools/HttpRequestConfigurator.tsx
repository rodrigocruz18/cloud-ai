import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Globe, ChevronLeft, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import type { Bot, Integration } from '@cloud-ai/shared'
import { HttpRequestForm } from './HttpRequestForm'
import { EMPTY_CONFIG, type HttpRequestConfig } from './http-request.types'

type View = 'list' | 'new' | 'edit'

function buildPayload(cfg: HttpRequestConfig) {
  const credentials: Record<string, string> = {}
  const config = { ...cfg }

  // Separate sensitive values into credentials
  if (cfg.auth_type === 'api_key' && cfg.auth_api_key_value) {
    credentials['auth_api_key_value'] = cfg.auth_api_key_value
    config.auth_api_key_value = ''
  }
  if (cfg.auth_type === 'bearer' && cfg.auth_bearer_token) {
    credentials['auth_bearer_token'] = cfg.auth_bearer_token
    config.auth_bearer_token = ''
  }
  if (cfg.auth_type === 'basic') {
    if (cfg.auth_basic_password) {
      credentials['auth_basic_password'] = cfg.auth_basic_password
      config.auth_basic_password = ''
    }
  }

  return { config, credentials }
}

export function HttpRequestConfigurator({ bot, onBack }: { bot: Bot; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('list')
  const [editing, setEditing] = useState<Integration | null>(null)

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations', bot.id],
    queryFn: () => api.get<Integration[]>(`/bots/${bot.id}/integrations`),
    select: (d) => d.filter((i) => i.type === 'http_request'),
  })

  const createMutation = useMutation({
    mutationFn: (cfg: HttpRequestConfig) => {
      const { config, credentials } = buildPayload(cfg)
      return api.post<Integration>(`/bots/${bot.id}/integrations`, {
        type: 'http_request',
        name: cfg.tool_name,
        config,
        credentials,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', bot.id] })
      setView('list')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, cfg }: { id: string; cfg: HttpRequestConfig }) => {
      const { config, credentials } = buildPayload(cfg)
      return api.put<Integration>(`/bots/${bot.id}/integrations/${id}`, {
        name: cfg.tool_name, config, credentials,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', bot.id] })
      setView('list')
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bots/${bot.id}/integrations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations', bot.id] }),
  })

  function startEdit(integration: Integration) {
    setEditing(integration)
    setView('edit')
  }

  // ── LIST ────────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={14} /> Volver a herramientas
          </button>
          <button
            onClick={() => setView('new')}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Nuevo HTTP Request
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">¿Cómo funciona?</p>
          <p>Cada HTTP Request que configures se convierte en un tool independiente que la IA puede llamar durante la conversación. La IA decide cuándo usarlo según la descripción que le des.</p>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

        {!isLoading && integrations?.length === 0 && (
          <div className="text-center py-16 bg-card border rounded-lg border-dashed">
            <Globe size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-sm">Sin tools HTTP configurados</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Agrega el primero para que el bot pueda llamar APIs externas</p>
            <button
              onClick={() => setView('new')}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors mx-auto"
            >
              <Plus size={14} /> Crear primer HTTP Request
            </button>
          </div>
        )}

        <div className="space-y-2">
          {integrations?.map((integration) => {
            const cfg = integration.config as HttpRequestConfig
            return (
              <div key={integration.id} className="bg-card border rounded-lg p-4 flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                  <Globe size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm">{integration.name}</p>
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                      http.{cfg.tool_name}
                    </span>
                    <span className="text-xs border rounded px-1.5 py-0.5 font-mono text-muted-foreground">
                      {cfg.method}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">{cfg.url}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 italic">{cfg.tool_description}</p>
                  {cfg.ai_parameters.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {cfg.ai_parameters.map((p) => (
                        <span key={p.name} className="flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                          <Zap size={9} className="text-primary" />
                          {p.name}{p.required ? '' : '?'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(integration)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm('¿Eliminar este tool?')) deleteMutation.mutate(integration.id) }}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── NEW ─────────────────────────────────────────────────────────────────
  if (view === 'new') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={14} /> Volver
          </button>
          <h3 className="font-semibold">Nuevo HTTP Request Tool</h3>
        </div>
        <HttpRequestForm
          initial={EMPTY_CONFIG}
          onSave={(cfg) => createMutation.mutateAsync(cfg)}
          onCancel={() => setView('list')}
          saving={createMutation.isPending}
        />
      </div>
    )
  }

  // ── EDIT ────────────────────────────────────────────────────────────────
  if (view === 'edit' && editing) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setView('list'); setEditing(null) }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={14} /> Volver
          </button>
          <h3 className="font-semibold">Editar: {editing.name}</h3>
        </div>
        <HttpRequestForm
          initial={editing.config as HttpRequestConfig}
          onSave={(cfg) => updateMutation.mutateAsync({ id: editing.id, cfg })}
          onCancel={() => { setView('list'); setEditing(null) }}
          saving={updateMutation.isPending}
        />
      </div>
    )
  }

  return null
}
