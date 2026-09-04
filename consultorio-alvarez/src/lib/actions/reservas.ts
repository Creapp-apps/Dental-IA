'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getNextNroHistoriaClinica } from './pacientes'
import { normalizarTelefonoArgentino, limpiarTituloProfesional } from '@/lib/utils'

async function getTenantBySlug(slug: string) {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('tenants')
        .select('id, nombre, slug, horarios')
        .eq('slug', slug)
        .single()
    return data
}

export async function getProfesionalesPublicos(tenantSlug: string, fecha?: string, hora?: string) {
    const supabase = createAdminClient()
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) return []

    const { data: allProfs } = await supabase
        .from('profesionales')
        .select('id, nombre, apellido, especialidad, matricula, color_agenda, activo, avatar_url, foto_url')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)
        .order('nombre')

    if (!allProfs || allProfs.length === 0) return []

    const allSchedules = (tenant.horarios || []) as Array<{
        dia: number;
        profesional_id?: string | null;
        activo: boolean;
    }>

    // Check which professionals have at least one active day configured
    const profsWithConfig = new Set(allSchedules.filter(h => !!h.profesional_id).map(h => h.profesional_id!))
    const profsWithActiveDays = new Set(allSchedules.filter(h => !!h.profesional_id && h.activo).map(h => h.profesional_id!))
    const clinicHasActiveGeneral = allSchedules.some(h => !h.profesional_id && h.activo)

    // Filter out professionals who have custom schedules where ALL days are deactivated
    const availableProfs = allProfs.filter(p => {
        if (profsWithConfig.has(p.id)) {
            return profsWithActiveDays.has(p.id)
        }
        return clinicHasActiveGeneral
    })

    // If no date/time provided, return active professionals with working hours
    if (!fecha || !hora) return availableProfs

    // Build the UTC timestamp for the selected slot (Argentina = UTC-3)
    const localDateTime = new Date(`${fecha}T${hora}:00-03:00`)
    const utcStr = localDateTime.toISOString()

    // Find professionals who already have a booking at this exact time
    const { data: ocupados } = await supabase
        .from('turnos')
        .select('profesional_id')
        .eq('tenant_id', tenant.id)
        .eq('fecha_inicio', utcStr)
        .in('estado', ['CONFIRMADO', 'PENDIENTE', 'EN_SALA'])

    const ocupadosIds = new Set((ocupados ?? []).map(t => t.profesional_id))

    // Filter out busy professionals
    return availableProfs.filter(p => !ocupadosIds.has(p.id))
}

export async function getObrasSocialesPublicas(tenantSlug: string) {
    const supabase = createAdminClient()
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) return []

    const { data: obras } = await supabase
        .from('obras_sociales')
        .select('id, nombre, codigo, planes')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)
        .order('nombre')

    return obras || []
}

