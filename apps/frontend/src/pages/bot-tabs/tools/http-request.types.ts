export type HttpMethod  = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
export type AuthType    = 'none' | 'api_key' | 'bearer' | 'basic'
export type BodyType    = 'none' | 'json' | 'form' | 'raw'
export type ParamType   = 'string' | 'number' | 'boolean'

export interface KeyValue {
  key: string
  value: string
}

export interface AIParameter {
  name: string
  description: string
  type: ParamType
  required: boolean
}

export interface HttpRequestConfig {
  // Identidad para la IA
  tool_name: string
  tool_description: string
  ai_parameters: AIParameter[]

  // HTTP
  url: string
  method: HttpMethod

  // Auth
  auth_type: AuthType
  auth_api_key_header: string  // nombre del header (ej: X-Api-Key)
  auth_api_key_value: string   // el valor (va cifrado)
  auth_bearer_token: string    // (va cifrado)
  auth_basic_username: string
  auth_basic_password: string  // (va cifrado)

  // Headers y query params
  headers: KeyValue[]
  query_params: KeyValue[]

  // Body
  body_type: BodyType
  body_content: string         // JSON o raw text
  body_form: KeyValue[]
}

export const EMPTY_CONFIG: HttpRequestConfig = {
  tool_name: '',
  tool_description: '',
  ai_parameters: [],
  url: '',
  method: 'GET',
  auth_type: 'none',
  auth_api_key_header: '',
  auth_api_key_value: '',
  auth_bearer_token: '',
  auth_basic_username: '',
  auth_basic_password: '',
  headers: [],
  query_params: [],
  body_type: 'none',
  body_content: '',
  body_form: [],
}
