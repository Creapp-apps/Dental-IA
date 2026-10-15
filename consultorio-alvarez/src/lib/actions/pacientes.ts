'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

import { getAuthenticatedTenantId, COLUMNAS_CLINICAS_EDITABLES, pacienteEnAlcance, tenantComparteClinica } from '@/lib/supabase/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActor, requireAdmin } from '@/lib/auth/actor'
import { derivarCamposClinicos, type AntecedentesSalud } from '@/lib/pacientes/antecedentes-salud'

async function getTenantId() {
    return await getAuthenticatedTenantId()
}

export async function searchPacientesAction(query: string, limit: number = 20, compact: boolean = true) {
    if (!query || query.trim().length < 2) return []
    const { searchPacientes } = await import('@/lib/supabase/queries')
    return await searchPacientes(query, limit, compact)
}

export async function getPacientesAgendaAction() {
    const { getPacientesCompactos } = await import('@/lib/supabase/queries')
    return await getPacientesCompactos(5000)
}

export async function getPacientesAction(limit: number = 50, offset: number = 0) {
    const { getPacientes } = await import('@/lib/supabase/queries')
    return await getPacientes(limit, offset)
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
    // Los datos de contacto del paciente son del admin. El profesional corrige
    // lo clínico por actualizarDatosClinicosPaciente.
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }

    const supabase = await createClient()
    const tenantId = actor.tenantId

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
            revalidatePath('/pacientes')
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

/**
 * Lo único que un profesional puede escribir sobre un paciente: motivo de
 * consulta, alergias, medicación y antecedentes. Ni teléfono, ni email, ni DNI.
 *
 * Corre con service_role a propósito: RLS no sabe restringir columnas y la
 * vista pacientes_clinico no es actualizable, así que la lista blanca vive acá,
 * en un solo archivo revisable.
 * Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §8
 */
export async function actualizarDatosClinicosPaciente(id: string, datos: {
    motivo_consulta?: string | null
    alergias?: string | null
    medicacion_actual?: string | null
    antecedentes?: string | null
    notas_internas?: string | null
}) {
    const { ok, actor, error: denied } = await requireActor()
    if (!ok) return { error: denied }

    // El profesional escribe sobre sus pacientes (los de su agenda); si el
    // consultorio comparte la info clínica, sobre cualquier paciente del tenant.
    // pacienteEnAlcance ya contempla ese flag. (§9)
    if (!(await pacienteEnAlcance(id))) {
        return { error: 'No autorizado: el paciente no está en tu alcance' }
    }

    // notas_internas sólo es escribible por el profesional cuando el consultorio
    // comparte la info clínica entre profesionales. Si no, se ignora.
    const columnasPermitidas: readonly string[] = (await tenantComparteClinica())
        ? [...COLUMNAS_CLINICAS_EDITABLES, 'notas_internas']
        : COLUMNAS_CLINICAS_EDITABLES

    const cambios = Object.fromEntries(
        Object.entries(datos)
            .filter(([columna]) => columnasPermitidas.includes(columna))
            .map(([columna, valor]) => [columna, valor === '' ? null : valor])
    )

    if (Object.keys(cambios).length === 0) {
        return { error: 'No hay datos clínicos para actualizar' }
    }

    const admin = createAdminClient()
    const { error } = await admin
        .from('pacientes')
        .update({ ...cambios, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', actor.tenantId)

    if (error) return { error: error.message }

    revalidatePath(`/pacientes/${id}`)
    return { success: true }
}

/**
 * Guarda la anamnesis ("Antecedentes de Salud") del paciente y, en el mismo
 * update, deriva alergias / medicacion_actual / antecedentes desde ella: la
 * anamnesis es la única fuente de esos tres campos. Mismo guard que la edición
 * clínica (admin siempre; profesional según alcance / flag de compartir).
 */
export async function guardarAntecedentesSalud(pacienteId: string, data: AntecedentesSalud) {
    const { ok, actor, error: denied } = await requireActor()
    if (!ok) return { error: denied }

    if (!(await pacienteEnAlcance(pacienteId))) {
        return { error: 'No autorizado: el paciente no está en tu alcance' }
    }

    const quienId = actor.profesionalId ?? actor.userId ?? null
    const derivados = derivarCamposClinicos(data)

    const anamnesis: AntecedentesSalud = {
        ...data,
        consentimiento: data.consentimiento
            ? { ...data.consentimiento, cargado_por: data.consentimiento.cargado_por ?? quienId }
            : undefined,
        actualizado_en: new Date().toISOString(),
        actualizado_por: quienId,
    }

    const admin = createAdminClient()
    const { error } = await admin
        .from('pacientes')
        .update({
            antecedentes_salud: anamnesis,
            alergias: derivados.alergias,
            medicacion_actual: derivados.medicacion_actual,
            antecedentes: derivados.antecedentes,
            updated_at: new Date().toISOString(),
        })
        .eq('id', pacienteId)
        .eq('tenant_id', actor.tenantId)

    if (error) return { error: error.message }

    revalidatePath(`/pacientes/${pacienteId}`)
    return { success: true }
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
    profesional_id?: string | null
}) {
    // Los datos de contacto del paciente son del admin. El profesional corrige
    // lo clínico por actualizarDatosClinicosPaciente.
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }

    const supabase = await createClient()
    const tenantId = actor.tenantId

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

    // alergias / medicacion_actual / antecedentes son propiedad de la anamnesis
    // ("Antecedentes de Salud"): este formulario no los escribe para no pisarlos.
    delete (payload as any).alergias
    delete (payload as any).medicacion_actual
    delete (payload as any).antecedentes

    // Clean form data — remove empty strings
    const cleanData = Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v])
    )

    const { error } = await supabase
        .from('pacientes')
        .update(cleanData)
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { error: error.message }

    revalidatePath('/pacientes')
    revalidatePath(`/pacientes/${id}`)
    return { success: true }
}

