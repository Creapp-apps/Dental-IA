import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWhatsAppCredentialsForTenant } from '@/lib/whatsapp'

export async function GET(request: NextRequest) {
    return handleSendRecalls(request)
}

export async function POST(request: NextRequest) {
    return handleSendRecalls(request)
}

// Suma meses cuidando fin de mes (ej: 31-ago + 6 = 28/29-feb, no 2-mar).
function sumarMeses(fechaIso: string, meses: number): Date {
    const d = new Date(fechaIso)
    const diaOriginal = d.getDate()
    d.setMonth(d.getMonth() + meses)
    if (d.getDate() < diaOriginal) d.setDate(0)
    return d
}

async function handleSendRecalls(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const keyParam = searchParams.get('key')
        const authHeader = request.headers.get('Authorization')
        const cronSecret = process.env.CRON_SECRET || 'ALVAREZ_CRON_SECRET_KEY'
        if (keyParam !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const admin = createAdminClient()
        const ahora = new Date()
        const nowIso = ahora.toISOString()

        // Todas las configuraciones de recall activas (service_role: sin RLS).
        const { data: configs, error: errCfg } = await admin
            .from('recall_configs')
            .select(`
                id, tenant_id, paciente_id, tipo_tratamiento_id, intervalo_meses, plantilla, ultimo_envio_at,
                paciente:pacientes(nombre, apellido, telefono),
                tipo_tratamiento:tipos_tratamiento(nombre),
                tenant:tenants(nombre)
            `)
            .eq('activo', true)

        if (errCfg) throw new Error(`Error consultando recall_configs: ${errCfg.message}`)
        if (!configs || configs.length === 0) {
            return NextResponse.json({ success: true, message: 'No hay recordatorios de control activos.' })
        }

        const results: any[] = []

        for (const c of configs as any[]) {
            const pct = c.paciente
            const tratNombre = c.tipo_tratamiento?.nombre || 'tu tratamiento'
            const consultorio = c.tenant?.nombre || 'tu consultorio'

            // 1. Ancla = último turno ATENDIDO del paciente para ese tratamiento.
            const { data: ult } = await admin
                .from('turnos')
                .select('fecha_inicio')
                .eq('tenant_id', c.tenant_id)
                .eq('paciente_id', c.paciente_id)
                .eq('tipo_tratamiento_id', c.tipo_tratamiento_id)
                .eq('estado', 'ATENDIDO')
                .order('fecha_inicio', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (!ult?.fecha_inicio) {
                results.push({ config_id: c.id, status: 'SKIPPED', reason: 'Sin turno ATENDIDO (sin ancla)' })
                continue
            }
            const anclaAt = ult.fecha_inicio as string

            // 2. Vencimiento.
            const vence = sumarMeses(anclaAt, c.intervalo_meses)
            if (ahora < vence) {
                results.push({ config_id: c.id, status: 'SKIPPED', reason: 'Todavía no vence' })
                continue
            }

            // 3. Dedupe por ciclo: ya se envió después del ancla actual.
            if (c.ultimo_envio_at && new Date(c.ultimo_envio_at) >= new Date(anclaAt)) {
                results.push({ config_id: c.id, status: 'SKIPPED', reason: 'Ya enviado en este ciclo' })
                continue
            }

            // 4. Ya tiene turno futuro de ese tratamiento → no molestar.
            const { data: futuro } = await admin
                .from('turnos')
                .select('id')
                .eq('tenant_id', c.tenant_id)
                .eq('paciente_id', c.paciente_id)
                .eq('tipo_tratamiento_id', c.tipo_tratamiento_id)
                .in('estado', ['PENDIENTE', 'CONFIRMADO', 'EN_SALA'])
                .gte('fecha_inicio', nowIso)
                .limit(1)
                .maybeSingle()

            if (futuro) {
                results.push({ config_id: c.id, status: 'SKIPPED', reason: 'Ya tiene turno futuro agendado' })
                continue
            }

            // 5. Validaciones de envío.
            if (!pct?.telefono) {
                await admin.from('recall_envios').insert({
                    tenant_id: c.tenant_id, recall_config_id: c.id, paciente_id: c.paciente_id,
                    tipo_tratamiento_id: c.tipo_tratamiento_id, estado_envio: 'FALLIDO',
                    ancla_at: anclaAt, error_detalle: 'Paciente sin teléfono',
                })
                results.push({ config_id: c.id, status: 'FAILED', reason: 'Paciente sin teléfono' })
                continue
            }

            const waCreds = await getWhatsAppCredentialsForTenant(c.tenant_id)
            if (!waCreds) {
                results.push({ config_id: c.id, status: 'SKIPPED', reason: 'WhatsApp no configurado para este consultorio' })
                continue
            }

            let cleanPhone = pct.telefono.replace(/\D/g, '')
            if (cleanPhone.startsWith('11') || cleanPhone.length === 10) {
                cleanPhone = `54${cleanPhone}`
            } else if (cleanPhone.startsWith('549')) {
                cleanPhone = cleanPhone.replace(/^549/, '54')
            }

            try {
                // 6. Enviar plantilla de recall. Botón quick_reply → MENU_TURNOS (flujo de agendamiento).
                const response = await fetch(`https://graph.facebook.com/v20.0/${waCreds.phoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${waCreds.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: cleanPhone,
                        type: 'template',
                        template: {
                            name: c.plantilla || 'recall_control_tratamiento',
                            language: { code: 'es_AR' },
                            components: [
                                {
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: pct.nombre || 'Hola' },
                                        { type: 'text', text: tratNombre },
                                        { type: 'text', text: consultorio },
                                    ],
                                },
                                {
                                    type: 'button',
                                    sub_type: 'quick_reply',
                                    index: '0',
                                    parameters: [{ type: 'payload', payload: 'MENU_TURNOS' }],
                                },
                            ],
                        },
                    }),
                })

                const resData = await response.json()

                if (!response.ok) {
                    await admin.from('recall_envios').insert({
                        tenant_id: c.tenant_id, recall_config_id: c.id, paciente_id: c.paciente_id,
                        tipo_tratamiento_id: c.tipo_tratamiento_id, estado_envio: 'FALLIDO',
                        telefono: cleanPhone, ancla_at: anclaAt,
                        error_detalle: resData?.error?.message || 'Error al invocar Meta API',
                    })
                    results.push({ config_id: c.id, status: 'FAILED', error: resData?.error?.message })
                } else {
                    // Éxito: marcar ciclo enviado + log.
                    await admin.from('recall_configs').update({ ultimo_envio_at: nowIso }).eq('id', c.id)
                    await admin.from('recall_envios').insert({
                        tenant_id: c.tenant_id, recall_config_id: c.id, paciente_id: c.paciente_id,
                        tipo_tratamiento_id: c.tipo_tratamiento_id, estado_envio: 'ENVIADO',
                        telefono: cleanPhone, ancla_at: anclaAt,
                    })
                    results.push({ config_id: c.id, status: 'SUCCESS' })
                }
            } catch (err: any) {
                await admin.from('recall_envios').insert({
                    tenant_id: c.tenant_id, recall_config_id: c.id, paciente_id: c.paciente_id,
                    tipo_tratamiento_id: c.tipo_tratamiento_id, estado_envio: 'FALLIDO',
                    telefono: cleanPhone, ancla_at: anclaAt, error_detalle: err.message || 'Excepción interna',
                })
                results.push({ config_id: c.id, status: 'FAILED', error: err.message })
            }
        }

        return NextResponse.json({ success: true, results })
    } catch (err: any) {
        console.error('❌ Excepción global en el cron de recall:', err)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
