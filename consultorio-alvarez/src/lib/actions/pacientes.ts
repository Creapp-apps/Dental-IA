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

export async function crearPaciente(formData: {
    nombre: string
    apellido: string
    foto_url?: string
    dni?: string
    fecha_nacimiento?: string
    genero?: string
    telefono?: string
    email?: string
    direccion?: string
    ciudad?: string
    obra_social_id?: string
    n_afiliado?: string
    alergias?: string
    medicacion_actual?: string
    antecedentes?: string
    notas_internas?: string
}) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    // Generar nro_historia_clinica
    const { count } = await supabase
        .from('pacientes')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

    const nro = `HC-${String((count ?? 0) + 1).padStart(5, '0')}`

    const { data, error } = await supabase
        .from('pacientes')
        .insert({
            tenant_id: tenantId,
            nro_historia_clinica: nro,
            nombre: formData.nombre,
            apellido: formData.apellido,
            foto_url: formData.foto_url || null,
            dni: formData.dni || null,
            fecha_nacimiento: formData.fecha_nacimiento || null,
            genero: formData.genero || null,
            telefono: formData.telefono || null,
            email: formData.email || null,
            direccion: formData.direccion || null,
            ciudad: formData.ciudad || null,
            obra_social_id: formData.obra_social_id || null,
            n_afiliado: formData.n_afiliado || null,
            alergias: formData.alergias || null,
            medicacion_actual: formData.medicacion_actual || null,
            antecedentes: formData.antecedentes || null,
            notas_internas: formData.notas_internas || null,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    revalidatePath('/pacientes')
    return { data }
}

export async function actualizarPaciente(id: string, formData: {
    nombre?: string
    apellido?: string
    foto_url?: string
    dni?: string
    fecha_nacimiento?: string
    genero?: string
    telefono?: string
    email?: string
    direccion?: string
    ciudad?: string
    obra_social_id?: string
    n_afiliado?: string
    alergias?: string
    medicacion_actual?: string
    antecedentes?: string
    notas_internas?: string
}) {
    const supabase = await createClient()

    // Clean form data — remove empty strings
    const cleanData = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v])
    )

    const { error } = await supabase
        .from('pacientes')
        .update(cleanData)
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/pacientes')
    revalidatePath(`/pacientes/${id}`)
    return { success: true }
}

export async function guardarOdontograma(pacienteId: string, pieza: string, estado: string, cara?: string, notas?: string) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    // Upsert: update if same pieza+cara exists, insert otherwise
    const { error } = await supabase
        .from('odontograma_piezas')
        .upsert({
            tenant_id: tenantId,
            paciente_id: pacienteId,
            pieza,
            estado,
            cara: cara || null,
            notas: notas || null,
        }, {
            onConflict: 'paciente_id,pieza,cara',
        })

    if (error) return { error: error.message }

    revalidatePath(`/pacientes/${pacienteId}`)
    return { success: true }
}

export async function getOdontogramaPaciente(pacienteId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('odontograma_piezas')
        .select('*')
        .eq('paciente_id', pacienteId)

    if (error) { console.error('getOdontograma:', error); return [] }
    return data ?? []
}
