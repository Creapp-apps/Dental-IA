'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedTenantId, getCurrentUsuario } from '@/lib/supabase/queries'
import { getWhatsAppCredentialsForTenant, subirMediaWhatsApp } from '@/lib/whatsapp'
import { rutaTenant } from '@/lib/storage/rutas'
import { normalizarTelefonoArgentino } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import type { Prioridad } from '@/lib/mensajes/triage'

export type EstadoWaConversacion = 'BOT' | 'HUMANO_PENDIENTE' | 'HUMANO_ATENDIENDO' | 'CERRADO'

export interface WhatsAppConversacionRow {
    id: string
    tenant_id: string
    paciente_id: string | null
    telefono: string
    nombre_contacto: string | null
    estado: EstadoWaConversacion
    asignado_a: string | null
    ultimo_mensaje_at: string
    ultimo_mensaje_texto: string | null
    no_leidos_operador: number
    prioridad: Prioridad | null
    motivo: string | null
    created_at: string
    updated_at: string
    paciente?: {
        id: string
        nombre: string
        apellido: string
        dni?: string
        telefono?: string
        foto_url?: string | null
    } | null
    asignado?: {
        id: string
        nombre: string
        apellido: string
        avatar_url?: string | null
    } | null
}

export interface WhatsAppMensajeRow {
    id: string
    tenant_id: string
    conversacion_id: string
    tipo: 'texto' | 'interactivo' | 'imagen' | 'audio' | 'documento' | 'ubicacion' | 'plantilla'
    remitente: 'paciente' | 'bot' | 'agente'
    agente_id: string | null
    agente_nombre: string | null
    contenido: string
    metadata?: any
    wa_message_id: string | null
    estado_envio: 'enviado' | 'entregado' | 'leido' | 'fallido'
    created_at: string
}

/**
 * Obtiene la lista de conversaciones de WhatsApp para el consultorio activo.
 */
export async function getConversaciones(filtro: 'todos' | 'pendientes' | 'mis_chats' | 'bot' | 'cerrados' = 'todos'): Promise<{
    conversaciones: WhatsAppConversacionRow[]
    error?: string
}> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) return { conversaciones: [], error: 'No autorizado' }

    const admin = createAdminClient()
    const usuarioActual = await getCurrentUsuario()

    try {
        let query = admin
            .from('whatsapp_conversaciones')
            .select(`
                *,
                paciente:pacientes(id, nombre, apellido, dni, telefono, foto_url),
                asignado:usuarios(id, nombre, apellido, avatar_url)
            `)
            .eq('tenant_id', tenantId)

        // Alcance: por defecto solo conversaciones activas; CERRADO solo a pedido.
        if (filtro === 'cerrados') {
            query = query.eq('estado', 'CERRADO')
        } else {
            query = query.in('estado', ['BOT', 'HUMANO_PENDIENTE', 'HUMANO_ATENDIENDO'])
            if (filtro === 'pendientes') {
                query = query.in('estado', ['HUMANO_PENDIENTE', 'HUMANO_ATENDIENDO'])
            } else if (filtro === 'mis_chats' && usuarioActual?.id) {
                query = query.eq('asignado_a', usuarioActual.id)
            } else if (filtro === 'bot') {
                query = query.eq('estado', 'BOT')
            }
        }

        query = query.order('ultimo_mensaje_at', { ascending: false })

        const { data, error } = await query

        if (error) {
            console.error('[WA CHAT] Error al obtener conversaciones:', error)
            return { conversaciones: [], error: error.message }
        }

        const rows = (data as any[]) || []

        // Las conversaciones entrantes no tienen `paciente_id`, así que en la
        // bandeja se veían como un número suelto. Enriquecemos esas filas con el
        // paciente que coincida por teléfono (últimos 8 dígitos, para ignorar
        // prefijos de país/área y separadores). Si el paciente no está
        // registrado, queda el número como hasta ahora.
        const sinPaciente = rows.filter(r => !r.paciente && r.telefono)
        if (sinPaciente.length > 0) {
            const soloDigitos = (s: string) => (s || '').replace(/\D/g, '')
            const last8 = (s: string) => soloDigitos(s).slice(-8)

            const pacientes: any[] = []
            for (let from = 0; ; from += 1000) {
                const { data: pg } = await admin
                    .from('pacientes')
                    .select('id, nombre, apellido, dni, telefono, foto_url')
                    .eq('tenant_id', tenantId)
                    .not('telefono', 'is', null)
                    .range(from, from + 999)
                if (!pg || pg.length === 0) break
                pacientes.push(...pg)
                if (pg.length < 1000) break
            }

            const porTelefono = new Map<string, any>()
            for (const p of pacientes) {
                const k = last8(p.telefono)
                if (k.length === 8 && !porTelefono.has(k)) porTelefono.set(k, p)
            }

            for (const r of sinPaciente) {
                const match = porTelefono.get(last8(r.telefono))
                if (match) r.paciente = match
            }
        }

        return { conversaciones: rows }
    } catch (err: any) {
        console.error('[WA CHAT] Excepción al obtener conversaciones:', err)
        return { conversaciones: [], error: err.message || 'Error inesperado' }
    }
}

