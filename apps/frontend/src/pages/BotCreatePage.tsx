import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import type { Bot, Client } from '@cloud-ai/shared'

const PROVIDERS = [
  { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { value: 'claude', label: 'Claude', models: ['claude-sonnet-4-6', 'claude-opus-4-7'] },
  { value: 'gemini', label: 'Gemini', models: ['gemini-2.0-flash', 'gemini-2.5-pro'] },
]

export function BotCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [clientMode, setClientMode] = useState<'existing' | 'new'>('new')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('Eres un asistente IA amable y útil. Responde siempre en español de forma concisa y directa.')
  const [provider, setProvider] = useState('deepseek')
  const [model, setModel] = useState('deepseek-chat')
  const [temperature, setTemperature] = useState('0.7')
  const [error, setError] = useState('')

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients'),
  })

  const selectedProvider = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0]!

  const mutation = useMutation({
    mutationFn: async () => {
      let clientId = selectedClientId

      if (clientMode === 'new') {
        if (!newClientName.trim()) throw new Error('El nombre del cliente es requerido')
        const client = await api.post<Client>('/clients', { name: newClientName.trim() })
        clientId = client.id
      }

      if (!clientId) throw new Error('Selecciona un cliente')
      if (!name.trim()) throw new Error('El nombre del bot es requerido')
      if (!prompt.trim()) throw new Error('El prompt es requerido')

      return api.post<Bot>('/bots', {
        client_id: clientId,
        name: name.trim(),
        description: description.trim() || undefined,
        prompt: prompt.trim(),
        provider,
        model,
        temperature: parseFloat(temperature),
      })
    },
    onSuccess: (bot) => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      navigate(`/bots/${bot.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error al crear el bot'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    mutation.mutate()
  }

  return (
    <div className="p-8 max-w-2xl">
      <button
        onClick={() => navigate('/bots')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Volver a bots
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold">Nuevo bot</h2>
        <p className="text-muted-foreground mt-1">Configura tu agente IA</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cliente */}
        <section className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Cliente</h3>

          {clients && clients.length > 0 && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setClientMode('new')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${clientMode === 'new' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                Nuevo cliente
              </button>
              <button
                type="button"
                onClick={() => setClientMode('existing')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${clientMode === 'existing' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                Cliente existente
              </button>
            </div>
          )}

          {clientMode === 'new' ? (
            <Field label="Nombre del cliente">
              <input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Ej: Clínica San Pedro"
                className="input"
              />
            </Field>
          ) : (
            <Field label="Seleccionar cliente">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="input"
              >
                <option value="">— Selecciona —</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          )}
        </section>

        {/* Bot */}
        <section className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Bot</h3>

          <Field label="Nombre del bot">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Asistente Ventas"
              className="input"
              required
            />
          </Field>

          <Field label="Descripción (opcional)">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Bot de atención al cliente para WhatsApp"
              className="input"
            />
          </Field>
        </section>

        {/* Prompt */}
        <section className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">System Prompt</h3>
          <Field label="Instrucciones para el bot">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder="Describe cómo debe comportarse el bot..."
              className="input resize-none font-mono text-sm"
              required
            />
          </Field>
        </section>

        {/* AI Config */}
        <section className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Modelo IA</h3>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Provider">
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value)
                  const p = PROVIDERS.find((p) => p.value === e.target.value)
                  if (p?.models[0]) setModel(p.models[0])
                }}
                className="input"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Modelo">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="input"
              >
                {selectedProvider.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={`Temperatura: ${temperature}`}>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Preciso (0)</span>
              <span>Creativo (2)</span>
            </div>
          </Field>
        </section>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Creando...' : 'Crear bot'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/bots')}
            className="px-6 py-2 rounded-md text-sm font-medium border hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
