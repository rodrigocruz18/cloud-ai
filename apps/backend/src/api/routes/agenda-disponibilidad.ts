import type { FastifyInstance } from 'fastify'

// Standalone AgendaPro availability endpoint.
// Called by the bot via HTTP Request tool — no JWT auth required.
const AUTH_HEADER = 'Basic YXBpcDFsbW86aDlsOHdta3c5cWJoc2Y3aXpqcjZvcWljZTZjOTh0dmZpam9qbDcxZQ=='
const AGENDAPRO_BASE = 'https://agendapro.com/api/public/v1'

function toYMD(date: Date): string {
  return date.toISOString().split('T')[0]!
}

function monthName(date: Date): string {
  return date.toLocaleDateString('es-CL', { month: 'long' })
}

export async function agendaDisponibilidadRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tools/agenda-disponibilidad', async (request) => {
    const body = request.body as { service_id?: string; provider_id?: string; days?: number }
    const { service_id, provider_id } = body
    const days = (!body.days || body.days <= 0) ? 14 : body.days

    if (!service_id || !provider_id) {
      return { success: false, error: 'service_id y provider_id son requeridos' }
    }

    const disponibilidad: Record<string, string[]> = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < days; i++) {
      const fecha = new Date(today)
      fecha.setDate(today.getDate() + i)
      const fechaStr = toYMD(fecha)

      let data: Record<string, unknown>
      try {
        const res = await fetch(
          `${AGENDAPRO_BASE}/services/${service_id}/available_hours?date=${fechaStr}&provider_id=${provider_id}`,
          { headers: { Authorization: AUTH_HEADER } }
        )
        if (!res.ok) continue
        data = (await res.json()) as Record<string, unknown>
      } catch {
        continue
      }

      const horas = data['available_hours'] as Array<Record<string, string>> | null
      if (!horas || horas.length === 0) continue

      const dayName = data['day_name'] as string
      const dayNumber = data['day_number'] as string | number
      const clave = `${dayName} ${dayNumber} de ${monthName(fecha)}`

      disponibilidad[clave] = horas.map((slot) => slot['start_block'] ?? '')
    }

    return { success: true, data: disponibilidad }
  })
}