// Reasignación rápida del profesional de cabecera desde la tarjeta de la ficha.
// Solo admin (requireAdmin): el profesional ve el dato pero no lo cambia. Actualiza
// únicamente profesional_id para no pisar el resto (p. ej. obra_social).
export async function asignarProfesional(pacienteId: string, profesionalId: string | null) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }

    const supabase = await createClient()
    const tenantId = actor.tenantId

    const { error } = await supabase
        .from('pacientes')
        .update({ profesional_id: profesionalId || null })
        .eq('id', pacienteId)
        .eq('tenant_id', tenantId)

    if (error) return { error: error.message }

    revalidatePath('/pacientes')
    revalidatePath(`/pacientes/${pacienteId}`)
    return { success: true }
}

export async function eliminarPaciente(id: string) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }

    const supabase = await createClient()
    const tenantId = actor.tenantId

    const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

    if (error) return { error: error.message }

    revalidatePath('/pacientes')
    return { success: true }
}

export async function guardarOdontograma(pacienteId: string, pieza: string, estado: string, cara?: string, notas?: string) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    // Un profesional sólo escribe sobre sus pacientes (los de su agenda). (§9)
    if (!(await pacienteEnAlcance(pacienteId))) {
        return { error: 'No autorizado: el paciente no está en tu alcance' }
    }

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

const ODONTOGRAMA_TIPOS = ['ADULTO', 'NINO', 'MIXTO'] as const

/** Tipo de dentición del odontograma del paciente (adulto / niño / mixto). */
export async function actualizarOdontogramaTipo(pacienteId: string, tipo: string) {
    if (!(ODONTOGRAMA_TIPOS as readonly string[]).includes(tipo)) {
        return { error: 'Tipo de odontograma inválido' }
    }

    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    // Un profesional sólo escribe sobre sus pacientes (los de su agenda). (§9)
    if (!(await pacienteEnAlcance(pacienteId))) {
        return { error: 'No autorizado: el paciente no está en tu alcance' }
    }

    const { error } = await supabase
        .from('pacientes')
        .update({ odontograma_tipo: tipo, updated_at: new Date().toISOString() })
        .eq('id', pacienteId)
        .eq('tenant_id', tenantId)

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
