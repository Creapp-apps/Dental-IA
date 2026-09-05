'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

import { getAuthenticatedTenantId } from '@/lib/supabase/queries'

async function getTenantId() {
    return await getAuthenticatedTenantId()
}

export async function searchPacientesAction(query: string, limit: number = 20) {
    if (!query || query.trim().length < 2) return []
    const { searchPacientes } = await import('@/lib/supabase/queries')
    return await searchPacientes(query, limit)
}

export async function crearPaciente(formData: {
    nro_historia_clinica?: string
    nombre: string
    apellido: string
    foto_url?: string
    dni?: string
    cuit?: string
    fecha_nacimiento?: string
    genero?: string
    telefono?: string
    email?: string
    direccion?: string
    ciudad?: string
    obra_social_id?: string
    plan_obra_social?: string
    n_afiliado?: string
    alergias?: string
    medicacion_actual?: string
    antecedentes?: string
    notas_internas?: string
    registro_completo?: boolean
}) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    let finalObraSocialId = formData.obra_social_id || null

    if (finalObraSocialId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalObraSocialId)) {
        const customName = finalObraSocialId.trim()
        
        // Buscar si ya existe una con ese nombre (case-insensitive) para este tenant
        const { data: existing } = await supabase
            .from('obras_sociales')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('nombre', customName)
            .maybeSingle()

        if (existing) {
            finalObraSocialId = existing.id
        } else {
            // Crear una nueva obra social con ese nombre
            const { data: created, error: createError } = await supabase
                .from('obras_sociales')
                .insert({
                    tenant_id: tenantId,
                    nombre: customName,
                    activo: true
                })
                .select('id')
                .single()
            
            if (createError) {
                return { error: `Error al crear obra social: ${createError.message}` }
            }
            finalObraSocialId = created.id
        }
    }

    let attempts = 0
    let lastError: any = null

    while (attempts < 3) {
        const nextHC = (attempts === 0 && formData.nro_historia_clinica?.trim())
            ? formData.nro_historia_clinica.trim()
            : await getNextNroHistoriaClinica(tenantId, supabase)

        const { data, error } = await supabase
            .from('pacientes')
            .insert({
                tenant_id: tenantId,
                nro_historia_clinica: nextHC,
                nombre: formData.nombre,
                apellido: formData.apellido,
                foto_url: formData.foto_url || null,
                dni: formData.dni || null,
                cuit: formData.cuit || null,
                fecha_nacimiento: formData.fecha_nacimiento || null,
                genero: formData.genero || null,
                telefono: formData.telefono || null,
                email: formData.email || null,
                direccion: formData.direccion || null,
                ciudad: formData.ciudad || null,
                obra_social_id: finalObraSocialId,
                plan_obra_social: formData.plan_obra_social || null,
                n_afiliado: formData.n_afiliado || null,
                alergias: formData.alergias || null,
                medicacion_actual: formData.medicacion_actual || null,
                antecedentes: formData.antecedentes || null,
                notas_internas: formData.notas_internas || null,
                registro_completo: formData.registro_completo !== undefined ? formData.registro_completo : true,
            })
            .select()
            .single()

        if (!error) {
            after(() => {
                revalidatePath('/pacientes')
            })
            return { data }
        }

        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('pacientes_tenant_id_nro_historia_clinica_key')) {
            lastError = error
            attempts++
            continue
        } else {
            return { error: error.message }
        }
    }

    return { error: lastError?.message || 'Error al generar un número de historia clínica único.' }
}

export async function actualizarPaciente(id: string, formData: {
    nro_historia_clinica?: string
    nombre?: string
    apellido?: string
    foto_url?: string
    dni?: string
    cuit?: string
    fecha_nacimiento?: string
    genero?: string
    telefono?: string
    email?: string
    direccion?: string
    ciudad?: string
    obra_social_id?: string
    plan_obra_social?: string
    n_afiliado?: string
    alergias?: string
    medicacion_actual?: string
    antecedentes?: string
    notas_internas?: string
    registro_completo?: boolean
}) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    let finalObraSocialId = formData.obra_social_id || null

    if (finalObraSocialId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalObraSocialId)) {
        const customName = finalObraSocialId.trim()
        
        // Buscar si ya existe una con ese nombre (case-insensitive) para este tenant
        const { data: existing } = await supabase
            .from('obras_sociales')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('nombre', customName)
            .maybeSingle()

        if (existing) {
            finalObraSocialId = existing.id
        } else {
            // Crear una nueva obra social con ese nombre
            const { data: created, error: createError } = await supabase
                .from('obras_sociales')
                .insert({
                    tenant_id: tenantId,
                    nombre: customName,
                    activo: true
                })
                .select('id')
                .single()
            
            if (createError) {
                return { error: `Error al crear obra social: ${createError.message}` }
            }
            finalObraSocialId = created.id
        }
    }

    const payload = {
        ...formData,
        obra_social_id: finalObraSocialId
    }

    // Clean form data — remove empty strings
    const cleanData = Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v])
    )

    const { error } = await supabase
        .from('pacientes')
        .update(cleanData)
        .eq('id', id)

    if (error) return { error: error.message }

    after(() => {
        revalidatePath('/pacientes')
        revalidatePath(`/pacientes/${id}`)
    })
    return { success: true }
}

export async function eliminarPaciente(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }

    after(() => {
        revalidatePath('/pacientes')
    })
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

    after(() => {
        revalidatePath(`/pacientes/${pacienteId}`)
    })
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

export async function getNextNroHistoriaClinica(tenantId: string, supabase: any): Promise<string> {
    const { data } = await supabase
        .from('pacientes')
        .select('nro_historia_clinica')
        .eq('tenant_id', tenantId)
        .limit(5000)

    let maxNum = 0
    if (data && data.length > 0) {
        for (const p of data) {
            if (!p.nro_historia_clinica) continue
            const clean = p.nro_historia_clinica.replace(/\D/g, '')
            if (clean) {
                const num = parseInt(clean, 10)
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num
                }
            }
        }
    }

    if (maxNum === 0) {
        maxNum = 999 // so initial candidate is '1000'
    }

    let nextNum = maxNum + 1
    let candidate = nextNum.toString().padStart(4, '0')

    // Verification loop: check if candidate already exists in database
    let attempts = 0
    while (attempts < 100) {
        const { data: existing } = await supabase
            .from('pacientes')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('nro_historia_clinica', candidate)
            .maybeSingle()

        if (!existing) {
            return candidate
        }
        nextNum++
        candidate = nextNum.toString().padStart(4, '0')
        attempts++
    }

    return candidate
}
