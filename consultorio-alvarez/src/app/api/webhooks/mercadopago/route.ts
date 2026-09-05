import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { notificarTurnoPorWhatsApp } from '@/lib/actions/turnos'

export async function GET() {
    return NextResponse.json({ status: 'Mercado Pago Webhook Active' }, { status: 200 })
}

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        let paymentId = searchParams.get('data.id') || searchParams.get('id')
        const type = searchParams.get('type') || searchParams.get('topic')

        // Si no vino por query param, leer body
        let body: any = {}
        try {
            body = await request.json()
            if (!paymentId) {
                paymentId = body?.data?.id || body?.id
            }
        } catch (_) {
            // Body vacío o no JSON
        }

        console.log(`💳 [MP Webhook] Evento recibido. Type: ${type || body?.type || body?.action}, PaymentId: ${paymentId}`)

        if (!paymentId) {
            return NextResponse.json({ status: 'ignored', message: 'No payment ID provided' }, { status: 200 })
        }

        const admin = createAdminClient()

        // 1. Obtener los tenants con integración de Mercado Pago activa
        const { data: integraciones, error: intErr } = await admin
            .from('tenant_integrations')
            .select('tenant_id, credentials')
            .eq('provider', 'mercadopago')
            .eq('is_active', true)

        if (intErr || !integraciones || integraciones.length === 0) {
            console.warn('⚠️ [MP Webhook] No hay integraciones de Mercado Pago configuradas.')
            return NextResponse.json({ status: 'no_integrations' }, { status: 200 })
        }

        // 2. Buscar el pago en Mercado Pago usando los tokens de los tenants
        let paymentData: any = null
        let tenantIdEncontrado: string | null = null

        for (const integ of integraciones) {
            const token = (integ.credentials as any)?.access_token
            if (!token) continue

            try {
                const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (res.ok) {
                    paymentData = await res.json()
                    tenantIdEncontrado = integ.tenant_id
                    break
                }
            } catch (fetchErr) {
                console.error(`Error consultando pago con tenant ${integ.tenant_id}:`, fetchErr)
            }
        }

        if (!paymentData) {
            console.warn(`⚠️ [MP Webhook] No se encontró el pago ${paymentId} en ningún tenant registrado.`)
            return NextResponse.json({ status: 'payment_not_found' }, { status: 200 })
        }

        console.log(`✅ [MP Webhook] Pago encontrado: ID=${paymentData.id}, Status=${paymentData.status}, ExternalRef=${paymentData.external_reference}`)

        const turnoId = paymentData.external_reference || paymentData.metadata?.turno_id
        const isApproved = paymentData.status === 'approved'

        if (turnoId && isApproved) {
            // 3. Obtener datos del turno
            const { data: turno } = await admin
                .from('turnos')
                .select(`
                    id,
                    tenant_id,
                    paciente_id,
                    profesional_id,
                    fecha_inicio,
                    notas,
                    paciente:pacientes(nombre, apellido),
                    profesional:profesionales(nombre, apellido),
                    tipo_treatment:tipos_tratamiento(nombre)
                `)
                .eq('id', turnoId)
                .single()

            if (turno) {
                const finalTenantId = turno.tenant_id || tenantIdEncontrado
                const montoAbonado = Number(paymentData.transaction_amount) || 0

                // Limpiar la nota de [SEÑA PENDIENTE] y marcar [SEÑA PAGADA]
                let notasActualizadas = turno.notas || ''
                if (notasActualizadas.includes('[SEÑA PENDIENTE')) {
                    notasActualizadas = notasActualizadas.replace(/\[SEÑA PENDIENTE:[^\]]+\]\n?/g, '')
                }
                notasActualizadas = `[SEÑA ABONADA MP: $${montoAbonado.toLocaleString('es-AR')} - Ref: ${paymentId}]\n` + notasActualizadas

                // Actualizar estado del turno a CONFIRMADO
                await admin
                    .from('turnos')
                    .update({
                        estado: 'CONFIRMADO',
                        notas: notasActualizadas
                    })
                    .eq('id', turnoId)

                console.log(`✅ [MP Webhook] Turno ${turnoId} actualizado a CONFIRMADO por pago de seña.`)

                // 4. Asentar cobro en la tabla cobros
                try {
                    await admin
                        .from('cobros')
                        .insert({
                            tenant_id: finalTenantId,
                            turno_id: turnoId,
                            paciente_id: turno.paciente_id,
                            monto_total: montoAbonado,
                            monto_pagado: montoAbonado,
                            metodo_pago: 'TARJETA',
                            estado: 'PAGADO',
                            fecha_pago: new Date().toISOString().split('T')[0],
                            notas: `Seña abonada online vía Mercado Pago (Pago #${paymentId})`
                        })
                    console.log(`💰 [MP Webhook] Cobro de seña registrado exitosamente para paciente ${turno.paciente_id}.`)
                } catch (cobroErr) {
                    console.error('Error insertando cobro de seña:', cobroErr)
                }

                // 5. Insertar notificación en tiempo real para el consultorio
                try {
                    const pct = turno.paciente as any
                    const pacienteNombre = pct ? `${pct.apellido?.toUpperCase() || ''} ${pct.nombre || ''}`.trim() : 'Paciente'

                    await admin.from('notificaciones').insert({
                        tenant_id: finalTenantId,
                        titulo: '💳 Seña Abonada Online',
                        mensaje: `${pacienteNombre} abonó la seña de $${montoAbonado.toLocaleString('es-AR')} para su turno. Turno confirmado automáticamente.`,
                        tipo: 'turno_confirmado',
                        referencia_id: turnoId,
                        leida: false
                    })
                } catch (notifErr) {
                    console.error('Error registrando notificación de seña:', notifErr)
                }

                // 6. Notificar al paciente por WhatsApp (Confirmación)
                try {
                    console.log(`[MP Webhook] Despachando WhatsApp de turno confirmado para turno ${turnoId}`)
                    await notificarTurnoPorWhatsApp(turnoId, 'turno_confirmado')
                } catch (waErr) {
                    console.error('Error enviando WhatsApp tras cobro de seña:', waErr)
                }

                revalidatePath('/agenda')
                revalidatePath('/cobros')
            }
        }

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error: any) {
        console.error('❌ Error general en Webhook de Mercado Pago:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
