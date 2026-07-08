'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { normalizarTelefonoArgentino, limpiarTituloProfesional } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { sendPushToUser } from '@/lib/push-notifications/send-push'
import { Resend } from 'resend'
import { ConfirmacionTurnoEmail } from '@/components/emails/ConfirmacionTurnoEmail'


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

    // --- DISPARAR NOTIFICACION PUSH AL PROFESIONAL ---
    try {
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

            const fechaObj = new Date(formData.fecha_inicio)
            const fechaStr = format(fechaObj, "d/M 'a las' HH:mm", { locale: es })

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

    // --- INTEGRACIÓN WHATSAPP ---
    try {
        await notificarTurnoPorWhatsApp(data.id, 'solicitud_turnos')
    } catch (waErr) {
        console.error('Error al enviar WhatsApp en crearTurno:', waErr)
    }

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

    // --- DISPARAR NOTIFICACIONES WHATSAPP Y PUSH ---
    console.log(`[ACTION LOG] Disparando notificaciones en cambiarEstadoTurno para turno: ${turnoId}, estado: ${nuevoEstado}`)
    try {
        const admin = createAdminClient()

        const { data: turno, error: queryErr } = await admin
            .from('turnos')
            .select(`
                fecha_inicio,
                profesional_id,
                paciente:pacientes(nombre, apellido, telefono),
                profesional:profesionales(nombre, apellido),
                tipo_tratamiento:tipos_tratamiento(nombre)
            `)
            .eq('id', turnoId)
            .single()

        if (queryErr) {
            console.error(`[ACTION LOG] Error al obtener el turno en cambiarEstadoTurno:`, queryErr.message)
        }

        if (turno) {
            const pct = turno.paciente as any
            console.log(`[ACTION LOG] Turno encontrado para notificaciones. Paciente: ${pct?.nombre}, Teléfono: ${pct?.telefono}`)
            // --- DISPARAR WHATSAPP AUTOMÁTICOS AL PACIENTE ---
            try {
                if (nuevoEstado === 'CONFIRMADO') {
                    console.log(`[ACTION LOG] Ejecutando notificarTurnoPorWhatsApp con "turno_confirmado"`)
                    await notificarTurnoPorWhatsApp(turnoId, 'turno_confirmado')
                } else if (nuevoEstado === 'CANCELADO') {
                    console.log(`[ACTION LOG] Ejecutando notificarTurnoPorWhatsApp con "turno_cancelado"`)
                    await notificarTurnoPorWhatsApp(turnoId, 'turno_cancelado')
                } else if (nuevoEstado === 'AUSENTE') {
                    console.log(`[ACTION LOG] Ejecutando notificarTurnoPorWhatsApp con "aviso_ausencia"`)
                    await notificarTurnoPorWhatsApp(turnoId, 'aviso_ausencia')
                }
            } catch (waErr) {
                console.error('[ACTION LOG] Error al enviar WhatsApp en cambiarEstadoTurno:', waErr)
            }

            // --- DISPARAR PUSH AL PROFESIONAL ---
            try {
                const { data: usuarioProf } = await admin
                    .from('usuarios')
                    .select('id')
                    .eq('profesional_id', turno.profesional_id)
                    .eq('activo', true)
                    .maybeSingle()

                if (usuarioProf?.id) {
                    const pct = turno.paciente as any
                    const trat = (turno.tipo_tratamiento as any)?.nombre || 'Consulta'

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
                        console.log(`[ACTION LOG] Enviando push a profesional ${usuarioProf.id}: ${title} - ${body}`)
                        await sendPushToUser(usuarioProf.id, title, body, '/agenda')
                    }
                }
            } catch (pushErr) {
                console.error('[ACTION LOG] Error al enviar push al profesional en cambiarEstadoTurno:', pushErr)
            }
        } else {
            console.warn('[ACTION LOG] No se pudo obtener el turno de la base de datos, omitiendo notificaciones.')
        }
    } catch (err) {
        console.error('[ACTION LOG] Error general en notificaciones de cambiarEstadoTurno:', err)
    }

    revalidatePath('/agenda')
    revalidatePath('/admin')

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

    // Enviar notificación de reprogramación de turno
    try {
        await notificarTurnoPorWhatsApp(turnoId, 'turno_reprogramado')
    } catch (waErr) {
        console.error('Error al enviar WhatsApp en moverTurno:', waErr)
    }

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

    // Si la fecha de inicio cambió, enviamos notificación de reprogramación
    if (oldTurno?.fecha_inicio && new Date(oldTurno.fecha_inicio).getTime() !== new Date(formData.fecha_inicio).getTime()) {
        try {
            await notificarTurnoPorWhatsApp(turnoId, 'turno_reprogramado')
        } catch (waErr) {
            console.error('Error al enviar WhatsApp en editarTurno:', waErr)
        }
    }

    // --- DISPARAR NOTIFICACION PUSH AL PROFESIONAL ---
    try {
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

                const fechaObj = new Date(formData.fecha_inicio)
                const fechaStr = format(fechaObj, "d/M 'a las' HH:mm", { locale: es })

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

    return { data }
}