export async function getTurnosDisponibles(tenantSlug: string, profesionalId?: string | null) {
    const supabase = createAdminClient()
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) return []

    // Get count of active professionals
    const { data: activeProfs } = await supabase
        .from('profesionales')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)

    const totalProfs = activeProfs?.length ?? 1

    // Get current local date and time in Argentina to do filtering
    const localNow = new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
    const [todayStr, currentLocalTime] = localNow.split(' ')
    const currentHHMM = currentLocalTime.slice(0, 5)

    // Get existing booked slots for the next 21 days (starting from start of today in Argentina)
    const now = new Date()
    const startOfTodayArgentina = new Date(`${todayStr}T00:00:00-03:00`)
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 21)

    const { data: turnosOcupados } = await supabase
        .from('turnos')
        .select('fecha_inicio, profesional_id')
        .eq('tenant_id', tenant.id)
        .gte('fecha_inicio', startOfTodayArgentina.toISOString())
        .lte('fecha_inicio', endDate.toISOString())
        .in('estado', ['CONFIRMADO', 'PENDIENTE', 'EN_SALA'])

    // Count how many bookings exist per local time slot
    // DB stores UTC — Argentina is UTC-3
    const slotBookedProfs = new Map<string, Set<string>>()
    for (const t of turnosOcupados ?? []) {
        const utcDate = new Date(t.fecha_inicio)
        const localStr = utcDate.toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
        const [datePart, timePart] = localStr.split(' ')
        const slotKey = `${datePart}|${timePart.slice(0, 5)}`
        
        if (!slotBookedProfs.has(slotKey)) {
            slotBookedProfs.set(slotKey, new Set())
        }
        if (t.profesional_id) {
            slotBookedProfs.get(slotKey)!.add(t.profesional_id)
        }
    }

    function generarSlotsParaDia(horario: any): string[] {
        if (!horario || !horario.activo) return [];
        const slotsSet = new Set<string>();
        
        const addSlots = (apertura: string, cierre: string) => {
            if (!apertura || !cierre) return;
            const [apH, apM] = apertura.split(':').map(Number);
            const [ciH, ciM] = cierre.split(':').map(Number);
            
            let currH = apH;
            let currM = apM;
            
            while (currH < ciH || (currH === ciH && currM < ciM)) {
                const endM = currM + 20;
                const endH = currH + Math.floor(endM / 60);
                const rEndM = endM % 60;
                
                if (endH > ciH || (endH === ciH && rEndM > ciM)) break;
                
                slotsSet.add(`${currH.toString().padStart(2, '0')}:${currM.toString().padStart(2, '0')}`);
                
                currM += 20;
                if (currM >= 60) {
                    currH++;
                    currM -= 60;
                }
            }
        }
        
        if (horario.apertura_manana) {
            addSlots(horario.apertura_manana, horario.cierre_manana);
            addSlots(horario.apertura_tarde, horario.cierre_tarde);
        } else {
            addSlots(horario.apertura, horario.cierre);
        }
        
        return Array.from(slotsSet).sort();
    }    // Helper to get effective schedule for a professional on a given day of week
    function getHorarioProf(schedules: typeof allSchedules, profId: string, dayOfWeek: number) {
        const customSchedules = schedules.filter(h => h.profesional_id === profId)
        if (customSchedules.length > 0) {
            return customSchedules.find(h => h.dia === dayOfWeek) || null
        }
        // Fallback to general clinic schedule only if professional has no custom configuration at all
        return schedules.find(h => !h.profesional_id && h.dia === dayOfWeek) || null
    }

    const allSchedules = (tenant.horarios || []) as Array<{
        dia: number;
        profesional_id?: string | null;
        activo: boolean;
        apertura_manana?: string;
        cierre_manana?: string;
        apertura_tarde?: string;
        cierre_tarde?: string;
        apertura?: string;
        cierre?: string;
    }>

    const isSpecificProf = Boolean(profesionalId && profesionalId !== 'sin-preferencia')
    const targetProfs = isSpecificProf
        ? (activeProfs ?? []).filter(p => p.id === profesionalId)
        : (activeProfs ?? [])

    if (targetProfs.length === 0) return []

    const days: { date: string; dayOfWeek: number; dayNum: number; month: number; slots: string[] }[] = []

    for (let i = 0; i <= 21; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() + i)

        const localStr = d.toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
        const [dateStr] = localStr.split(' ')

        const [year, month, dayNum] = dateStr.split('-').map(Number)
        const localD = new Date(year, month - 1, dayNum)
        const dow = localD.getDay()
        const monthIndex = month - 1

        // Collect all slots that have at least one active professional available
        const availableSlotsSet = new Set<string>()

        for (const prof of targetProfs) {
            const h = getHorarioProf(allSchedules, prof.id, dow)
            if (!h || !h.activo) continue

            const profSlots = generarSlotsParaDia(h)
            for (const slot of profSlots) {
                const key = `${dateStr}|${slot}`
                const booked = slotBookedProfs.get(key)
                if (!booked || !booked.has(prof.id)) {
                    availableSlotsSet.add(slot)
                }
            }
        }

        let availableSlots = Array.from(availableSlotsSet).sort()

        // If today, filter out slots that are in the past
        if (dateStr === todayStr) {
            availableSlots = availableSlots.filter(slot => slot > currentHHMM)
        }

        if (availableSlots.length > 0) {
            days.push({
                date: dateStr,
                dayOfWeek: dow,
                dayNum: dayNum,
                month: monthIndex,
                slots: availableSlots,
            })
        }
    }

    return days
}