/**
 * Obtiene los mensajes de una conversación específica en orden cronológico.
 */
export async function getMensajes(
    conversacionId: string,
    opts?: { limit?: number; antesDe?: string }
): Promise<{
    mensajes: WhatsAppMensajeRow[]
    hayMas: boolean
    error?: string
}> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) return { mensajes: [], hayMas: false, error: 'No autorizado' }

    const admin = createAdminClient()
    const limit = opts?.limit ?? 30

    try {
        // Traemos los últimos `limit` mensajes (desc), +1 para saber si hay más atrás.
        // Con `antesDe` paginamos hacia atrás (mensajes anteriores a ese cursor).
        let query = admin
            .from('whatsapp_mensajes')
            .select('*')
            .eq('conversacion_id', conversacionId)
            .eq('tenant_id', tenantId)
            // Orden estable incluso con created_at empatados (desempata por id).
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(limit + 1)

        if (opts?.antesDe) {
            // `lte` + dedupe por id en el cliente: no se pierde ningún mensaje con
            // created_at igual al del cursor (el cursor mismo se re-trae y se filtra).
            query = query.lte('created_at', opts.antesDe)
        }

        const { data, error } = await query

        if (error) {
            console.error('[WA CHAT] Error al obtener mensajes:', error)
            return { mensajes: [], hayMas: false, error: error.message }
        }

        const rows = (data as any[]) || []
        const hayMas = rows.length > limit
        const pagina = hayMas ? rows.slice(0, limit) : rows
        pagina.reverse() // a orden ascendente para mostrar

        return { mensajes: pagina, hayMas }
    } catch (err: any) {
        console.error('[WA CHAT] Excepción al obtener mensajes:', err)
        return { mensajes: [], hayMas: false, error: err.message || 'Error inesperado' }
    }
}

/**
 * Envío de mensaje desde el panel de recepción/odontólogo con firma de operador.
 */
