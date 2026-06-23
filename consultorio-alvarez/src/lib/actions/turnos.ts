'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { normalizarTelefonoArgentino } from '@/lib/utils'

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

    // Defer emails, push notifications and path revalidations so they don't block the UI
    after(async () => {
        // --- DISPARAR NOTIFICACION PUSH AL PROFESIONAL ---
        try {
            const { createAdminClient } = await import('@/lib/supabase/admin')
            const admin = createAdminClient()
            const { data: usuarioProf } = await admin
                .from('usuarios')
                .select('id')
                .eq('profesional_id', formData.profesional_id)
                .eq('activo', true)
                .maybeSingle()

            if (usuarioProf?.id) {
                const [pacienteRes, tratamientoRes] = await Promise.all([
                    admin.from('pacientes').select('nombre, apellido').eq('id', formData.paciente_id).single(),
                    admin.from('tipos_tratamiento').select('nombre').eq('id', formData.tipo_tratamiento_id).single()
                ])

                const pct = pacienteRes.data
                const trat = tratamientoRes.data?.nombre || 'Consulta'

                const { format } = await import('date-fns')
                const { es } = await import('date-fns/locale')
                const fechaObj = new Date(formData.fecha_inicio)
                const fechaStr = format(fechaObj, "d/M 'a las' HH:mm", { locale: es })

                const { sendPushToUser } = await import('@/lib/push-notifications/send-push')
                await sendPushToUser(
                    usuarioProf.id,
                    '📅 Nuevo Turno Asignado',
                    `Paciente: ${pct?.nombre} ${pct?.apellido} - ${trat} (${fechaStr})`,
                    '/agenda'
                )
            }
        } catch (pushErr) {
            console.error('Error al enviar push al profesional en crearTurno:', pushErr)
        }

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
    })

    return { data }
}

export async function cambiarEstadoTurno(turnoId: string, nuevoEstado: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('turnos')
        .update({ estado: nuevoEstado })
        .eq('id', turnoId)

    if (error) return { error: error.message }

    after(async () => {
        // --- DISPARAR NOTIFICACION PUSH AL PROFESIONAL ---
        try {
            const { createAdminClient } = await import('@/lib/supabase/admin')
            const admin = createAdminClient()

            const { data: turno } = await admin
                .from('turnos')
                .select(`
                    fecha_inicio,
                    profesional_id,
                    paciente:pacientes(nombre, apellido, telefono),
                    profesional:profesionales(nombre, apellido),
                    tipo_treatment:tipos_tratamiento(nombre)
                `)
                .eq('id', turnoId)
                .single()

            if (turno) {
                // --- DISPARAR WHATSAPP AUTOMÁTICOS AL PACIENTE ---
                if (nuevoEstado === 'CONFIRMADO') {
                    await notificarTurnoPorWhatsApp(turnoId, 'turno_confirmado')
                } else if (nuevoEstado === 'CANCELADO') {
                    await notificarTurnoPorWhatsApp(turnoId, 'turno_cancelado')
                } else if (nuevoEstado === 'AUSENTE') {
                    await notificarTurnoPorWhatsApp(turnoId, 'aviso_ausencia')
                }

                const { data: usuarioProf } = await admin
                    .from('usuarios')
                    .select('id')
                    .eq('profesional_id', turno.profesional_id)
                    .eq('activo', true)
                    .maybeSingle()

                if (usuarioProf?.id) {
                    const pct = turno.paciente as any
                    const trat = ((turno as any).tipo_treatment || (turno as any).tipo_tratamiento)?.nombre || 'Consulta'

                    const { format } = await import('date-fns')
                    const { es } = await import('date-fns/locale')
                    const fechaObj = new Date(turno.fecha_inicio)
                    const fechaStr = format(fechaObj, "d/M 'a las' HH:mm", { locale: es })

                    let title = ''
                    let body = ''

                    if (nuevoEstado === 'CONFIRMADO') {
                        title = '📅 Turno Confirmado'
                        body = `Paciente: ${pct?.nombre} ${pct?.apellido} - ${trat} (${fechaStr})`
                    } else if (nuevoEstado === 'CANCELADO') {
                        title = '❌ Turno Cancelado'
                        body = `Paciente: ${pct?.nombre} ${pct?.apellido} - ${trat} (${fechaStr})`
                    } else if (nuevoEstado === 'EN_SALA') {
                        title = '🔔 Paciente en Sala'
                        body = `${pct?.nombre} ${pct?.apellido} ingresó a la sala de espera para ${trat}`
                    }

                    if (title && body) {
                        const { sendPushToUser } = await import('@/lib/push-notifications/send-push')
                        await sendPushToUser(usuarioProf.id, title, body, '/agenda')
                    }
                }
            }
        } catch (pushErr) {
            console.error('Error al enviar push en cambiarEstadoTurno:', pushErr)
        }

        revalidatePath('/agenda')
        revalidatePath('/admin')
    })

    return { success: true }
}

