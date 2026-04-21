'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTenantId() {
    const supabase = await createClient()
    const { data } = await supabase.from('tenants').select('id').eq('slug', 'alvarez').single()
    return data?.id ?? null
}

// ============================================================
// PRESUPUESTOS
// ============================================================

export async function crearPresupuesto(formData: {
    paciente_id: string
    profesional_id: string
    notas?: string
    items: Array<{
        tipo_tratamiento_id: string
        pieza_dental?: string
        descripcion?: string
        cantidad: number
        precio_unitario: number
    }>
}) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const montoTotal = formData.items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0)

    // Insert presupuesto
    const { data: presupuesto, error: pErr } = await supabase
        .from('presupuestos')
        .insert({
            tenant_id: tenantId,
            paciente_id: formData.paciente_id,
            profesional_id: formData.profesional_id,
            notas: formData.notas || null,
            monto_total: montoTotal,
            estado: 'BORRADOR',
        })
        .select()
        .single()

    if (pErr) return { error: pErr.message }

    // Insert items
    const items = formData.items.map((item, i) => ({
        presupuesto_id: presupuesto.id,
        tipo_tratamiento_id: item.tipo_tratamiento_id,
        pieza_dental: item.pieza_dental || null,
        descripcion: item.descripcion || null,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.cantidad * item.precio_unitario,
        orden: i,
    }))

    const { error: iErr } = await supabase.from('presupuesto_items').insert(items)
    if (iErr) return { error: iErr.message }

    revalidatePath('/pacientes')
    return { data: presupuesto }
}

export async function cambiarEstadoPresupuesto(id: string, estado: string) {
    const supabase = await createClient()
    const updates: any = { estado }
    if (estado === 'PRESENTADO') updates.fecha_presentacion = new Date().toISOString().split('T')[0]
    if (['APROBADO', 'RECHAZADO'].includes(estado)) updates.fecha_respuesta = new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('presupuestos').update(updates).eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/pacientes')
    return { success: true }
}

export async function getPresupuestosPaciente(pacienteId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('presupuestos')
        .select(`*, profesional:profesionales(nombre, apellido), items:presupuesto_items(*, tipo_tratamiento:tipos_tratamiento(nombre))`)
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false })

    if (error) { console.error('getPresupuestos:', error); return [] }
    return data ?? []
}

// ============================================================
// COBROS
// ============================================================

export async function crearCobro(formData: {
    paciente_id: string
    turno_id?: string
    monto_total: number
    monto_pagado: number
    metodo_pago: string
    obra_social_id?: string
}) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const estado = formData.monto_pagado >= formData.monto_total
        ? 'PAGADO'
        : formData.monto_pagado > 0 ? 'PARCIAL' : 'PENDIENTE'

    const { data, error } = await supabase
        .from('cobros')
        .insert({
            tenant_id: tenantId,
            paciente_id: formData.paciente_id,
            turno_id: formData.turno_id || null,
            monto_total: formData.monto_total,
            monto_pagado: formData.monto_pagado,
            metodo_pago: formData.metodo_pago,
            obra_social_id: formData.obra_social_id || null,
            estado,
            fecha_pago: formData.monto_pagado > 0 ? new Date().toISOString().split('T')[0] : null,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    revalidatePath('/cobros')
    revalidatePath('/admin')
    return { data }
}

export async function registrarPago(cobroId: string, montoPago: number) {
    const supabase = await createClient()

    const { data: cobro } = await supabase.from('cobros').select('monto_total, monto_pagado').eq('id', cobroId).single()
    if (!cobro) return { error: 'Cobro no encontrado' }

    const nuevoMontoPagado = cobro.monto_pagado + montoPago
    const nuevoEstado = nuevoMontoPagado >= cobro.monto_total ? 'PAGADO' : 'PARCIAL'

    const { error } = await supabase
        .from('cobros')
        .update({
            monto_pagado: nuevoMontoPagado,
            estado: nuevoEstado,
            fecha_pago: new Date().toISOString().split('T')[0],
        })
        .eq('id', cobroId)

    if (error) return { error: error.message }

    revalidatePath('/cobros')
    revalidatePath('/admin')
    return { success: true, nuevoEstado }
}

export async function getCobros(filtro?: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'todos') {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    let query = supabase
        .from('cobros')
        .select('*, paciente:pacientes(nombre, apellido, nro_historia_clinica)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

    if (filtro && filtro !== 'todos') {
        query = query.eq('estado', filtro)
    }

    const { data, error } = await query
    if (error) { console.error('getCobros:', error); return [] }
    return data ?? []
}
