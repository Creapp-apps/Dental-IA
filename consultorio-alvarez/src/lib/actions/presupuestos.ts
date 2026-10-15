'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireActor } from '@/lib/auth/actor'
import { VIGENCIA_DIAS_DEFAULT } from '@/lib/presupuestos/vigencia'

// Estados que se pueden setear a mano. 'VENCIDO' es derivado (se calcula al leer
// según la vigencia), nunca se escribe.
const ESTADOS_EDITABLES = ['BORRADOR', 'PRESENTADO', 'APROBADO', 'RECHAZADO'] as const

interface PresupuestoInput {
    paciente_id: string
    profesional_id: string
    estado?: string
    notas?: string
    fecha_presentacion?: string
    vigencia_dias?: number
    items: {
        tipo_tratamiento_id: string
        pieza_dental?: string
        descripcion?: string
        cantidad: number
        precio_unitario: number
        subtotal: number
    }[]
}

export async function crearPresupuesto(data: PresupuestoInput) {
    try {
        const { ok, actor, error: denied } = await requireActor()
        if (!ok) return { error: denied }
        const supabase = await createClient()
        const tenantId = actor.tenantId

        const monto_total = data.items.reduce((sum, item) => sum + item.subtotal, 0)

        // 1. Insertar el presupuesto (encabezado)
        const { data: presupuesto, error: presError } = await supabase
            .from('presupuestos')
            .insert({
                tenant_id: tenantId,
                paciente_id: data.paciente_id,
                profesional_id: data.profesional_id,
                estado: data.estado || 'PRESENTADO',
                notas: data.notas,
                fecha_presentacion: data.fecha_presentacion || new Date().toISOString().split('T')[0],
                vigencia_dias: data.vigencia_dias || VIGENCIA_DIAS_DEFAULT,
                monto_total: monto_total,
            })
            .select()
            .single()

        if (presError) throw new Error(`Error creando presupuesto: ${presError.message}`)

        // 2. Preparar e insertar los items
        const itemsToInsert = data.items.map((item, index) => ({
            presupuesto_id: presupuesto.id,
            tipo_tratamiento_id: item.tipo_tratamiento_id,
            pieza_dental: item.pieza_dental || null,
            descripcion: item.descripcion || null,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal,
            orden: index,
        }))

        if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
                .from('presupuesto_items')
                .insert(itemsToInsert)

            if (itemsError) throw new Error(`Error agregando items: ${itemsError.message}`)
        }

        revalidatePath(`/pacientes/${data.paciente_id}`)
        return { success: true, data: presupuesto }

    } catch (error: any) {
        console.error('Error in crearPresupuesto:', error)
        return { error: error.message || 'Ocurrió un error al crear el presupuesto' }
    }
}

/**
 * Cambia el estado de un presupuesto (Borrador/Presentado/Aprobado/Rechazado).
 * No permite 'VENCIDO' (es derivado de la vigencia). Al aprobar/rechazar sella
 * `fecha_respuesta`.
 */
export async function cambiarEstadoPresupuesto(id: string, estado: string) {
    const { ok, actor, error: denied } = await requireActor()
    if (!ok) return { error: denied }
    if (!(ESTADOS_EDITABLES as readonly string[]).includes(estado)) {
        return { error: 'Estado inválido' }
    }

    const supabase = await createClient()
    const update: Record<string, any> = { estado }
    if (estado === 'APROBADO' || estado === 'RECHAZADO') {
        update.fecha_respuesta = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase
        .from('presupuestos')
        .update(update)
        .eq('id', id)
        .eq('tenant_id', actor.tenantId)
        .select('paciente_id')
        .single()

    if (error) return { error: error.message }
    if (data?.paciente_id) revalidatePath(`/pacientes/${data.paciente_id}`)
    return { success: true }
}

/** Elimina un presupuesto (sus items caen por ON DELETE CASCADE). */
export async function eliminarPresupuesto(id: string) {
    const { ok, actor, error: denied } = await requireActor()
    if (!ok) return { error: denied }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('presupuestos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', actor.tenantId)
        .select('paciente_id')
        .single()

    if (error) return { error: error.message }
    if (data?.paciente_id) revalidatePath(`/pacientes/${data.paciente_id}`)
    return { success: true }
}

/**
 * Actualiza el encabezado y reemplaza los items de un presupuesto. Un
 * presupuesto ya respondido (Aprobado/Rechazado) no se edita.
 */
export async function actualizarPresupuesto(id: string, data: PresupuestoInput) {
    try {
        const { ok, actor, error: denied } = await requireActor()
        if (!ok) return { error: denied }
        const supabase = await createClient()
        const tenantId = actor.tenantId

        const { data: actual, error: fErr } = await supabase
            .from('presupuestos')
            .select('estado')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single()

        if (fErr || !actual) return { error: 'Presupuesto no encontrado' }
        if (actual.estado === 'APROBADO' || actual.estado === 'RECHAZADO') {
            return { error: 'Un presupuesto ya respondido no se puede editar' }
        }

        const estado = data.estado && (ESTADOS_EDITABLES as readonly string[]).includes(data.estado)
            ? data.estado
            : actual.estado
        const monto_total = data.items.reduce((sum, item) => sum + item.subtotal, 0)

        const { error: upErr } = await supabase
            .from('presupuestos')
            .update({
                profesional_id: data.profesional_id,
                estado,
                notas: data.notas,
                fecha_presentacion: data.fecha_presentacion || new Date().toISOString().split('T')[0],
                vigencia_dias: data.vigencia_dias || VIGENCIA_DIAS_DEFAULT,
                monto_total,
            })
            .eq('id', id)
            .eq('tenant_id', tenantId)

        if (upErr) throw new Error(`Error actualizando presupuesto: ${upErr.message}`)

        // Reemplazar los items.
        const { error: delErr } = await supabase
            .from('presupuesto_items')
            .delete()
            .eq('presupuesto_id', id)
        if (delErr) throw new Error(`Error reemplazando items: ${delErr.message}`)

        const itemsToInsert = data.items.map((item, index) => ({
            presupuesto_id: id,
            tipo_tratamiento_id: item.tipo_tratamiento_id,
            pieza_dental: item.pieza_dental || null,
            descripcion: item.descripcion || null,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal,
            orden: index,
        }))

        if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
                .from('presupuesto_items')
                .insert(itemsToInsert)
            if (itemsError) throw new Error(`Error agregando items: ${itemsError.message}`)
        }

        revalidatePath(`/pacientes/${data.paciente_id}`)
        return { success: true }

    } catch (error: any) {
        console.error('Error in actualizarPresupuesto:', error)
        return { error: error.message || 'Ocurrió un error al actualizar el presupuesto' }
    }
}
