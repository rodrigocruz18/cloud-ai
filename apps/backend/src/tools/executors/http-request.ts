import type { ToolResult } from '@cloud-ai/shared'
import { decrypt } from '../../lib/encrypt.js'

interface KeyValue { key: string; value: string }
type AuthType = 'none' | 'api_key' | 'bearer' | 'basic'
type BodyType = 'none' | 'json' | 'form' | 'raw'

interface HttpRequestConfig {
  tool_name: string
  tool_description: string
  url: string
  method: string
  auth_type: AuthType
  auth_api_key_header: string
  auth_api_key_value: string
  auth_bearer_token: string
  auth_basic_username: string
  auth_basic_password: string
  headers: KeyValue[]
  query_params: KeyValue[]
  body_type: BodyType
  body_content: string
  body_form: KeyValue[]
}

// Replace {{variable}} placeholders with values from AI args
function interpolate(template: string, args: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = args[key]
    return value !== undefined ? String(value) : `{{${key}}}`
  })
}

function interpolateKV(items: KeyValue[], args: Record<string, unknown>): KeyValue[] {
  return items.map((kv) => ({
    key: interpolate(kv.key, args),
    value: interpolate(kv.value, args),
  }))
}

export async function executeHttpRequest(
  config: HttpRequestConfig,
  encryptedCredentials: string | null,
  args: Record<string, unknown>,
  toolCallId: string
): Promise<ToolResult> {
  // Decrypt credentials
  const credentials: Record<string, string> = {}
  if (encryptedCredentials) {
    try {
      Object.assign(credentials, JSON.parse(decrypt(encryptedCredentials)) as Record<string, string>)
    } catch {
      // credentials might not exist yet
    }
  }

  // Merge decrypted credentials back
  const cfg: HttpRequestConfig = {
    ...config,
    auth_api_key_value:  credentials['auth_api_key_value']  ?? config.auth_api_key_value,
    auth_bearer_token:   credentials['auth_bearer_token']   ?? config.auth_bearer_token,
    auth_basic_password: credentials['auth_basic_password'] ?? config.auth_basic_password,
  }

  // Build URL with interpolation + query params
  let url = interpolate(cfg.url, args)
  const queryParams = interpolateKV(cfg.query_params, args)
  if (queryParams.length > 0) {
    const qs = new URLSearchParams(
      queryParams.filter((kv) => kv.key).map((kv): [string, string] => [kv.key, kv.value])
    )
    url += (url.includes('?') ? '&' : '?') + qs.toString()
  }

  // Build headers
  const headers: Record<string, string> = {}

  // Custom headers
  for (const { key, value } of interpolateKV(cfg.headers, args)) {
    if (key) headers[key] = value
  }

  // Auth
  if (cfg.auth_type === 'api_key' && cfg.auth_api_key_header && cfg.auth_api_key_value) {
    headers[cfg.auth_api_key_header] = cfg.auth_api_key_value
  } else if (cfg.auth_type === 'bearer' && cfg.auth_bearer_token) {
    headers['Authorization'] = `Bearer ${cfg.auth_bearer_token}`
  } else if (cfg.auth_type === 'basic' && cfg.auth_basic_username) {
    const encoded = Buffer.from(`${cfg.auth_basic_username}:${cfg.auth_basic_password}`).toString('base64')
    headers['Authorization'] = `Basic ${encoded}`
  }

  // Build body
  let body: string | undefined
  if (cfg.body_type === 'json') {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
    body = interpolate(cfg.body_content, args)
  } else if (cfg.body_type === 'raw') {
    body = interpolate(cfg.body_content, args)
  } else if (cfg.body_type === 'form') {
    const form = new URLSearchParams()
    for (const { key, value } of interpolateKV(cfg.body_form, args)) {
      if (key) form.append(key, value)
    }
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = form.toString()
  }

  // Execute request
  let response: Response
  try {
    response = await fetch(url, {
      method: cfg.method,
      headers,
      body: ['GET', 'HEAD'].includes(cfg.method) ? undefined : body,
    })
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause)
    return { tool_call_id: toolCallId, content: `Error de red: ${msg}`, isError: true }
  }

  let responseText: string
  const contentType = response.headers.get('content-type') ?? ''
  try {
    responseText = await response.text()
    // Pretty-print JSON responses
    if (contentType.includes('application/json')) {
      responseText = JSON.stringify(JSON.parse(responseText), null, 2)
    }
  } catch {
    responseText = `HTTP ${response.status}`
  }

  if (!response.ok) {
    return {
      tool_call_id: toolCallId,
      content: `Error HTTP ${response.status}: ${responseText}`,
      isError: true,
    }
  }

  return {
    tool_call_id: toolCallId,
    content: responseText,
    isError: false,
  }
}
