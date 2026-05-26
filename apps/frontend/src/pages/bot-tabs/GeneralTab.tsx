import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Bot } from '@cloud-ai/shared'

const PROVIDERS = [
  { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { value: 'openai',   label: 'OpenAI',   models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { value: 'claude',   label: 'Claude',   models: ['claude-sonnet-4-6', 'claude-opus-4-7'] },
  { value: 'gemini',   label: 'Gemini',   models: ['gemini-2.0-flash', 'gemini-2.5-pro'] },
]

export function GeneralTab({ bot }: { bot: Bot }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(bot.name)
  const [description, setDescription] = useState(bot.description ?? '')
  const [prompt, setPrompt] = useState(bot.prompt)
  const [provider, setProvider] = useState(bot.provider)
  const [model, setModel] = useState(bot.model)
  const [temperature, setTemperature] = useState(String(bot.temperature))
  const [saved, setSaved] = useState(false)

  const selectedProvider = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0]!

  const mutation = useMutation({
    mutationFn: () =>
      api.put<Bot>(`/bots/${bot.id}`, {
        name, description: description || undefined,
        prompt, provider, model,
        temperature: parseFloat(temperature),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['bots', bot.id], updated)
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="bg-card border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Información</h3>
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </Field>
        <Field label="Descripción">
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Opcional" />
        </Field>
      </section>

      <section className="bg-card border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">System Prompt</h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={10}
          className="input resize-none font-mono text-sm leading-relaxed"
          placeholder="Instrucciones del bot..."
        />
      </section>

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
              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Modelo">
            <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
              {selectedProvider.models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`Temperatura: ${temperature}`}>
          <input
            type="range" min="0" max="2" step="0.1"
            value={temperature} onChange={(e) => setTemperature(e.target.value)}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Preciso (0)</span><span>Creativo (2)</span>
          </div>
        </Field>
      </section>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
      </button>
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
