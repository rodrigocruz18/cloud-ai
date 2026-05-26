import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, FileText, Link, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Bot, KnowledgeSource } from '@cloud-ai/shared'

const SOURCE_TYPES = [
  { value: 'text', label: 'Texto directo', icon: FileText, hint: 'Pega o escribe el contenido manualmente' },
  { value: 'url',  label: 'URL',           icon: Link,     hint: 'Se extraerá el texto de la página automáticamente' },
] as const

function charCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k caracteres`
  return `${n} caracteres`
}

export function KnowledgeTab({ bot }: { bot: Bot }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<'text' | 'url'>('text')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [formError, setFormError] = useState('')

  const { data: sources, isLoading } = useQuery({
    queryKey: ['knowledge', bot.id],
    queryFn: () => api.get<KnowledgeSource[]>(`/bots/${bot.id}/knowledge`),
    // Poll while any source is still processing
    refetchInterval: (query) =>
      query.state.data?.some((s) => s.status === 'processing') ? 2000 : false,
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('El nombre es requerido')
      if (!content.trim()) throw new Error(type === 'url' ? 'La URL es requerida' : 'El contenido es requerido')
      if (type === 'url' && !content.startsWith('http')) throw new Error('La URL debe empezar con http:// o https://')
      return api.post<KnowledgeSource>(`/bots/${bot.id}/knowledge`, {
        type,
        name: name.trim(),
        content: content.trim(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', bot.id] })
      setShowForm(false)
      setName('')
      setContent('')
      setFormError('')
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : 'Error al guardar'),
  })

  const [deleteError, setDeleteError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bots/${bot.id}/knowledge/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', bot.id] })
      setDeletingId(null)
      setDeleteError('')
    },
    onError: (e) => {
      setDeleteError(e instanceof Error ? e.message : 'Error al eliminar')
      setDeletingId(null)
    },
  })

  const selectedType = SOURCE_TYPES.find((t) => t.value === type) ?? SOURCE_TYPES[0]

  function cancelForm() {
    setShowForm(false)
    setName('')
    setContent('')
    setFormError('')
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            El contenido de las fuentes activas se inyecta en el contexto del bot en cada conversación.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={showForm}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
        >
          <Plus size={14} /> Agregar fuente
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm">Nueva fuente de conocimiento</h3>

          {/* Type selector */}
          <div className="flex gap-2">
            {SOURCE_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setType(value); setContent('') }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors',
                  type === value
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground -mt-2">{selectedType.hint}</p>

          {/* Name */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Nombre de la fuente</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Ej: Manual de productos, Preguntas frecuentes..."
            />
          </div>

          {/* Content / URL */}
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {type === 'url' ? 'URL' : 'Contenido'}
            </label>
            {type === 'text' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="input resize-none text-sm font-mono"
                placeholder="Pega aquí el texto que el bot debe conocer..."
              />
            ) : (
              <>
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input"
                  placeholder="https://www.ejemplo.com/pagina"
                  type="url"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  El texto se extrae automáticamente. Funciona mejor con páginas HTML estáticas.
                  Sitios tipo React/Angular pueden no tener contenido legible.
                </p>
              </>
            )}
            {type === 'text' && content.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{charCount(content.length)}</p>
            )}
          </div>

          {formError && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle size={13} /> {formError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending
                ? (type === 'url' ? 'Scrapeando...' : 'Guardando...')
                : 'Guardar'}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 rounded-md text-sm font-medium border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sources?.length === 0 && !showForm && (
        <div className="text-center py-14 bg-card border rounded-lg border-dashed">
          <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-sm">Sin fuentes de conocimiento</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agrega texto o URLs para que el bot los use en sus respuestas
          </p>
        </div>
      )}

      {deleteError && (
        <p className="text-sm text-destructive flex items-center gap-1.5 bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle size={13} /> {deleteError}
        </p>
      )}

      {/* Source list */}
      <div className="space-y-2">
        {sources?.map((source) => {
          const Icon = source.type === 'url' ? Link : FileText
          const url = (source.config as Record<string, string>).url

          return (
            <div key={source.id} className="flex items-start gap-4 bg-card border rounded-lg p-4">
              <div className={cn(
                'p-2 rounded-lg shrink-0 mt-0.5',
                source.status === 'ready' ? 'bg-green-100' : source.status === 'error' ? 'bg-red-100' : 'bg-muted'
              )}>
                <Icon size={15} className={cn(
                  source.status === 'ready' ? 'text-green-700' : source.status === 'error' ? 'text-red-600' : 'text-muted-foreground'
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{source.name}</p>
                {url && <p className="text-xs text-muted-foreground truncate mt-0.5">{url}</p>}
                {source.status === 'error' && source.error_message && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {source.error_message}
                  </p>
                )}
                {source.status === 'ready' && source.content && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {charCount((source.content as string).length)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {source.status === 'processing' && (
                  <RefreshCw size={13} className="text-muted-foreground animate-spin" />
                )}
                {source.status === 'ready' && (
                  <CheckCircle2 size={13} className="text-green-600" />
                )}
                {deletingId === source.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">¿Eliminar?</span>
                    <button
                      onClick={() => deleteMutation.mutate(source.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs px-2 py-0.5 rounded bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="text-xs px-2 py-0.5 rounded border hover:bg-muted"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(source.id)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