export async function enviarMensajeAgente(conversacionId: string, texto: string): Promise<{
    success: boolean
    mensaje?: WhatsAppMensajeRow
    error?: string
}> {
    const tenantId = await getAuthenticatedTenantId()
    const usuario = await getCurrentUsuario()
    if (!tenantId || !usuario) return { success: false, error: 'Sesión no válida o no autorizado' }

    if (!texto || !texto.trim()) {
        return { success: false, error: 'El mensaje no puede estar vacío' }
    }

    const admin = createAdminClient()

    try {
        // 1. Obtener la conversación y el teléfono
        const { data: conversacion, error: convError } = await admin
            .from('whatsapp_conversaciones')
            .select('*')
            .eq('id', conversacionId)
            .eq('tenant_id', tenantId)
            .single()

        if (convError || !conversacion) {
            return { success: false, error: 'Conversación no encontrada' }
        }

        const cleanPhone = normalizarTelefonoArgentino(conversacion.telefono)

        // 2. Obtener credenciales de WhatsApp Cloud API
        const waCreds = await getWhatsAppCredentialsForTenant(tenantId)
        if (!waCreds) {
            return { success: false, error: 'WhatsApp Cloud API no está configurado para esta clínica.' }
        }

        // 3. Formateo con firma de operador estilo ZonaProp
        const firma = `[${usuario.nombre} ${usuario.apellido}]`
        const textoConFirma = `${firma}\n${texto.trim()}`

        // 4. Despacho a WhatsApp Cloud API de Meta
        let waMessageId: string | null = null
        try {
            const metaResponse = await fetch(`https://graph.facebook.com/v20.0/${waCreds.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${waCreds.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: textoConFirma
                    }
                })
            })

            const metaData = await metaResponse.json()
            if (!metaResponse.ok) {
                console.error('[WA CHAT] Error de Meta API al enviar mensaje:', metaData)
                return { success: false, error: metaData?.error?.message || 'Error al enviar por WhatsApp' }
            }

            waMessageId = metaData?.messages?.[0]?.id || null
        } catch (apiErr: any) {
            console.error('[WA CHAT] Excepción al llamar a Meta Graph API:', apiErr)
            return { success: false, error: 'Fallo de conexión con WhatsApp Meta API' }
        }

        // 5. Insertar mensaje en la base de datos
        const { data: nuevoMensaje, error: insertError } = await admin
            .from('whatsapp_mensajes')
            .insert({
                tenant_id: tenantId,
                conversacion_id: conversacionId,
                tipo: 'texto',
                remitente: 'agente',
                agente_id: usuario.id,
                agente_nombre: `${usuario.nombre} ${usuario.apellido}`,
                contenido: textoConFirma,
                wa_message_id: waMessageId,
                estado_envio: 'enviado'
            })
            .select()
            .single()

        if (insertError) {
            console.error('[WA CHAT] Error al persistir mensaje saliente:', insertError)
        }

        // 6. Actualizar estado de la conversación (pasa a HUMANO_ATENDIENDO y asigna al operador)
        await admin
            .from('whatsapp_conversaciones')
            .update({
                estado: 'HUMANO_ATENDIENDO',
                asignado_a: usuario.id,
                ultimo_mensaje_at: new Date().toISOString(),
                ultimo_mensaje_texto: textoConFirma,
                updated_at: new Date().toISOString()
            })
            .eq('id', conversacionId)

        // Responder = atender: limpia la alerta del dashboard
        await marcarAlertasDeConversacionLeidas(admin, tenantId, conversacionId)

        revalidatePath('/mensajes')

        return { success: true, mensaje: nuevoMensaje as any }
    } catch (err: any) {
        console.error('[WA CHAT] Excepción en enviarMensajeAgente:', err)
        return { success: false, error: err.message || 'Error inesperado al enviar mensaje' }
    }
}

/**
 * Enviar un adjunto (imagen o audio) como operador a través de WhatsApp Cloud API.
 * El binario llega en un FormData bajo la clave 'file'. Se guarda en el bucket privado
 * 'paciente_adjuntos' (para mostrarlo en el chat) y se sube a Meta para obtener un media_id.
 */
export async function enviarAdjuntoAgente(conversacionId: string, formData: FormData): Promise<{
    success: boolean
    mensaje?: WhatsAppMensajeRow
    error?: string
}> {
    const tenantId = await getAuthenticatedTenantId()
    const usuario = await getCurrentUsuario()
    if (!tenantId || !usuario) return { success: false, error: 'Sesión no válida o no autorizado' }

    const file = formData.get('file')
    if (!file || typeof file === 'string') {
        return { success: false, error: 'No se recibió ningún archivo' }
    }

    const archivo = file as File
    const mimeType = archivo.type || ''
    const esImagen = mimeType.startsWith('image/')
    const esAudio = mimeType.startsWith('audio/')

    if (!esImagen && !esAudio) {
        return { success: false, error: 'Solo se pueden enviar imágenes o audios' }
    }
    if (archivo.size === 0) {
        return { success: false, error: 'El archivo está vacío' }
    }
    // Meta permite hasta 5 MB imagen y 16 MB audio; aplicamos el tope más alto.
    if (archivo.size > 16 * 1024 * 1024) {
        return { success: false, error: 'El archivo supera el límite de 16 MB' }
    }

    const admin = createAdminClient()

    try {
        // 1. Obtener la conversación y el teléfono
        const { data: conversacion, error: convError } = await admin
            .from('whatsapp_conversaciones')
            .select('*')
            .eq('id', conversacionId)
            .eq('tenant_id', tenantId)
            .single()

        if (convError || !conversacion) {
            return { success: false, error: 'Conversación no encontrada' }
        }

        const cleanPhone = normalizarTelefonoArgentino(conversacion.telefono)

        // 2. Credenciales de WhatsApp Cloud API
        const waCreds = await getWhatsAppCredentialsForTenant(tenantId)
        if (!waCreds) {
            return { success: false, error: 'WhatsApp Cloud API no está configurado para esta clínica.' }
        }

        // 3. Materializar el binario
        const buffer = Buffer.from(await archivo.arrayBuffer())
        const ext = (archivo.name?.split('.').pop() || (esImagen ? 'jpg' : 'ogg')).toLowerCase()

        // 4. Guardar en el bucket privado para que la burbuja lo pueda mostrar firmado
        const filePath = rutaTenant(tenantId, 'wa-media-out', `${Date.now()}_${usuario.id}.${ext}`)
        const { error: uploadError } = await admin.storage
            .from('paciente_adjuntos')
            .upload(filePath, buffer, { contentType: mimeType, upsert: true })

        if (uploadError) {
            console.error('[WA CHAT] Error al guardar adjunto saliente en storage:', uploadError)
            return { success: false, error: 'No se pudo guardar el archivo' }
        }

        // 5. Subir a Meta para obtener el media_id
        const mediaId = await subirMediaWhatsApp(
            buffer,
            mimeType,
            archivo.name || `adjunto.${ext}`,
            waCreds.phoneNumberId,
            waCreds.accessToken
        )
        if (!mediaId) {
            return { success: false, error: 'No se pudo subir el archivo a WhatsApp' }
        }

        // 6. Despachar el mensaje de media a Meta
        const firma = `[${usuario.nombre} ${usuario.apellido}]`
        const tipoMeta = esImagen ? 'image' : 'audio'
        // El audio en WhatsApp no admite caption; la imagen sí lleva la firma del operador.
        const mediaPayload = esImagen ? { id: mediaId, caption: firma } : { id: mediaId }

        let waMessageId: string | null = null
        try {
            const metaResponse = await fetch(`https://graph.facebook.com/v20.0/${waCreds.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${waCreds.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone,
                    type: tipoMeta,
                    [tipoMeta]: mediaPayload
                })
            })

            const metaData = await metaResponse.json()
            if (!metaResponse.ok) {
                console.error('[WA CHAT] Error de Meta API al enviar adjunto:', metaData)
                return { success: false, error: metaData?.error?.message || 'Error al enviar por WhatsApp' }
            }

            waMessageId = metaData?.messages?.[0]?.id || null
        } catch (apiErr: any) {
            console.error('[WA CHAT] Excepción al enviar adjunto a Meta Graph API:', apiErr)
            return { success: false, error: 'Fallo de conexión con WhatsApp Meta API' }
        }

        // 7. Persistir el mensaje saliente
        const contenido = esImagen ? firma : `${firma}\n🎤 Nota de voz`
        const { data: nuevoMensaje, error: insertError } = await admin
            .from('whatsapp_mensajes')
            .insert({
                tenant_id: tenantId,
                conversacion_id: conversacionId,
                tipo: esImagen ? 'imagen' : 'audio',
                remitente: 'agente',
                agente_id: usuario.id,
                agente_nombre: `${usuario.nombre} ${usuario.apellido}`,
                contenido,
                metadata: { media_url: filePath },
                wa_message_id: waMessageId,
                estado_envio: 'enviado'
            })
            .select()
            .single()

        if (insertError) {
            console.error('[WA CHAT] Error al persistir adjunto saliente:', insertError)
        }

        // 8. Actualizar la conversación
        const resumen = esImagen ? '📷 Foto' : '🎤 Nota de voz'
        await admin
            .from('whatsapp_conversaciones')
            .update({
                estado: 'HUMANO_ATENDIENDO',
                asignado_a: usuario.id,
                ultimo_mensaje_at: new Date().toISOString(),
                ultimo_mensaje_texto: resumen,
                updated_at: new Date().toISOString()
            })
            .eq('id', conversacionId)

        // Responder con adjunto = atender: limpia la alerta del dashboard
        await marcarAlertasDeConversacionLeidas(admin, tenantId, conversacionId)

        revalidatePath('/mensajes')

        return { success: true, mensaje: nuevoMensaje as any }
    } catch (err: any) {
        console.error('[WA CHAT] Excepción en enviarAdjuntoAgente:', err)
        return { success: false, error: err.message || 'Error inesperado al enviar el adjunto' }
    }
}