export async function moverTurno(turnoId: string, nuevaFechaInicio: string, nuevaFechaFin: string, nuevoProfesionalId?: string) {
    const supabase = await createClient()

    const updateFields: any = {
        fecha_inicio: nuevaFechaInicio,
        fecha_fin: nuevaFechaFin,
    }

    if (nuevoProfesionalId) {
        updateFields.profesional_id = nuevoProfesionalId
    }

    const { error } = await supabase
        .from('turnos')
        .update(updateFields)
        .eq('id', turnoId)

    if (error) return { error: error.message }

    after(async () => {
        // Enviar notificación de reprogramación de turno
        await notificarTurnoPorWhatsApp(turnoId, 'turno_reprogramado')
        revalidatePath('/agenda')
        revalidatePath('/admin')
    })

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

export async function getOcupacionProfesionalDia(profesionalId: string, fecha: string) {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    if (!tenantId) return []

    const localStart = new Date(`${fecha}T00:00:00-03:00`).toISOString()
    const localEnd = new Date(`${fecha}T23:59:59-03:00`).toISOString()

    const { data } = await supabase
        .from('turnos')
        .select('fecha_inicio, fecha_fin')
        .eq('tenant_id', tenantId)
        .eq('profesional_id', profesionalId)
        .in('estado', ['PENDIENTE', 'CONFIRMADO', 'EN_SALA'])
        .gte('fecha_inicio', localStart)
        .lte('fecha_inicio', localEnd)

    return data ?? []
}

export async function editarTurno(turnoId: string, formData: {
    paciente_id?: string
    profesional_id: string
    tipo_tratamiento_id: string
    fecha_inicio: string
    fecha_fin: string
    notas?: string
    prioridad_override?: string
    es_sobreturno?: boolean
}) {
    const supabase = await createClient()

    // Obtener la fecha anterior para saber si fue reprogramado
    const { data: oldTurno } = await supabase
        .from('turnos')
        .select('fecha_inicio')
        .eq('id', turnoId)
        .maybeSingle()

    const { data, error } = await supabase
        .from('turnos')
        .update({
            paciente_id: formData.paciente_id,
            profesional_id: formData.profesional_id,
            tipo_tratamiento_id: formData.tipo_tratamiento_id,
            fecha_inicio: formData.fecha_inicio,
            fecha_fin: formData.fecha_fin,
            notas: formData.notas || null,
            prioridad_override: formData.prioridad_override || null,
            es_sobreturno: formData.es_sobreturno ?? false,
        })
        .eq('id', turnoId)
        .select()
        .single()

    if (error) return { error: error.message }

    after(async () => {
        // Si la fecha de inicio cambió, enviamos notificación de reprogramación
        if (oldTurno?.fecha_inicio && new Date(oldTurno.fecha_inicio).getTime() !== new Date(formData.fecha_inicio).getTime()) {
            await notificarTurnoPorWhatsApp(turnoId, 'turno_reprogramado')
        }

        // --- DISPARAR NOTIFICACION PUSH AL PROFESIONAL ---
        try {
            const { createAdminClient } = await import('@/lib/supabase/admin')
            const admin = createAdminClient()
            const { data: usuarioProf } = await admin
                .from('usuarios')
                .select('id')
                .eq('profesional_id', formData.profesional_id)
                .eq('activo', true)
                .maybeSingle()

            if (usuarioProf?.id) {
                const pacienteId = formData.paciente_id
                if (pacienteId) {
                    const [pacienteRes, tratamientoRes] = await Promise.all([
                        admin.from('pacientes').select('nombre, apellido').eq('id', pacienteId).single(),
                        admin.from('tipos_tratamiento').select('nombre').eq('id', formData.tipo_tratamiento_id).single()
                    ])

                    const pct = pacienteRes.data
                    const trat = tratamientoRes.data?.nombre || 'Consulta'

                    const { format } = await import('date-fns')
                    const { es } = await import('date-fns/locale')
                    const fechaObj = new Date(formData.fecha_inicio)
                    const fechaStr = format(fechaObj, "d/M 'a las' HH:mm", { locale: es })

                    const { sendPushToUser } = await import('@/lib/push-notifications/send-push')
                    await sendPushToUser(
                        usuarioProf.id,
                        '✏️ Turno Modificado',
                        `Paciente: ${pct?.nombre} ${pct?.apellido} - ${trat} (${fechaStr})`,
                        '/agenda'
                    )
                }
            }
        } catch (pushErr) {
            console.error('Error al enviar push de modificación al profesional:', pushErr)
        }

        revalidatePath('/agenda')
        revalidatePath('/admin')
    })

    return { data }
}

export async function eliminarTurno(turnoId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('turnos')
        .delete()
        .eq('id', turnoId)

    if (error) return { error: error.message }

    after(() => {
        revalidatePath('/agenda')
        revalidatePath('/admin')
    })

    return { success: true }
}

// ==========================================
// FUNCIÓN AUXILIAR PARA NOTIFICACIONES WHATSAPP
// ==========================================
async function notificarTurnoPorWhatsApp(
    turnoId: string, 
    templateName: 'turno_confirmado' | 'turno_cancelado' | 'turno_reprogramado' | 'aviso_ausencia'
) {
    if (!process.env.META_WA_ACCESS_TOKEN || !process.env.META_WA_PHONE_NUMBER_ID) {
        console.log('⚠️ Variables de WhatsApp no configuradas en entorno.')
        return
    }

    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const admin = createAdminClient()

        const { data: turno } = await admin
            .from('turnos')
            .select(`
                fecha_inicio,
                paciente:pacientes(nombre, telefono),
                profesional:profesionales(nombre, apellido),
                tipo_tratamiento:tipos_tratamiento(nombre)
            `)
            .eq('id', turnoId)
            .single()

        if (!turno) {
            console.error(`❌ Turno ${turnoId} no encontrado para notificar WhatsApp (${templateName})`)
            return
        }

        const pct = turno.paciente as any
        const prof = turno.profesional as any

        if (!pct?.telefono) {
            console.log(`⚠️ El paciente no tiene teléfono registrado para notificar ${templateName}`)
            return
        }

        // Sanitizar teléfono para Meta API (regla de Argentina) usando helper robusto
        let cleanPhone = normalizarTelefonoArgentino(pct.telefono)

        const fechaObj = new Date(turno.fecha_inicio)
        const fechaStr = fechaObj.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'America/Argentina/Buenos_Aires'
        })
        const fechaStrFormatted = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)

        const horaStr = fechaObj.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires'
        })

        const nombreProf = prof ? `${prof.nombre.trim()} ${prof.apellido.trim()}` : 'el especialista'

        let parameters: { type: 'text'; text: string }[] = []
        if (templateName === 'aviso_ausencia') {
            // Cuerpo: Hola {{1}}! Notamos que no pudiste asistir a tu turno de hoy a las {{2}} con el Dr. {{3}}... (3 params)
            parameters = [
                { type: 'text', text: pct.nombre },
                { type: 'text', text: horaStr },
                { type: 'text', text: nombreProf }
            ]
        } else if (templateName === 'turno_confirmado') {
            // Cuerpo: Hola {{1}}! Turno confirmado para {{2}} el día {{3}} a las {{4}} con el Dr. {{5}}... (5 params)
            const tratamiento = (turno as any).tipo_tratamiento?.nombre || 'Consulta'
            parameters = [
                { type: 'text', text: pct.nombre },
                { type: 'text', text: tratamiento },
                { type: 'text', text: fechaStrFormatted },
                { type: 'text', text: horaStr },
                { type: 'text', text: nombreProf }
            ]
        } else {
            // templateName: 'turno_cancelado' | 'turno_reprogramado' (4 params)
            // Cuerpo: Hola {{1}}! ... turno para el dia {{2}} a las {{3}} con el Dr. {{4}}...
            parameters = [
                { type: 'text', text: pct.nombre },
                { type: 'text', text: fechaStrFormatted },
                { type: 'text', text: horaStr },
                { type: 'text', text: nombreProf }
            ]
        }

        console.log(`📤 Enviando plantilla "${templateName}" WhatsApp a ${cleanPhone}...`)

        const wpResponse = await fetch(`https://graph.facebook.com/v20.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.META_WA_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'es_AR' },
                    components: [
                        {
                            type: 'body',
                            parameters: parameters
                        }
                    ]
                }
            })
        })

        const wpResult = await wpResponse.json()
        if (!wpResponse.ok) {
            console.error(`❌ Error Meta WhatsApp API "${templateName}":`, JSON.stringify(wpResult, null, 2))
        } else {
            console.log(`✅ WhatsApp "${templateName}" enviado con éxito a`, cleanPhone)
        }
    } catch (err) {
        console.error(`❌ Error al procesar notificación WhatsApp "${templateName}":`, err)
    }
}
