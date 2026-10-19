// ============================================================
// Confirmación de la seña a partir de un pago aprobado de Mercado Pago.
// Fuente ÚNICA de verdad del "qué pasa cuando la seña se paga": la usan tanto
// el webhook (notificación de MP) como la reconciliación al volver del checkout
// (verificarPagoSenia). Es IDEMPOTENTE: confirma el turno sólo si estaba
// PENDIENTE, usando un update condicional como candado, así reintentos del
// webhook o solapamiento con la reconciliación no duplican cobro ni nota.
// ============================================================

import type { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { notificarTurnoPorWhatsApp } from '@/lib/actions/turnos'

type Admin = ReturnType<typeof createAdminClient>

export type ResultadoConfirmacion =
    | { status: 'confirmed' }
    | { status: 'already' }
    | { status: 'not_approved' }
    | { status: 'turno_not_found' }

// Arma la nota del turno tras pagar: saca la marca de seña pendiente y antepone
// la de seña abonada con el id del pago (sirve de rastro del pago). Función pura.
export function construirNotasSeniaAbonada(
    notasActuales: string | null | undefined,
    monto: number,
    paymentId: string | number,
): string {
    let notas = notasActuales || ''
    if (notas.includes('[SEÑA PENDIENTE')) {
        notas = notas.replace(/\[SEÑA PENDIENTE:[^\]]+\]\n?/g, '')
    }
    return `[SEÑA ABONADA MP: $${monto.toLocaleString('es-AR')} - Ref: ${paymentId}]\n` + notas
}

export async function confirmarSeniaPorPago(
    admin: Admin,
    paymentData: any,
): Promise<ResultadoConfirmacion> {
    const turnoId = paymentData?.external_reference || paymentData?.metadata?.turno_id
    if (!turnoId) return { status: 'turno_not_found' }
    if (paymentData?.status !== 'approved') return { status: 'not_approved' }

    const paymentId = paymentData.id
    const montoAbonado = Number(paymentData.transaction_amount) || 0

    // 1. Datos del turno (incluye estado y notas actuales).
    const { data: turno } = await admin
        .from('turnos')
        .select('id, tenant_id, paciente_id, estado, notas, paciente:pacientes(nombre, apellido)')
        .eq('id', turnoId)
        .maybeSingle()

    if (!turno) return { status: 'turno_not_found' }

    const notasActualizadas = construirNotasSeniaAbonada(turno.notas, montoAbonado, paymentId)

    // 2. Candado de idempotencia: confirmamos SÓLO si sigue PENDIENTE. El update
    // condicional es atómico por fila, así el segundo en llegar (reintento del
    // webhook o la reconciliación) ve 0 filas afectadas y no duplica nada.
    const { data: confirmados } = await admin
        .from('turnos')
        .update({ estado: 'CONFIRMADO', notas: notasActualizadas })
        .eq('id', turnoId)
        .eq('estado', 'PENDIENTE')
        .select('id')

    if (!confirmados || confirmados.length === 0) {
        // Ya estaba confirmado, cancelado u otro estado: no repetimos el cobro.
        return { status: 'already' }
    }

    const finalTenantId = turno.tenant_id

    // 3. Asentar el cobro.
    try {
        await admin.from('cobros').insert({
            tenant_id: finalTenantId,
            turno_id: turnoId,
            paciente_id: turno.paciente_id,
            monto_total: montoAbonado,
            monto_pagado: montoAbonado,
            metodo_pago: 'TARJETA',
            estado: 'PAGADO',
            fecha_pago: new Date().toISOString().split('T')[0],
            notas: `Seña abonada online vía Mercado Pago (Pago #${paymentId})`,
        })
    } catch (cobroErr) {
        console.error('Error insertando cobro de seña:', cobroErr)
    }

    // 4. Notificación en tiempo real para el consultorio.
    try {
        const pct = turno.paciente as any
        const pacienteNombre = pct ? `${pct.apellido?.toUpperCase() || ''} ${pct.nombre || ''}`.trim() : 'Paciente'
        await admin.from('notificaciones').insert({
            tenant_id: finalTenantId,
            titulo: '💳 Seña Abonada Online',
            mensaje: `${pacienteNombre} abonó la seña de $${montoAbonado.toLocaleString('es-AR')} para su turno. Turno confirmado automáticamente.`,
            tipo: 'turno_confirmado',
            referencia_id: turnoId,
            leida: false,
        })
    } catch (notifErr) {
        console.error('Error registrando notificación de seña:', notifErr)
    }

    // 5. WhatsApp de confirmación al paciente.
    try {
        await notificarTurnoPorWhatsApp(turnoId, 'turno_confirmado')
    } catch (waErr) {
        console.error('Error enviando WhatsApp tras cobro de seña:', waErr)
    }

    revalidatePath('/agenda')
    revalidatePath('/cobros')
    return { status: 'confirmed' }
}
