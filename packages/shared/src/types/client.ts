export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: ClientStatus
  created_at: string
  updated_at: string
}

export type ClientStatus = 'active' | 'inactive'

export interface CreateClientInput {
  name: string
  email?: string
  phone?: string
}