/**
 * Marca como leídas las notificaciones del Centro de Alertas (tabla `notificaciones`)
 * asociadas a una conversación. Las alertas de WhatsApp guardan el id de la
 * conversación en `referencia_id`, así que al atender/cerrar/reactivar el chat
 * limpiamos también su alerta en el dashboard (fuentes de datos separadas).
 *
 * Es best-effort: un fallo acá no debe romper la acción principal sobre el chat.
 */
async function marcarAlertasDeConversacionLeidas(
    admin: ReturnType<typeof createAdminClient>,
    tenantId: string,
    conversacionId: string
): Promise<void> {
    try {
        const { error } = await admin
            .from('notificaciones')
            .update({ leida: true })
            .eq('tenant_id', tenantId)
            .eq('referencia_id', conversacionId)
            .eq('leida', false)
        if (error) {
            console.error('[WA CHAT] No se pudieron marcar alertas leídas:', error.message)
        }
    } catch (err: any) {
        console.error('[WA CHAT] Excepción al marcar alertas leídas:', err?.message || err)
    }
}

/**
 * Modificar el estado de la conversación (ej: Reanudar Bot o Cerrar conversación).
 */
export async function cambiarEstadoConversacion(
    conversacionId: string,
    nuevoEstado: EstadoWaConversacion
): Promise<{ success: boolean; error?: string }> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) return { success: false, error: 'No autorizado' }

    const admin = createAdminClient()

    try {
        const updatePayload: any = {
            estado: nuevoEstado,
            updated_at: new Date().toISOString()
        }

        // Si se devuelve al bot o se cierra, se puede desasignar
        if (nuevoEstado === 'BOT') {
            updatePayload.asignado_a = null
        }

        // Triage de bandeja: al volver al bot o cerrar, se limpia prioridad/motivo
        if (nuevoEstado === 'BOT' || nuevoEstado === 'CERRADO') {
            updatePayload.prioridad = null
            updatePayload.motivo = null
        }

        const { error } = await admin
            .from('whatsapp_conversaciones')
            .update(updatePayload)
            .eq('id', conversacionId)
            .eq('tenant_id', tenantId)

        if (error) {
            return { success: false, error: error.message }
        }

        // Atender/cerrar/reactivar el chat también limpia su alerta del dashboard
        await marcarAlertasDeConversacionLeidas(admin, tenantId, conversacionId)

        revalidatePath('/mensajes')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Error inesperado' }
    }
}

