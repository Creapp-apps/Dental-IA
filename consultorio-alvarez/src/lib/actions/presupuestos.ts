'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
async function getTenantId() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'alvarez')
        .single()
    return data?.id ?? null
}
export async function crearPresupuesto(data: {
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
}) {
    try {
        const supabase = await createClient()
        const tenantId = await getTenantId()
        if (!tenantId) return { error: 'No autorizado' }

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
                vigencia_dias: data.vigencia_dias || 30,
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