export async function crearReservaPublica(data: {
    tenantSlug: string
    fecha: string
    hora: string
    profesionalId: string | null
    nombre: string
    apellido: string
    telefono: string
    email?: string
    es_nuevo: string
    notas?: string
    obraSocialId?: string | null
    planSeleccionado?: string | null
    dni?: string | null
    pacienteExistenteId?: string | null
}) {
    const supabase = createAdminClient()
    const tenant = await getTenantBySlug(data.tenantSlug)
    if (!tenant) return { error: 'Consultorio no encontrado' }

    // Build the turno datetime (Argentina = UTC-3)
    const fechaInicio = new Date(`${data.fecha}T${data.hora}:00-03:00`)
    const fechaFin = new Date(fechaInicio)
    fechaFin.setMinutes(fechaFin.getMinutes() + 20) // 20 min default

    // Determine day of week
    const [year, month, day] = data.fecha.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)
    const dow = localDate.getDay()

    const allSchedules = (tenant.horarios || []) as Array<{
        dia: number;
        profesional_id?: string | null;
        activo: boolean;
        apertura_manana?: string;
        cierre_manana?: string;
        apertura_tarde?: string;
        cierre_tarde?: string;
        apertura?: string;
        cierre?: string;
    }>

    function getHorarioProf(schedules: typeof allSchedules, profId: string, dayOfWeek: number) {
        const customSchedules = schedules.filter(h => h.profesional_id === profId)
        if (customSchedules.length > 0) {
            return customSchedules.find(h => h.dia === dayOfWeek) || null
        }
        return schedules.find(h => !h.profesional_id && h.dia === dayOfWeek) || null
    }

    function profTieneSlot(horario: any, slot: string): boolean {
        if (!horario || !horario.activo) return false
        
        const checkRange = (apertura?: string, cierre?: string) => {
            if (!apertura || !cierre) return false
            return slot >= apertura && slot < cierre
        }

        if (horario.apertura_manana) {
            return checkRange(horario.apertura_manana, horario.cierre_manana) ||
                   checkRange(horario.apertura_tarde, horario.cierre_tarde)
        }
        return checkRange(horario.apertura, horario.cierre)
    }

    // Fetch all active professionals
    const { data: profs } = await supabase
        .from('profesionales')
        .select('id, nombre, apellido')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)

    if (!profs || profs.length === 0) return { error: 'No hay profesionales disponibles' }

    // Find existing bookings at this exact datetime
    const { data: ocupados } = await supabase
        .from('turnos')
        .select('profesional_id')
        .eq('tenant_id', tenant.id)
        .eq('fecha_inicio', fechaInicio.toISOString())
        .in('estado', ['CONFIRMADO', 'PENDIENTE', 'EN_SALA'])

    const ocupadosSet = new Set((ocupados ?? []).map(o => o.profesional_id))

    // Determine profesional
    let profesionalId = data.profesionalId
    if (!profesionalId || profesionalId === 'sin-preferencia') {
        // Find professional who works on this day, at this specific hour, and is NOT occupied
        const candidateProf = profs.find(p => {
            if (ocupadosSet.has(p.id)) return false
            const h = getHorarioProf(allSchedules, p.id, dow)
            return profTieneSlot(h, data.hora)
        })

        if (!candidateProf) {
            return { error: 'No hay profesionales disponibles en el día y horario seleccionado' }
        }

        profesionalId = candidateProf.id
    } else {
        // Strict verification for specifically requested professional
        const selectedProf = profs.find(p => p.id === profesionalId)
        if (!selectedProf) {
            return { error: 'El profesional seleccionado no se encuentra activo o no existe' }
        }

        if (ocupadosSet.has(profesionalId)) {
            return { error: 'El profesional seleccionado ya se encuentra ocupado en ese horario' }
        }

        const h = getHorarioProf(allSchedules, profesionalId, dow)
        if (!profTieneSlot(h, data.hora)) {
            return { error: 'El profesional seleccionado no atiende en el día u horario elegido' }
        }
    }

    if (!profesionalId) return { error: 'No hay profesionales disponibles' }

    // Get default treatment type (prioritizing consultation/checkup/routine keywords)
    const { data: todosTratamientos } = await supabase
        .from('tipos_tratamiento')
        .select('id, nombre, activo')
        .eq('tenant_id', tenant.id)

    let tipoTratamientoId: string | null = null

    if (todosTratamientos && todosTratamientos.length > 0) {
        // 1. Try to find active consultation / revision / control / routine / checkup treatment
        const matchTrat = todosTratamientos.find(t =>
            t.activo && /revis|consult|control|chequeo|rutina|general|evalua/i.test(t.nombre)
        ) || todosTratamientos.find(t =>
            /revis|consult|control|chequeo|rutina|general|evalua/i.test(t.nombre)
        )

        if (matchTrat) {
            tipoTratamientoId = matchTrat.id
        } else {
            // 2. Fallback to first active treatment
            const firstActive = todosTratamientos.find(t => t.activo)
            tipoTratamientoId = firstActive ? firstActive.id : todosTratamientos[0].id
        }
    }

    if (!tipoTratamientoId) {
        return { error: 'No hay tipos de tratamiento configurados' }
    }

    // Try to find existing patient by ID or DNI (with or without dots)
    let pacienteId: string | null = data.pacienteExistenteId || null
    const cleanDni = data.dni ? data.dni.replace(/\D/g, '') : null

    if (!pacienteId && cleanDni) {
        const dotsDni = formatDniWithDots(cleanDni)
        const { data: existing } = await supabase
            .from('pacientes')
            .select('id')
            .eq('tenant_id', tenant.id)
            .or(`dni.eq.${cleanDni},dni.eq.${dotsDni}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        pacienteId = existing?.id ?? null
    }

    // Create patient if new
    if (!pacienteId) {
        let attempts = 0
        let newPat = null
        while (attempts < 3) {
            const nextHC = await getNextNroHistoriaClinica(tenant.id, supabase)
            const { data: createdPat, error: createErr } = await supabase
                .from('pacientes')
                .insert({
                    tenant_id: tenant.id,
                    nro_historia_clinica: nextHC,
                    nombre: data.nombre,
                    apellido: data.apellido,
                    telefono: data.telefono,
                    email: data.email || null,
                    dni: cleanDni || null,
                    obra_social_id: data.obraSocialId || null,
                })
                .select('id')
                .single()

            if (!createErr && createdPat) {
                newPat = createdPat
                break
            }

            if (createErr && (createErr.code === '23505' || createErr.message?.includes('duplicate key'))) {
                attempts++
                continue
            } else {
                break
            }
        }

        pacienteId = newPat?.id ?? null
    }

    // Build notes with plan info
    let finalNotas = data.notas || ''
    if (data.obraSocialId || data.planSeleccionado) {
        let coberturaInfo = '[Cobertura: '
        if (data.obraSocialId) {
            const { data: osData } = await supabase.from('obras_sociales').select('nombre').eq('id', data.obraSocialId).single()
            if (osData) coberturaInfo += osData.nombre
        }
        if (data.planSeleccionado) {
            coberturaInfo += ` - Plan: ${data.planSeleccionado}`
        }
        coberturaInfo += ']\n'
        finalNotas = coberturaInfo + finalNotas
    }

    // Insert turno
    const { data: turnoData, error } = await supabase
        .from('turnos')
        .insert({
            tenant_id: tenant.id,
            paciente_id: pacienteId,
            profesional_id: profesionalId,
            tipo_tratamiento_id: tipoTratamientoId,
            fecha_inicio: fechaInicio.toISOString(),
            fecha_fin: fechaFin.toISOString(),
            estado: 'PENDIENTE',
            notas: finalNotas || null,
            origen: 'ONLINE',
        })
        .select('id')
        .single()

    if (error) return { error: error.message }

    // --- DISPARAR NOTIFICACION REALTIME ---
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const diaSemana = diasSemana[dow]
    const fechaFormateada = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`

    const nombrePacienteReserva = data.apellido 
        ? `**${data.apellido.toUpperCase()}** ${data.nombre}`.trim() 
        : `**${data.nombre}**`

    await supabase.from('notificaciones').insert({
        tenant_id: tenant.id,
        titulo: '🌟 Nuevo Turno Web',
        mensaje: `${nombrePacienteReserva} reservó un turno desde la página pública el día ${diaSemana} ${fechaFormateada} a las ${data.hora}.`,
        tipo: 'turno_nuevo',
        referencia_id: turnoData?.id,
    })

    // --- DISPARAR NOTIFICACION PUSH A ADMINISTRACIÓN / SECRETARIAS ---
    try {
        const { sendPushToRole } = await import('@/lib/push-notifications/send-push')
        const pushTitle = '🌟 Nueva Solicitud de Turno'
        const pushBody = `${data.nombre} ${data.apellido} solicitó un turno el ${data.fecha} a las ${data.hora}.`
        
        await Promise.all([
            sendPushToRole('admin', tenant.id, pushTitle, pushBody, '/agenda'),
            sendPushToRole('secretaria', tenant.id, pushTitle, pushBody, '/agenda')
        ])
    } catch (pushErr) {
        console.error('Error al enviar push a administradores en crearReservaPublica:', pushErr)
    }

    // --- DISPARAR META WHATSAPP CLOUD API ---
    console.log("=== WA DEBUG ===")
    console.log("Token:", !!process.env.META_WA_ACCESS_TOKEN, "PhoneID:", !!process.env.META_WA_PHONE_NUMBER_ID, "Tel:", data.telefono)

    if (process.env.META_WA_ACCESS_TOKEN && process.env.META_WA_PHONE_NUMBER_ID && data.telefono) {
        try {
            // Use robust helper to normalize the Argentine phone number for Meta Cloud API (omits 15 and 9)
            let cleanPhone = normalizarTelefonoArgentino(data.telefono)

            // Obtener nombres para los parámetros de la plantilla
            let profesionalNombre = 'el especialista'
            try {
                const { data: profData } = await supabase
                    .from('profesionales')
                    .select('nombre, apellido')
                    .eq('id', profesionalId)
                    .single()
                if (profData) {
                    profesionalNombre = `${limpiarTituloProfesional(profData.nombre)} ${profData.apellido.trim()}`
                }
            } catch (profErr) {
                console.error('Error fetching profesional details for WhatsApp template:', profErr)
            }

            let tratamientoNombre = 'Consulta'
            try {
                const { data: tratData } = await supabase
                    .from('tipos_tratamiento')
                    .select('nombre')
                    .eq('id', tipoTratamientoId)
                    .single()
                if (tratData) {
                    tratamientoNombre = tratData.nombre
                }
            } catch (tratErr) {
                console.error('Error fetching tratamiento details for WhatsApp template:', tratErr)
            }

            if (tratamientoNombre) {
                tratamientoNombre = tratamientoNombre.toUpperCase()
            }

            // Formatear fecha amigable local (ej. Miércoles, 24 de junio)
            let fechaStrFormatted = data.fecha
            try {
                const localDateTime = new Date(`${data.fecha}T${data.hora}:00-03:00`)
                const fechaStr = localDateTime.toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    timeZone: 'America/Argentina/Buenos_Aires'
                })
                fechaStrFormatted = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)
            } catch (dateErr) {
                console.error('Error formatting date for WhatsApp template:', dateErr)
            }

            console.log("Intentando fetch hacia Meta a:", cleanPhone)

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
                        name: 'solicitud_turnos',
                        language: { code: 'es_AR' },
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: data.nombre },
                                    { type: 'text', text: tratamientoNombre },
                                    { type: 'text', text: fechaStrFormatted },
                                    { type: 'text', text: data.hora },
                                    { type: 'text', text: profesionalNombre }
                                ]
                            }
                        ]
                    }
                })
            })

            const wpResult = await wpResponse.json()
            if (!wpResponse.ok) {
                console.error('❌ Error Meta WhatsApp API:', JSON.stringify(wpResult, null, 2))
            } else {
                console.log('✅ WhatsApp de confirmación de solicitud enviado con éxito a', cleanPhone)
            }
        } catch (e) {
            console.error("❌ Excepción al ejecutar fetch hacia Meta:", e)
        }
    } else {
        console.log("⚠️ No se disparó WhatsApp por falta de vars de entorno.")
    }
    console.log("=== FIN WA DEBUG ===")

    revalidatePath('/agenda')
    return { success: true }
}