/**
 * Asigna una conversación a un operador específico.
 */
export async function asignarConversacion(
    conversacionId: string,
    usuarioId: string | null
): Promise<{ success: boolean; error?: string }> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) return { success: false, error: 'No autorizado' }

    const admin = createAdminClient()

    try {
        const updatePayload: Record<string, unknown> = {
            asignado_a: usuarioId,
            estado: usuarioId ? 'HUMANO_ATENDIENDO' : 'HUMANO_PENDIENTE',
            updated_at: new Date().toISOString()
        }

        // Desasignar vuelve a PENDIENTE: si no tenía prioridad, queda amarillo/revisar; si no, se conserva
        if (!usuarioId) {
            const { data: actual } = await admin
                .from('whatsapp_conversaciones')
                .select('prioridad')
                .eq('id', conversacionId)
                .eq('tenant_id', tenantId)
                .maybeSingle()
            if (!actual?.prioridad) {
                updatePayload.prioridad = 'amarillo'
                updatePayload.motivo = 'revisar'
            }
        }

        const { error } = await admin
            .from('whatsapp_conversaciones')
            .update(updatePayload)
            .eq('id', conversacionId)
            .eq('tenant_id', tenantId)

        if (error) return { success: false, error: error.message }

        // Tomar la conversación limpia su alerta del dashboard (desasignar no)
        if (usuarioId) {
            await marcarAlertasDeConversacionLeidas(admin, tenantId, conversacionId)
        }

        revalidatePath('/mensajes')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Marca los mensajes como leídos por el operador.
 */
export async function marcarConversacionLeida(conversacionId: string): Promise<void> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) return

    const admin = createAdminClient()
    await admin
        .from('whatsapp_conversaciones')
        .update({ no_leidos_operador: 0 })
        .eq('id', conversacionId)
        .eq('tenant_id', tenantId)
}

/**
 * Lista de operadores (usuarios) activos del consultorio para asignar conversaciones.
 */
export async function getOperadoresClinica(): Promise<{
    id: string
    nombre: string
    apellido: string
    rol: string
    avatar_url?: string | null
}[]> {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) return []

    const admin = createAdminClient()
    const { data } = await admin
        .from('usuarios')
        .select('id, nombre, apellido, rol, avatar_url')
        .eq('tenant_id', tenantId)
        .eq('activo', true)
        .order('nombre', { ascending: true })

    return data || []
}

