'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getTenantBySlug(slug: string) {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('tenants')
        .select('id, nombre, slug')
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
        .select('id, nombre, apellido, especialidad, activo')
        .eq('tenant_id', tenant.id)
        .eq('activo', true)
        .order('nombre')

    if (!allProfs) return []

    // If no date/time provided, return all active professionals
    if (!fecha || !hora) return allProfs

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
    return allProfs.filter(p => !ocupadosIds.has(p.id))
}

export async function getTurnosDisponibles(tenantSlug: string) {
    const supabase = createAdminClient()
    const tenant = await getTenantBySlug(tenantSlug)
    if (!tenant) return []

    // Get count of active professionals
    const { count: profCount } = await supabase
        .from('profesionales')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('activo', true)

    const totalProfs = profCount ?? 1

    // Get existing booked slots for the next 21 days
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 21)

    const { data: turnosOcupados } = await supabase
        .from('turnos')
        .select('fecha_inicio')
        .eq('tenant_id', tenant.id)
        .gte('fecha_inicio', now.toISOString())
        .lte('fecha_inicio', endDate.toISOString())
        .in('estado', ['CONFIRMADO', 'PENDIENTE', 'EN_SALA'])

    // Count how many bookings exist per local time slot
    // DB stores UTC — Argentina is UTC-3
    const slotBookingCount = new Map<string, number>()
    for (const t of turnosOcupados ?? []) {
        // Parse the UTC timestamp and convert to local Argentina time string
        const utcDate = new Date(t.fecha_inicio)
        // Format as YYYY-MM-DD|HH:MM in Argentina timezone (UTC-3)
        const localStr = utcDate.toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
        // sv-SE gives "YYYY-MM-DD HH:MM:SS" format
        const [datePart, timePart] = localStr.split(' ')
        const slotKey = `${datePart}|${timePart.slice(0, 5)}` // "2026-04-04|10:00"
        slotBookingCount.set(slotKey, (slotBookingCount.get(slotKey) ?? 0) + 1)
    }

    // Generate available slots (9-18 weekdays, 10-13 saturdays)
    const allSlotTimes = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    ]

    const days: { date: string; dayOfWeek: number; dayNum: number; month: number; slots: string[] }[] = []

    for (let i = 1; i <= 21; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() + i)
        const dow = d.getDay()
        if (dow === 0) continue // skip sunday

        const dateStr = d.toISOString().split('T')[0]
        const slotsForDay = dow === 6
            ? allSlotTimes.filter(s => parseInt(s) < 13)
            : allSlotTimes

        // A slot is fully occupied only when ALL professionals are booked for it
        const available = slotsForDay.filter(slot => {
            const key = `${dateStr}|${slot}`
            const booked = slotBookingCount.get(key) ?? 0
            return booked < totalProfs
        })

        if (available.length > 0) {
            days.push({
                date: dateStr,
                dayOfWeek: dow,
                dayNum: d.getDate(),
                month: d.getMonth(),
                slots: available,
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
}) {
    const supabase = createAdminClient()
    const tenant = await getTenantBySlug(data.tenantSlug)
    if (!tenant) return { error: 'Consultorio no encontrado' }

    // Build the turno datetime
    const fechaInicio = new Date(`${data.fecha}T${data.hora}:00`)
    const fechaFin = new Date(fechaInicio)
    fechaFin.setMinutes(fechaFin.getMinutes() + 30) // 30 min default

    // Determine profesional
    let profesionalId = data.profesionalId
    if (!profesionalId || profesionalId === 'sin-preferencia') {
        // Assign first available profesional
        const { data: profs } = await supabase
            .from('profesionales')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('activo', true)
            .limit(1)
        profesionalId = profs?.[0]?.id ?? null
    }

    if (!profesionalId) return { error: 'No hay profesionales disponibles' }

    // Get default treatment type (Revisión de Rutina for online bookings)
    const { data: defaultTratamiento } = await supabase
        .from('tipos_tratamiento')
        .select('id')
        .ilike('nombre', '%Revisión%')
        .limit(1)
        .single()

    if (!defaultTratamiento) {
        // Fallback: get any treatment type
        const { data: anyTratamiento } = await supabase
            .from('tipos_tratamiento')
            .select('id')
            .limit(1)
            .single()
        if (!anyTratamiento) return { error: 'No hay tipos de tratamiento configurados' }
        defaultTratamiento && Object.assign(defaultTratamiento, anyTratamiento)
    }

    const tipoTratamientoId = defaultTratamiento?.id

    // Try to find existing patient by telefono
    let pacienteId: string | null = null
    if (data.telefono) {
        const { data: existing } = await supabase
            .from('pacientes')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('telefono', data.telefono)
            .single()
        pacienteId = existing?.id ?? null
    }

    // Create patient if new
    if (!pacienteId) {
        const { count } = await supabase
            .from('pacientes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)

        const nro = `HC-${String((count ?? 0) + 1).padStart(5, '0')}`

        const { data: newPat } = await supabase
            .from('pacientes')
            .insert({
                tenant_id: tenant.id,
                nro_historia_clinica: nro,
                nombre: data.nombre,
                apellido: data.apellido,
                telefono: data.telefono,
                email: data.email || null,
            })
            .select('id')
            .single()

        pacienteId = newPat?.id ?? null
    }

    // Insert turno
    const { error } = await supabase
        .from('turnos')
        .insert({
            tenant_id: tenant.id,
            paciente_id: pacienteId,
            profesional_id: profesionalId,
            tipo_tratamiento_id: tipoTratamientoId,
            fecha_inicio: fechaInicio.toISOString(),
            fecha_fin: fechaFin.toISOString(),
            estado: 'PENDIENTE',
            notas: data.notas || null,
            origen: 'ONLINE',
        })

    if (error) return { error: error.message }

    // --- DISPARAR WEBHOOK n8n (WhatsApp) ---
    try {
        const { data: wpConfig } = await supabase
            .from('tenant_integrations')
            .select('credentials, is_active')
            .eq('tenant_id', tenant.id)
            .eq('provider', 'whatsapp')
            .single()

        if (wpConfig?.is_active && wpConfig.credentials?.webhook_url) {
            // Disparo asíncrono sin bloquear la respuesta
            fetch(wpConfig.credentials.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    evento: 'nuevo_turno',
                    paciente: {
                        nombre: data.nombre,
                        apellido: data.apellido,
                        telefono: data.telefono,
                        email: data.email
                    },
                    turno: {
                        fecha: data.fecha,
                        hora: data.hora,
                        profesional_id: profesionalId,
                        notas: data.notas
                    },
                    clinica: {
                        nombre: tenant.nombre
                    }
                })
            }).catch(console.error)
        }
    } catch (e) {
        console.error("Excepción webhook WhatsApp:", e)
    }

    revalidatePath('/agenda')
    return { success: true }
}
