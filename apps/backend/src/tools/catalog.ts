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
  // General
  {
    name: 'http.request',
    label: 'HTTP Request',
    description: 'Llamar cualquier API externa con GET, POST, PUT o DELETE',
    category: 'general',
    integrationRequired: null,
    icon: 'globe',
  },

  // Email
  {
    name: 'gmail.send_email',
    label: 'Gmail — Enviar email',
    description: 'Enviar correos electrónicos desde una cuenta Gmail',
    category: 'email',
    integrationRequired: 'gmail',
    icon: 'mail',
  },
  {
    name: 'gmail.search_messages',
    label: 'Gmail — Buscar emails',
    description: 'Buscar emails en la bandeja de entrada por criterios',
    category: 'email',
    integrationRequired: 'gmail',
    icon: 'mail',
  },

  // Storage
  {
    name: 'google_drive.search_docs',
    label: 'Google Drive — Buscar documentos',
    description: 'Buscar archivos y documentos en Google Drive',
    category: 'storage',
    integrationRequired: 'google_drive',
    icon: 'folder',
  },
  {
    name: 'google_drive.read_doc',
    label: 'Google Drive — Leer documento',
    description: 'Leer el contenido de un Google Doc o archivo',
    category: 'storage',
    integrationRequired: 'google_drive',
    icon: 'folder',
  },

  // Calendar / Booking
  {
    name: 'agendapro.get_availability',
    label: 'AgendaPro — Ver disponibilidad',
    description: 'Consultar horarios disponibles para agendar',
    category: 'calendar',
    integrationRequired: 'agendapro',
    icon: 'calendar',
  },
  {
    name: 'agendapro.create_booking',
    label: 'AgendaPro — Crear reserva',
    description: 'Agendar una cita o reserva para un cliente',
    category: 'calendar',
    integrationRequired: 'agendapro',
    icon: 'calendar',
  },

  // CRM
  {
    name: 'salesforce.search_customer',
    label: 'Salesforce — Buscar cliente',
    description: 'Buscar un contacto o cuenta en Salesforce CRM',
    category: 'crm',
    integrationRequired: 'salesforce',
    icon: 'users',
  },
  {
    name: 'salesforce.create_lead',
    label: 'Salesforce — Crear lead',
    description: 'Registrar un nuevo lead en Salesforce',
    category: 'crm',
    integrationRequired: 'salesforce',
    icon: 'users',
  },
  {
    name: 'hubspot.search_contact',
    label: 'HubSpot — Buscar contacto',
    description: 'Buscar un contacto en HubSpot CRM',
    category: 'crm',
    integrationRequired: 'hubspot',
    icon: 'users',
  },
  {
    name: 'hubspot.create_contact',
    label: 'HubSpot — Crear contacto',
    description: 'Crear un nuevo contacto en HubSpot',
    category: 'crm',
    integrationRequired: 'hubspot',
    icon: 'users',
  },

  // Ecommerce
  {
    name: 'shopify.get_order',
    label: 'Shopify — Ver pedido',
    description: 'Consultar el estado de un pedido en Shopify',
    category: 'ecommerce',
    integrationRequired: 'shopify',
    icon: 'shopping-bag',
  },
  {
    name: 'shopify.search_products',
    label: 'Shopify — Buscar productos',
    description: 'Buscar productos en el catálogo de Shopify',
    category: 'ecommerce',
    integrationRequired: 'shopify',
    icon: 'shopping-bag',
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
