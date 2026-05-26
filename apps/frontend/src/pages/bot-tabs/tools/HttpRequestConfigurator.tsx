import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Globe, ChevronLeft, Zap, Play, Copy } from 'lucide-react'
import { api } from '@/lib/api'
import type { Bot, Integration } from '@cloud-ai/shared'
import { HttpRequestForm } from './HttpRequestForm'
import { EMPTY_CONFIG, type HttpRequestConfig } from './http-request.types'

type View = 'list' | 'new' | 'edit' | 'test'

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

export function HttpRequestConfigurator({ bot, onBack }: { bot: Bot; onBack?: () => void }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('list')
  const [editing, setEditing] = useState<Integration | null>(null)
  const [testing, setTesting] = useState<Integration | null>(null)
  const [testArgs, setTestArgs] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<{ content: string; isError: boolean } | null>(null)
  const [testLoading, setTestLoading] = useState(false)

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

  const cloneMutation = useMutation({
    mutationFn: (integration: Integration) => {
      const cfg = integration.config as HttpRequestConfig
      const { config, credentials } = buildPayload({ ...cfg, tool_name: `${cfg.tool_name}_copia` })
      return api.post<Integration>(`/bots/${bot.id}/integrations`, { type: 'http_request', name: `${integration.name} (copia)`, config, credentials })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations', bot.id] }),
  })

  function startEdit(integration: Integration) {
    setEditing(integration)
    setView('edit')
  }

  function startTest(integration: Integration) {
    const cfg = integration.config as HttpRequestConfig
    const initial: Record<string, string> = {}
    for (const p of cfg.ai_parameters) initial[p.name] = ''
    setTesting(integration)
    setTestArgs(initial)
    setTestResult(null)
    setView('test')
  }

  async function runTest() {
    if (!testing) return
    setTestLoading(true)
    setTestResult(null)
    try {
      const result = await api.post<{ content: string; isError: boolean }>(
        `/bots/${bot.id}/integrations/${testing.id}/test`,
        testArgs
      )
      setTestResult(result)
    } catch (e) {
      setTestResult({ content: e instanceof Error ? e.message : 'Error desconocido', isError: true })
    } finally {
      setTestLoading(false)
    }
  }

  // ── LIST ────────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={14} /> Volver a herramientas
            </button>
          )}
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
                  <button onClick={() => startTest(integration)} title="Probar" className="p-1.5 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors">
                    <Play size={14} />
                  </button>
                  <button onClick={() => cloneMutation.mutate(integration)} title="Clonar" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => startEdit(integration)} title="Editar" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
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

  // ── TEST ────────────────────────────────────────────────────────────────
  if (view === 'test' && testing) {
    const cfg = testing.config as HttpRequestConfig
    return (
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setTesting(null); setTestResult(null) }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={14} /> Volver
          </button>
          <h3 className="font-semibold">Probar: {testing.name}</h3>
          <span className="text-xs border rounded px-1.5 py-0.5 font-mono text-muted-foreground">{cfg.method}</span>
        </div>

        <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded">{cfg.url}</p>

        {cfg.ai_parameters.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Parámetros</p>
            {cfg.ai_parameters.map((p) => (
              <div key={p.name}>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {p.name}{p.required ? ' *' : ''} — <span className="font-normal">{p.description}</span>
                </label>
                <input
                  value={testArgs[p.name] ?? ''}
                  onChange={(e) => setTestArgs((prev) => ({ ...prev, [p.name]: e.target.value }))}
                  className="input text-sm"
                  placeholder={`Valor para ${p.name}...`}
                />
              </div>
            ))}
          </div>
        )}

        {cfg.ai_parameters.length === 0 && (
          <p className="text-sm text-muted-foreground">Este tool no tiene parámetros — se ejecuta sin argumentos.</p>
        )}

        <button
          onClick={() => void runTest()}
          disabled={testLoading}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Play size={14} /> {testLoading ? 'Ejecutando...' : 'Ejecutar'}
        </button>

        {testResult && (
          <div className={`rounded-lg border p-4 ${testResult.isError ? 'border-destructive/40 bg-destructive/5' : 'border-green-200 bg-green-50'}`}>
            <p className={`text-xs font-semibold mb-2 ${testResult.isError ? 'text-destructive' : 'text-green-700'}`}>
              {testResult.isError ? 'Error' : 'Respuesta exitosa'}
            </p>
            <pre className="text-xs whitespace-pre-wrap break-words font-mono max-h-80 overflow-auto">
              {testResult.content}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return null
}