export async function eliminarTurno(turnoId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('turnos')
        .delete()
        .eq('id', turnoId)

    if (error) return { error: error.message }

    revalidatePath('/agenda')
    revalidatePath('/admin')

    return { success: true }
}

// ==========================================
// FUNCIÓN AUXILIAR PARA NOTIFICACIONES WHATSAPP
// ==========================================
export async function notificarTurnoPorWhatsApp(
    turnoId: string, 
    templateName: 'turno_confirmado' | 'turno_cancelado' | 'turno_reprogramado' | 'aviso_ausencia' | 'solicitud_turnos'
) {
    console.log(`[WA LOG] Iniciando notificarTurnoPorWhatsApp para turnoId: ${turnoId}, plantilla: "${templateName}"`)
    if (!process.env.META_WA_ACCESS_TOKEN || !process.env.META_WA_PHONE_NUMBER_ID) {
        console.log('[WA LOG] ⚠️ Variables de WhatsApp no configuradas en el entorno (META_WA_ACCESS_TOKEN o META_WA_PHONE_NUMBER_ID faltantes).')
        return
    }

    try {
        const admin = createAdminClient()

        const { data: turno, error: fetchErr } = await admin
            .from('turnos')
            .select(`
                tenant_id,
                fecha_inicio,
                paciente:pacientes(nombre, telefono),
                profesional:profesionales(nombre, apellido),
                tipo_tratamiento:tipos_tratamiento(nombre)
            `)
            .eq('id', turnoId)
            .single()

        if (fetchErr || !turno) {
            console.error(`[WA LOG] ❌ Turno ${turnoId} no encontrado para notificar WhatsApp (${templateName}). Error:`, fetchErr?.message)
            return
        }

        const pct = turno.paciente as any
        const prof = turno.profesional as any

        if (!pct?.telefono) {
            console.log(`[WA LOG] ⚠️ El paciente no tiene teléfono registrado para notificar ${templateName}`)
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

        const nombreProf = prof ? `${limpiarTituloProfesional(prof.nombre)} ${prof.apellido.trim()}` : 'el especialista'

        let parameters: { type: 'text'; text: string }[] = []
        if (templateName === 'aviso_ausencia') {
            // Cuerpo: Hola {{1}}! Notamos que no pudiste asistir a tu turno de hoy a las {{2}} con el Dr. {{3}}... (3 params)
            parameters = [
                { type: 'text', text: pct.nombre },
                { type: 'text', text: horaStr },
                { type: 'text', text: nombreProf }
            ]
        } else if (templateName === 'turno_confirmado' || templateName === 'solicitud_turnos') {
            // Cuerpo: Hola {{1}}! Turno confirmado/solicitado para {{2}} el día {{3}} a las {{4}} con el Dr. {{5}}... (5 params)
            let tratamiento = (turno as any).tipo_tratamiento?.nombre || 'Consulta'
            if (templateName === 'solicitud_turnos') {
                tratamiento = tratamiento.toUpperCase()
            }
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

        console.log(`[WA LOG] Preparando envío Meta a ${cleanPhone} con plantilla "${templateName}". Parámetros:`, JSON.stringify(parameters, null, 2))

        const requestBody = {
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
        }

        console.log(`[WA LOG] Realizando fetch a Graph Facebook para plantilla "${templateName}"...`)

        const wpResponse = await fetch(`https://graph.facebook.com/v20.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.META_WA_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })

        const wpResult = await wpResponse.json()
        if (!wpResponse.ok) {
            console.error(`[WA LOG] ❌ Error Meta WhatsApp API "${templateName}" (Status ${wpResponse.status}):`, JSON.stringify(wpResult, null, 2))
            await admin.from('recordatorios').insert({
                tenant_id: turno.tenant_id,
                turno_id: turnoId,
                canal: 'WHATSAPP',
                estado_envio: 'FALLIDO',
                telefono: cleanPhone,
                mensaje_enviado: `Plantilla: ${templateName}. Parámetros: ${JSON.stringify(parameters)}`,
                error_detalle: wpResult?.error?.message || 'Error al invocar Meta API'
            })
        } else {
            console.log(`[WA LOG] ✅ WhatsApp "${templateName}" enviado con éxito a ${cleanPhone}. Result:`, JSON.stringify(wpResult, null, 2))
            await admin.from('recordatorios').insert({
                tenant_id: turno.tenant_id,
                turno_id: turnoId,
                canal: 'WHATSAPP',
                estado_envio: 'ENVIADO',
                telefono: cleanPhone,
                mensaje_enviado: `Plantilla: ${templateName}. Parámetros: ${JSON.stringify(parameters)}`,
                fecha_envio: new Date().toISOString()
            })
        }
    } catch (err) {
        console.error(`[WA LOG] ❌ Error al procesar notificación WhatsApp "${templateName}":`, err)
    }
}

export async function enviarRecordatorioManual(turnoId: string) {
    console.log(`[WA LOG] Iniciando enviarRecordatorioManual para turnoId: ${turnoId}`)
    if (!process.env.META_WA_ACCESS_TOKEN || !process.env.META_WA_PHONE_NUMBER_ID) {
        return { error: 'Variables de WhatsApp no configuradas en el entorno (META_WA_ACCESS_TOKEN o META_WA_PHONE_NUMBER_ID faltantes).' }
    }

    try {
        const admin = createAdminClient()

        const { data: turno, error: fetchErr } = await admin
            .from('turnos')
            .select(`
                id,
                fecha_inicio,
                tenant_id,
                paciente:pacientes(nombre, telefono),
                profesional:profesionales(nombre, apellido),
                tipo_treatment:tipos_tratamiento(nombre)
            `)
            .eq('id', turnoId)
            .single()

        if (fetchErr || !turno) {
            return { error: `Turno no encontrado. Error: ${fetchErr?.message}` }
        }

        const pct = turno.paciente as any
        const prof = turno.profesional as any
        const trat = (turno as any).tipo_treatment?.nombre || 'Consulta'

        if (!pct?.telefono) {
            return { error: 'El paciente no tiene un teléfono registrado para notificar por WhatsApp.' }
        }

        // Sanitizar teléfono para Meta API (regla de Argentina) usando helper robusto
        const cleanPhone = normalizarTelefonoArgentino(pct.telefono)

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

        const nombreProf = prof ? `${limpiarTituloProfesional(prof.nombre)} ${prof.apellido.trim()}` : 'el especialista'

        console.log(`📤 Enviando recordatorio manual a ${pct.nombre} (${cleanPhone}) para turno ${turno.id}`)

        const response = await fetch(`https://graph.facebook.com/v20.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`, {
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
                    name: 'recordatorio_turno',
                    language: { code: 'es_AR' },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: pct.nombre },
                                { type: 'text', text: fechaStrFormatted },
                                { type: 'text', text: horaStr },
                                { type: 'text', text: nombreProf }
                            ]
                        },
                        {
                            type: 'button',
                            sub_type: 'quick_reply',
                            index: '0',
                            parameters: [
                                { type: 'payload', payload: `CONFIRMAR_TURNO_${turno.id}` }
                            ]
                        },
                        {
                            type: 'button',
                            sub_type: 'quick_reply',
                            index: '1',
                            parameters: [
                                { type: 'payload', payload: `CANCELAR_TURNO_${turno.id}` }
                            ]
                        },
                        {
                            type: 'button',
                            sub_type: 'quick_reply',
                            index: '2',
                            parameters: [
                                { type: 'payload', payload: `REPROGRAMAR_TURNO_${turno.id}` }
                            ]
                        }
                    ]
                }
            })
        })

        const resData = await response.json()

        if (!response.ok) {
            console.error(`❌ Error de Meta para turno ${turno.id}:`, JSON.stringify(resData, null, 2))
            
            // Registrar el fallo en recordatorios
            await admin.from('recordatorios').insert({
                tenant_id: turno.tenant_id,
                turno_id: turno.id,
                canal: 'WHATSAPP',
                estado_envio: 'FALLIDO',
                telefono: cleanPhone,
                mensaje_enviado: `Nombre: ${pct.nombre}, Fecha: ${fechaStrFormatted}, Hora: ${horaStr}, Profesional: ${nombreProf}`,
                error_detalle: resData?.error?.message || 'Error al invocar Meta API'
            })

            return { error: resData?.error?.message || 'Error al invocar Meta API' }
        }

        // Registrar el envío exitoso
        await admin.from('recordatorios').insert({
            tenant_id: turno.tenant_id,
            turno_id: turno.id,
            canal: 'WHATSAPP',
            estado_envio: 'ENVIADO',
            telefono: cleanPhone,
            mensaje_enviado: `Nombre: ${pct.nombre}, Fecha: ${fechaStrFormatted}, Hora: ${horaStr}, Profesional: ${nombreProf}`,
            fecha_envio: new Date().toISOString()
        })

        return { success: true }
    } catch (err: any) {
        console.error(`❌ Excepción al procesar recordatorio manual de turno ${turnoId}:`, err)
        return { error: err.message || 'Excepción interna' }
    }
}