function formatDniWithDots(dni: string): string {
    const clean = dni.replace(/\D/g, '')
    if (clean.length === 7) {
        return `${clean.slice(0, 1)}.${clean.slice(1, 4)}.${clean.slice(4)}`
    } else if (clean.length === 8) {
        return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`
    }
    return clean
}

export async function getPacientePorDni(tenantSlug: string, dni: string) {
    const supabase = createAdminClient()
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) return { error: 'Consultorio no encontrado' }

    const cleanDni = dni.replace(/\D/g, '')
    if (!cleanDni) return { error: 'DNI inválido' }

    const dotsDni = formatDniWithDots(cleanDni)

    const { data, error } = await supabase
        .from('pacientes')
        .select(`
            id,
            nombre,
            apellido,
            telefono,
            email,
            obra_social_id
        `)
        .eq('tenant_id', tenant.id)
        .or(`dni.eq.${cleanDni},dni.eq.${dotsDni}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) {
        return { error: 'Error al buscar paciente: ' + error.message }
    }

    return { data }
}

export async function notificarDemoraTurno(turnoId: string, demora: number, mensaje: string, metodo: 'MANUAL' | 'OFICIAL') {
    const supabase = createAdminClient()
    
    // Obtener información del turno y paciente
    const { data: turno, error: turnoError } = await supabase
        .from('turnos')
        .select(`
            id,
            tenant_id,
            fecha_inicio,
            paciente:pacientes (
                id,
                nombre,
                apellido,
                telefono
            )
        `)
        .eq('id', turnoId)
        .single()

    if (turnoError || !turno) {
        return { success: false, error: 'Turno no encontrado: ' + (turnoError?.message || '') }
    }

    const paciente = turno.paciente as any
    if (!paciente) {
        return { success: false, error: 'Paciente no encontrado para este turno' }
    }

    const nombrePacienteDemora = paciente.apellido 
        ? `**${paciente.apellido.toUpperCase()}** ${paciente.nombre}`.trim() 
        : `**${paciente.nombre}**`

    // Insertar log de notificación en la DB
    await supabase.from('notificaciones').insert({
        tenant_id: turno.tenant_id,
        titulo: '⚠️ Notificación de Demora',
        mensaje: `Se notificó a ${nombrePacienteDemora} de una demora de ${demora} min (${metodo}).`,
        tipo: 'recordatorio',
        referencia_id: turno.id,
    })

    if (metodo === 'OFICIAL') {
        if (!process.env.META_WA_ACCESS_TOKEN || !process.env.META_WA_PHONE_NUMBER_ID) {
            return { success: false, error: 'La API Oficial de WhatsApp no está configurada en las variables de entorno' }
        }

        if (!paciente.telefono) {
            return { success: false, error: 'El paciente no tiene un número de teléfono registrado' }
        }

        try {
            let cleanPhone = paciente.telefono.replace(/\D/g, '')
            if (cleanPhone.startsWith('11') || cleanPhone.length === 10) {
                cleanPhone = `54${cleanPhone}`
            } else if (cleanPhone.startsWith('549')) {
                cleanPhone = cleanPhone.replace(/^549/, '54')
            }

            const formatTime = (isoString: string) => {
                const date = new Date(isoString)
                return date.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'America/Argentina/Buenos_Aires'
                })
            }

            const horaOriginal = formatTime(turno.fecha_inicio)
            const nuevaHora = formatTime(new Date(new Date(turno.fecha_inicio).getTime() + demora * 60000).toISOString())

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
                        name: 'demora_turno', // Nombre de la plantilla oficial esperada
                        language: { code: 'es_AR' },
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: paciente.nombre },
                                    { type: 'text', text: String(demora) },
                                    { type: 'text', text: horaOriginal },
                                    { type: 'text', text: nuevaHora }
                                ]
                            }
                        ]
                    }
                })
            })

            const wpResult = await wpResponse.json()
            if (!wpResponse.ok) {
                console.error('❌ Error Meta WhatsApp API Demora:', JSON.stringify(wpResult, null, 2))
                return { success: false, error: wpResult?.error?.message || 'Error al invocar API Oficial' }
            }
            return { success: true }
        } catch (e: any) {
            console.error("❌ Excepción Meta WhatsApp API Demora:", e)
            return { success: false, error: e?.message || 'Excepción al invocar API Oficial' }
        }
    }

    return { success: true }
}