/**
 * Adjunta a la ficha de un paciente un archivo (foto/documento) recibido por
 * WhatsApp. El binario YA está en el bucket `paciente_adjuntos` (lo baja el
 * webhook); acá sólo insertamos la fila en la tabla `paciente_adjuntos` que lee
 * la pestaña "Adjuntos" de la ficha. No se vuelve a copiar el archivo.
 */
export async function adjuntarMediaChatAFicha(
    mensajeId: string,
    pacienteId: string
): Promise<{ success: boolean; error?: string }> {
    const tenantId = await getAuthenticatedTenantId()
    const usuario = await getCurrentUsuario()
    if (!tenantId || !usuario?.id) {
        return { success: false, error: 'No autorizado' }
    }
    if (!mensajeId || !pacienteId) {
        return { success: false, error: 'Faltan datos (mensaje o paciente)' }
    }

    const admin = createAdminClient()

    // 1. Mensaje con el archivo
    const { data: msg } = await admin
        .from('whatsapp_mensajes')
        .select('id, tipo, contenido, metadata')
        .eq('id', mensajeId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

    const mediaPath: string | null = (msg?.metadata as any)?.media_url ?? null
    if (!msg || !mediaPath) {
        return { success: false, error: 'El mensaje no tiene un archivo adjunto' }
    }

    // 2. El paciente debe pertenecer al consultorio
    const { data: paciente } = await admin
        .from('pacientes')
        .select('id')
        .eq('id', pacienteId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
    if (!paciente) {
        return { success: false, error: 'El paciente no pertenece a este consultorio' }
    }

    // 3. Evitar duplicar: si ya se adjuntó este mismo archivo a este paciente, no repetir.
    const { data: yaExiste } = await admin
        .from('paciente_adjuntos')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('paciente_id', pacienteId)
        .eq('url_archivo', mediaPath)
        .maybeSingle()
    if (yaExiste) {
        return { success: false, error: 'Ese archivo ya está adjuntado en la ficha' }
    }

    // 4. Nombre y tipo a partir del mensaje
    const docFilename: string | null = (msg.metadata as any)?.doc_filename ?? null
    const nombreArchivo = docFilename
        || (msg.tipo === 'imagen' ? `Foto WhatsApp ${new Date().toLocaleDateString('es-AR')}` : null)
        || (msg.tipo === 'documento' ? `Documento WhatsApp ${new Date().toLocaleDateString('es-AR')}` : null)
        || `Adjunto WhatsApp ${new Date().toLocaleDateString('es-AR')}`
    const tipoArchivo = msg.tipo === 'imagen' ? 'image/jpeg'
        : msg.tipo === 'documento' ? 'application/pdf'
        : msg.tipo === 'audio' ? 'audio/ogg'
        : 'application/octet-stream'

    // Tamaño real del objeto ya subido (para que la ficha no muestre "0 Bytes").
    let sizeBytes = 0
    try {
        const idx = mediaPath.lastIndexOf('/')
        const dir = idx >= 0 ? mediaPath.slice(0, idx) : ''
        const file = idx >= 0 ? mediaPath.slice(idx + 1) : mediaPath
        const { data: objs } = await admin.storage.from('paciente_adjuntos').list(dir, { search: file })
        sizeBytes = (objs?.find(o => o.name === file)?.metadata as any)?.size ?? 0
    } catch { /* tamaño es cosmético: si falla, queda en 0 */ }

    // 5. Insertar la fila que ve la ficha (reutiliza la ruta ya subida en el bucket)
    const { error: insertError } = await admin
        .from('paciente_adjuntos')
        .insert({
            tenant_id: tenantId,
            paciente_id: pacienteId,
            nombre_archivo: nombreArchivo,
            url_archivo: mediaPath,
            tipo_archivo: tipoArchivo,
            size_bytes: sizeBytes,
            observaciones: 'Adjuntado desde WhatsApp',
            created_by: usuario.id
        })
    if (insertError) {
        console.error('[WA CHAT] Error al adjuntar a ficha:', insertError)
        return { success: false, error: 'No se pudo adjuntar a la ficha' }
    }

    // 6. Marcar el mensaje como adjuntado (para mostrar el estado en el chat)
    await admin
        .from('whatsapp_mensajes')
        .update({ metadata: { ...(msg.metadata as any), adjuntado_ficha: true } })
        .eq('id', mensajeId)
        .eq('tenant_id', tenantId)

    revalidatePath(`/pacientes/${pacienteId}`)
    return { success: true }
}
