'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================
// SERVER ACTIONS — Turnos
// ============================================================

// Temporal: obtener tenant_id sin auth
async function getTenantId() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'alvarez')
        .single()
    return data?.id ?? null
}

export async function crearTurno(formData: {
    paciente_id: string
    profesional_id: string
    tipo_tratamiento_id: string
    fecha_inicio: string
    fecha_fin: string
    notas?: string
    prioridad_override?: string
    es_sobreturno?: boolean
}) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const { data, error } = await supabase
        .from('turnos')
        .insert({
            tenant_id: tenantId,
            paciente_id: formData.paciente_id,
            profesional_id: formData.profesional_id,
            tipo_tratamiento_id: formData.tipo_tratamiento_id,
            fecha_inicio: formData.fecha_inicio,
            fecha_fin: formData.fecha_fin,
            notas: formData.notas || null,
            prioridad_override: formData.prioridad_override || null,
            estado: 'PENDIENTE',
            origen: 'SECRETARIA',
            es_sobreturno: formData.es_sobreturno ?? false,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    // --- INTEGRACIÓN RESEND ---
    if (process.env.RESEND_API_KEY) {
        try {
            const { Resend } = await import('resend')
            const { ConfirmacionTurnoEmail } = await import('@/components/emails/ConfirmacionTurnoEmail')
            const { format } = await import('date-fns')
            const { es } = await import('date-fns/locale')

            const resend = new Resend(process.env.RESEND_API_KEY)

            // Obtener información relacionada completa para armar el correo
            const [pacienteRes, profesionalRes, tratamientoRes] = await Promise.all([
                supabase.from('pacientes').select('nombre, email').eq('id', formData.paciente_id).single(),
                supabase.from('profesionales').select('nombre, apellido').eq('id', formData.profesional_id).single(),
                supabase.from('tipos_tratamiento').select('nombre').eq('id', formData.tipo_tratamiento_id).single()
            ])

            const paciente = pacienteRes.data
            if (paciente?.email) {
                const fechaObj = new Date(formData.fecha_inicio)
                const fechaStr = format(fechaObj, "EEEE d 'de' MMMM", { locale: es })
                const horaStr = format(fechaObj, "HH:mm")

                await resend.emails.send({
                    // 'onboarding@resend.dev' permite hacer tests a uno mismo sin verificar el dominio en la capa gratuita
                    from: 'Consultorio Alvarez <onboarding@resend.dev>',
                    to: paciente.email,
                    subject: 'Confirmación de Turno - Consultorio Alvarez',
                    react: ConfirmacionTurnoEmail({
                        pacienteNombre: paciente.nombre,
                        fecha: fechaStr,
                        hora: horaStr,
                        tratamiento: tratamientoRes.data?.nombre || 'Consulta M.',
                        profesional: `${profesionalRes.data?.nombre} ${profesionalRes.data?.apellido}`
                    })
                })
            }
        } catch (err) {
            console.error("Error al despachar el correo de confirmación de Resend:", err)
        }
    }
    // -------------------------

    revalidatePath('/agenda')
    revalidatePath('/dashboard')
    return { data }
}

export async function cambiarEstadoTurno(turnoId: string, nuevoEstado: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('turnos')
        .update({ estado: nuevoEstado })
        .eq('id', turnoId)

    if (error) return { error: error.message }

    revalidatePath('/agenda')
    revalidatePath('/admin')
    return { success: true }
}

export async function moverTurno(turnoId: string, nuevaFechaInicio: string, nuevaFechaFin: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('turnos')
        .update({
            fecha_inicio: nuevaFechaInicio,
            fecha_fin: nuevaFechaFin,
        })
        .eq('id', turnoId)

    if (error) return { error: error.message }

    revalidatePath('/agenda')
    revalidatePath('/admin')
    return { success: true }
}

export async function buscarPacientes(query: string) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    const { data, error } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido, dni, telefono')
        .eq('tenant_id', tenantId)
        .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,dni.ilike.%${query}%`)
        .limit(8)

    if (error) { console.error('buscarPacientes:', error); return [] }
    return data ?? []
}
