import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  HttpRequestConfig, HttpMethod, AuthType, BodyType, ParamType,
  KeyValue, AIParameter,
} from './http-request.types'

// ─── helpers ────────────────────────────────────────────────────────────────

function toSnakeCase(s: string) {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-sm font-medium">{label}</label>
        {hint && <span title={hint}><Info size={12} className="text-muted-foreground cursor-help" /></span>}
      </div>
      {children}
    </div>
  )
}

function SectionHeader({
  title, open, onToggle, badge,
}: { title: string; open: boolean; onToggle: () => void; badge?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 border-b text-sm font-semibold hover:text-primary transition-colors"
    >
      <span className="flex items-center gap-2">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
        {badge && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{badge}</span>}
      </span>
    </button>
  )
}

function KVList({
  items, onChange, keyPlaceholder = 'Clave', valuePlaceholder = 'Valor',
}: {
  items: KeyValue[]
  onChange: (items: KeyValue[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}) {
  const add = () => onChange([...items, { key: '', value: '' }])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i: number, field: 'key' | 'value', v: string) =>
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: v } : item))

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item.key}
            onChange={(e) => update(i, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="input flex-1 font-mono text-sm"
          />
          <input
            value={item.value}
            onChange={(e) => update(i, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="input flex-1 font-mono text-sm"
          />
          <button type="button" onClick={() => remove(i)} className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button" onClick={add}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        <Plus size={12} /> Agregar
      </button>
    </div>
  )
}

// ─── Main form ──────────────────────────────────────────────────────────────

interface Props {
  initial: HttpRequestConfig
  onSave: (config: HttpRequestConfig) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

export function HttpRequestForm({ initial, onSave, onCancel, saving }: Props) {
  const [cfg, setCfg] = useState<HttpRequestConfig>(initial)
  const [sections, setSections] = useState({
    identity: true, request: true, auth: true,
    headers: false, query: false, body: false,
  })
  const [error, setError] = useState('')

  const toggle = (s: keyof typeof sections) => setSections((p) => ({ ...p, [s]: !p[s] }))
  const set = <K extends keyof HttpRequestConfig>(k: K, v: HttpRequestConfig[K]) =>
    setCfg((p) => ({ ...p, [k]: v }))

  // AI Parameters
  const addParam = () => set('ai_parameters', [
    ...cfg.ai_parameters,
    { name: '', description: '', type: 'string', required: false },
  ])
  const removeParam = (i: number) =>
    set('ai_parameters', cfg.ai_parameters.filter((_, idx) => idx !== i))
  const updateParam = (i: number, field: keyof AIParameter, v: string | boolean) =>
    set('ai_parameters', cfg.ai_parameters.map((p, idx) => idx === i ? { ...p, [field]: v } : p))

  async function handleSave() {
    setError('')
    if (!cfg.tool_name) return setError('El nombre de la herramienta es requerido')
    if (!cfg.tool_description) return setError('La descripción para la IA es requerida')
    if (!cfg.url) return setError('La URL es requerida')
    try {
      await onSave(cfg)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const authBadge = cfg.auth_type !== 'none' ? cfg.auth_type : undefined
  const headersBadge = cfg.headers.length > 0 ? String(cfg.headers.length) : undefined
  const queryBadge = cfg.query_params.length > 0 ? String(cfg.query_params.length) : undefined
  const bodyBadge = cfg.body_type !== 'none' ? cfg.body_type : undefined

  return (
    <div className="space-y-0 divide-y">

      {/* ── 1. AI IDENTITY ───────────────────────────────────────── */}
      <div>
        <SectionHeader title="Identidad del tool (para la IA)" open={sections.identity} onToggle={() => toggle('identity')} />
        {sections.identity && (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre del tool" hint="La IA usará este nombre para llamar al tool. Solo letras, números y guiones bajos.">
                <input
                  value={cfg.tool_name}
                  onChange={(e) => set('tool_name', toSnakeCase(e.target.value))}
                  placeholder="buscar_producto"
                  className="input font-mono"
                />
              </Field>
              <div className="flex items-end">
                <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 font-mono">
                  {cfg.tool_name ? `http.${cfg.tool_name}` : 'http.nombre_tool'}
                </p>
              </div>
            </div>

            <Field label="Descripción para la IA" hint="La IA lee esto para decidir cuándo usar este tool. Sé específico sobre qué hace y cuándo usarlo.">
              <textarea
                value={cfg.tool_description}
                onChange={(e) => set('tool_description', e.target.value)}
                rows={3}
                placeholder="Busca un producto en el catálogo por nombre o SKU. Úsalo cuando el usuario pregunte por disponibilidad, precio o características de un producto."
                className="input resize-none text-sm"
              />
            </Field>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Parámetros que la IA puede enviar</label>
                <button type="button" onClick={addParam} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Plus size={12} /> Agregar parámetro
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Usa <code className="bg-muted px-1 rounded">{'{{nombre}}'}</code> en la URL, headers y body para que la IA los complete.
              </p>
              {cfg.ai_parameters.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Sin parámetros — el tool se llamará sin argumentos.</p>
              )}
              <div className="space-y-3">
                {cfg.ai_parameters.map((param, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start bg-muted/30 rounded-lg p-3">
                    <div className="col-span-3">
                      <label className="text-[10px] text-muted-foreground block mb-1">Nombre</label>
                      <input
                        value={param.name}
                        onChange={(e) => updateParam(i, 'name', toSnakeCase(e.target.value))}
                        placeholder="email"
                        className="input font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-5">
                      <label className="text-[10px] text-muted-foreground block mb-1">Descripción</label>
                      <input
                        value={param.description}
                        onChange={(e) => updateParam(i, 'description', e.target.value)}
                        placeholder="Email del cliente a buscar"
                        className="input text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground block mb-1">Tipo</label>
                      <select
                        value={param.type}
                        onChange={(e) => updateParam(i, 'type', e.target.value as ParamType)}
                        className="input text-xs"
                      >
                        <option value="string">texto</option>
                        <option value="number">número</option>
                        <option value="boolean">booleano</option>
                      </select>
                    </div>
                    <div className="col-span-1 pt-5 flex justify-center">
                      <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) => updateParam(i, 'required', e.target.checked)}
                          className="accent-primary"
                        />
                        <span className="text-[9px] text-muted-foreground">req</span>
                      </label>
                    </div>
                    <div className="col-span-1 pt-5 flex justify-center">
                      <button type="button" onClick={() => removeParam(i)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. REQUEST ───────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Petición HTTP" open={sections.request} onToggle={() => toggle('request')} />
        {sections.request && (
          <div className="py-4 space-y-4">
            <div className="flex gap-3">
              <div className="w-32 shrink-0">
                <label className="text-sm font-medium block mb-1.5">Método</label>
                <select value={cfg.method} onChange={(e) => set('method', e.target.value as HttpMethod)} className="input">
                  {(['GET','POST','PUT','PATCH','DELETE','HEAD'] as HttpMethod[]).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <Field label="URL" hint="Puedes usar {{parametro}} para que la IA complete valores dinámicamente">
                <input
                  value={cfg.url}
                  onChange={(e) => set('url', e.target.value)}
                  placeholder="https://api.ejemplo.com/v1/clientes/{{email}}"
                  className="input font-mono text-sm"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. AUTH ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Autenticación" open={sections.auth} onToggle={() => toggle('auth')} badge={authBadge} />
        {sections.auth && (
          <div className="py-4 space-y-4">
            <Field label="Tipo de autenticación">
              <div className="flex gap-2 flex-wrap">
                {([
                  { v: 'none',    l: 'Sin auth' },
                  { v: 'api_key', l: 'API Key' },
                  { v: 'bearer',  l: 'Bearer Token' },
                  { v: 'basic',   l: 'Basic Auth' },
                ] as { v: AuthType; l: string }[]).map(({ v, l }) => (
                  <button
                    key={v} type="button"
                    onClick={() => set('auth_type', v)}
                    className={cn(
                      'px-3 py-1.5 rounded-md border text-sm font-medium transition-colors',
                      cfg.auth_type === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >{l}</button>
                ))}
              </div>
            </Field>

            {cfg.auth_type === 'api_key' && (
              <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
                <Field label="Nombre del header">
                  <input value={cfg.auth_api_key_header} onChange={(e) => set('auth_api_key_header', e.target.value)} placeholder="X-Api-Key" className="input font-mono text-sm" />
                </Field>
                <Field label="Valor de la API Key" hint="Se cifrará antes de guardarse">
                  <input type="password" value={cfg.auth_api_key_value} onChange={(e) => set('auth_api_key_value', e.target.value)} placeholder="sk-..." className="input font-mono text-sm" />
                </Field>
              </div>
            )}

            {cfg.auth_type === 'bearer' && (
              <div className="bg-muted/30 rounded-lg p-4">
                <Field label="Bearer Token" hint="Se cifrará antes de guardarse">
                  <input type="password" value={cfg.auth_bearer_token} onChange={(e) => set('auth_bearer_token', e.target.value)} placeholder="eyJ..." className="input font-mono text-sm" />
                </Field>
              </div>
            )}

            {cfg.auth_type === 'basic' && (
              <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
                <Field label="Usuario">
                  <input value={cfg.auth_basic_username} onChange={(e) => set('auth_basic_username', e.target.value)} className="input text-sm" />
                </Field>
                <Field label="Contraseña" hint="Se cifrará antes de guardarse">
                  <input type="password" value={cfg.auth_basic_password} onChange={(e) => set('auth_basic_password', e.target.value)} className="input text-sm" />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4. HEADERS ───────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Headers" open={sections.headers} onToggle={() => toggle('headers')} badge={headersBadge} />
        {sections.headers && (
          <div className="py-4">
            <KVList items={cfg.headers} onChange={(v) => set('headers', v)} keyPlaceholder="Content-Type" valuePlaceholder="application/json" />
          </div>
        )}
      </div>

      {/* ── 5. QUERY PARAMS ──────────────────────────────────────── */}
      <div>
        <SectionHeader title="Query Parameters" open={sections.query} onToggle={() => toggle('query')} badge={queryBadge} />
        {sections.query && (
          <div className="py-4">
            <KVList items={cfg.query_params} onChange={(v) => set('query_params', v)} keyPlaceholder="limit" valuePlaceholder="10 o {{limite}}" />
          </div>
        )}
      </div>

      {/* ── 6. BODY ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Body" open={sections.body} onToggle={() => toggle('body')} badge={bodyBadge} />
        {sections.body && (
          <div className="py-4 space-y-4">
            <div className="flex gap-2">
              {([
                { v: 'none', l: 'Sin body' },
                { v: 'json', l: 'JSON' },
                { v: 'form', l: 'Form' },
                { v: 'raw',  l: 'Raw' },
              ] as { v: BodyType; l: string }[]).map(({ v, l }) => (
                <button
                  key={v} type="button"
                  onClick={() => set('body_type', v)}
                  className={cn(
                    'px-3 py-1.5 rounded-md border text-sm font-medium transition-colors',
                    cfg.body_type === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  )}
                >{l}</button>
              ))}
            </div>

            {(cfg.body_type === 'json' || cfg.body_type === 'raw') && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Usa <code className="bg-muted px-1 rounded">{'{{parametro}}'}</code> para valores dinámicos de la IA.
                </p>
                <textarea
                  value={cfg.body_content}
                  onChange={(e) => set('body_content', e.target.value)}
                  rows={8}
                  placeholder={cfg.body_type === 'json'
                    ? '{\n  "email": "{{email}}",\n  "nombre": "{{nombre}}"\n}'
                    : 'Contenido del body...'}
                  className="input resize-none font-mono text-sm leading-relaxed"
                />
              </div>
            )}

            {cfg.body_type === 'form' && (
              <KVList items={cfg.body_form} onChange={(v) => set('body_form', v)} keyPlaceholder="campo" valuePlaceholder="valor o {{parametro}}" />
            )}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="pt-4 flex gap-3 items-center">
        <button
          type="button" onClick={handleSave} disabled={saving}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar tool'}
        </button>
        <button
          type="button" onClick={onCancel}
          className="px-5 py-2 rounded-md text-sm font-medium border hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
