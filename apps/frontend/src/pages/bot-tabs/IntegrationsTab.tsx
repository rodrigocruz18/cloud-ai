import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Bot, Integration } from '@cloud-ai/shared'

const INTEGRATION_TYPES = [
  { value: 'gmail',        label: 'Gmail',         fields: ['client_id', 'client_secret', 'refresh_token'] },
  { value: 'google_drive', label: 'Google Drive',  fields: ['client_id', 'client_secret', 'refresh_token'] },
  { value: 'agendapro',    label: 'AgendaPro',      fields: ['api_key', 'account_id'] },
  { value: 'salesforce',   label: 'Salesforce',     fields: ['client_id', 'client_secret', 'instance_url', 'refresh_token'] },
  { value: 'hubspot',      label: 'HubSpot',        fields: ['access_token'] },
  { value: 'shopify',      label: 'Shopify',        fields: ['shop_domain', 'access_token'] },
  { value: 'http_request', label: 'HTTP Request',   fields: ['base_url', 'api_key', 'auth_header'] },
]

const STATUS_ICON = {
  active:   <CheckCircle size={14} className="text-green-600" />,
  inactive: <Clock size={14} className="text-yellow-600" />,
  error:    <XCircle size={14} className="text-red-600" />,
}
const STATUS_LABEL = { active: 'Activa', inactive: 'Inactiva', error: 'Error' }

export function IntegrationsTab({ bot }: { bot: Bot }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('http_request')
  const [name, setName] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const { data: integrations } = useQuery({
    queryKey: ['integrations', bot.id],
    queryFn: () => api.get<Integration[]>(`/bots/${bot.id}/integrations`),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('El nombre es requerido')
      return api.post<Integration>(`/bots/${bot.id}/integrations`, {
        type, name: name.trim(), config: {}, credentials,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', bot.id] })
      setShowForm(false)
      setName('')
      setCredentials({})
      setError('')
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bots/${bot.id}/integrations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations', bot.id] }),
  })

  const selectedType = INTEGRATION_TYPES.find((t) => t.value === type) ?? INTEGRATION_TYPES[0]!

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configura las credenciales de cada integración. Las credenciales se cifran antes de guardarse.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus size={14} /> Nueva integración
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold">Nueva integración</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Tipo</label>
              <select
                value={type}
                onChange={(e) => { setType(e.target.value); setCredentials({}) }}
                className="input"
              >
                {INTEGRATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Ej: ${selectedType.label} principal`}
                className="input"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Credenciales</p>
            {selectedType.fields.map((field) => (
              <div key={field}>
                <label className="text-xs text-muted-foreground block mb-1">{field}</label>
                <input
                  type={field.includes('secret') || field.includes('token') || field.includes('key') ? 'password' : 'text'}
                  value={credentials[field] ?? ''}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="input font-mono text-sm"
                  placeholder={field}
                />
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              className="px-4 py-2 rounded-md text-sm font-medium border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {integrations?.length === 0 && !showForm && (
        <div className="text-center py-12 bg-card border rounded-lg">
          <p className="text-muted-foreground text-sm">No hay integraciones configuradas</p>
        </div>
      )}

      <div className="space-y-2">
        {integrations?.map((integration) => (
          <div key={integration.id} className="flex items-center gap-4 bg-card border rounded-lg p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{integration.name}</p>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {STATUS_ICON[integration.status]}
                  {STATUS_LABEL[integration.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{integration.type}</p>
            </div>
            <button
              onClick={() => deleteMutation.mutate(integration.id)}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
