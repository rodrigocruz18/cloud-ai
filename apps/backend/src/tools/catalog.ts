export type ToolCategory = 'general' | 'email' | 'calendar' | 'storage' | 'crm' | 'ecommerce'

export interface CatalogTool {
  name: string
  label: string
  description: string
  category: ToolCategory
  integrationRequired: string | null
  icon: string
}

export const TOOL_CATALOG: CatalogTool[] = [
  {
    name: 'http.request',
    label: 'HTTP Request',
    description: 'Llamar cualquier API externa con GET, POST, PUT o DELETE',
    category: 'general',
    integrationRequired: null,
    icon: 'globe',
  },
]

export const TOOL_CATEGORIES: Record<ToolCategory, string> = {
  general:   'General',
  email:     'Email',
  calendar:  'Agenda / Reservas',
  storage:   'Almacenamiento',
  crm:       'CRM',
  ecommerce: 'E-commerce',
}
