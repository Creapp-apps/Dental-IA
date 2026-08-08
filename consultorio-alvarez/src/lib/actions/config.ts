'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// All config actions use the admin client (service_role key) to bypass RLS.
// This is safe because these are Server Actions — never exposed to the browser.
// Once Auth is implemented, we'll validate permissions here before executing.

function getAdmin() {
    return createAdminClient()
}

async function getTenantId() {
    const supabase = getAdmin()
    const { data } = await supabase.from('tenants').select('id').eq('slug', 'alvarez').single()
    return data?.id ?? null
}

export async function getTenantConfig() {
    const supabase = getAdmin()
    const { data } = await supabase.from('tenants').select('*').eq('slug', 'alvarez').single()
    return data
}

export async function actualizarTenant(updates: Record<string, any>) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const { error } = await supabase.from('tenants').update(updates).eq('id', tenantId)
    if (error) return { error: error.message }

    revalidatePath('/configuracion')
    return { success: true }
}

export async function actualizarHorarios(horarios: any[]) {
    return actualizarTenant({ horarios })
}

export async function crearProfesional(data: {
    nombre: string; apellido: string; especialidad?: string;
    matricula?: string; email: string; color_agenda?: string;
    avatar_url?: string; password?: string;
}) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    // 1. Crear el usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password || 'Alvarez2026!',
        email_confirm: true,
        user_metadata: {
            nombre: data.nombre,
            apellido: data.apellido
        }
    })

    if (authError) {
        return { error: `Error al crear acceso de usuario: ${authError.message}` }
    }

    const userId = authUser.user.id

    try {
        // 2. Crear el profesional en la tabla de profesionales
        const { data: profesional, error: profError } = await supabase
            .from('profesionales')
            .insert({
                tenant_id: tenantId,
                nombre: data.nombre,
                apellido: data.apellido,
                especialidad: data.especialidad || null,
                matricula: data.matricula || null,
                email: data.email,
                color_agenda: data.color_agenda || '#2563eb',
                foto_url: data.avatar_url || null,
                avatar_url: data.avatar_url || null,
                activo: true
            })
            .select('id')
            .single()

        if (profError) {
            await supabase.auth.admin.deleteUser(userId)
            return { error: `Error al registrar datos de profesional: ${profError.message}` }
        }

        // 3. Crear el usuario en la tabla public.usuarios
        const { error: userError } = await supabase
            .from('usuarios')
            .insert({
                id: userId,
                tenant_id: tenantId,
                email: data.email,
                nombre: data.nombre,
                apellido: data.apellido,
                rol: 'profesional',
                profesional_id: profesional.id,
                activo: true
            })

        if (userError) {
            await supabase.from('profesionales').delete().eq('id', profesional.id)
            await supabase.auth.admin.deleteUser(userId)
            return { error: `Error al vincular cuenta: ${userError.message}` }
        }

        revalidatePath('/configuracion')
        return { success: true }
    } catch (err: any) {
        await supabase.auth.admin.deleteUser(userId)
        return { error: err.message || 'Error desconocido' }
    }
}

export async function actualizarProfesional(id: string, data: Record<string, any>) {
    const supabase = getAdmin()
    
    // Obtenemos los valores antes de limpiarlos para actualizar la tabla correspondiente
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]))
    if (clean.avatar_url !== undefined) {
        clean.foto_url = clean.avatar_url;
        clean.avatar_url = clean.avatar_url;
    }
    
    // 1. Actualizar tabla de profesionales
    const { error: profError } = await supabase.from('profesionales').update(clean).eq('id', id)
    if (profError) return { error: profError.message }

    // 2. Buscar si tiene un usuario vinculado en public.usuarios
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('profesional_id', id)
        .maybeSingle()

    if (usuario?.id) {
        // Actualizar tabla public.usuarios
        const userUpdates: Record<string, any> = {}
        if (data.email) userUpdates.email = data.email
        if (data.nombre) userUpdates.nombre = data.nombre
        if (data.apellido) userUpdates.apellido = data.apellido
        if (data.avatar_url !== undefined) userUpdates.avatar_url = data.avatar_url

        if (Object.keys(userUpdates).length > 0) {
            const { error: userError } = await supabase.from('usuarios').update(userUpdates).eq('id', usuario.id)
            if (userError) return { error: `Error al actualizar cuenta vinculada: ${userError.message}` }
        }

        // Actualizar email en Supabase Auth si cambió
        if (data.email) {
            const { error: authError } = await supabase.auth.admin.updateUserById(usuario.id, { email: data.email })
            if (authError) return { error: `Error al actualizar credenciales: ${authError.message}` }
        }
    }

    revalidatePath('/configuracion')
    return { success: true }
}

export async function toggleProfesionalEstado(id: string, activo: boolean) {
    const supabase = getAdmin()
    
    // 1. Actualizar estado del profesional
    const { error: profError } = await supabase.from('profesionales').update({ activo }).eq('id', id)
    if (profError) return { error: profError.message }

    // 2. Sincronizar estado en public.usuarios
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('profesional_id', id)
        .maybeSingle()

    if (usuario?.id) {
        const { error: userError } = await supabase.from('usuarios').update({ activo }).eq('id', usuario.id)
        if (userError) return { error: `Error al sincronizar estado de acceso: ${userError.message}` }
    }

    revalidatePath('/configuracion')
    return { success: true }
}

export async function eliminarProfesional(id: string) {
    const supabase = getAdmin()

    // 1. Obtener el usuario vinculado en public.usuarios (si existe)
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('profesional_id', id)
        .maybeSingle()

    // 2. Intentar eliminar el profesional primero (para validar restricciones de clave foránea)
    const { error: profError } = await supabase.from('profesionales').delete().eq('id', id)
    if (profError) {
        if (profError.code === '23503') {
            return { error: 'No se puede eliminar el profesional porque tiene turnos, historiales clínicos o presupuestos asociados. Se recomienda desactivar su cuenta.' }
        }
        return { error: `Error al eliminar profesional: ${profError.message}` }
    }

    // 3. Si se eliminó correctamente el profesional, eliminamos la cuenta de usuario vinculada
    if (usuario?.id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(usuario.id)
        if (authError) {
            console.error('Error al borrar de auth:', authError.message)
        }
        
        const { error: userError } = await supabase.from('usuarios').delete().eq('id', usuario.id)
        if (userError) {
            console.error('Error al borrar de public.usuarios:', userError.message)
        }
    }

    revalidatePath('/configuracion')
    return { success: true }
}

export async function crearObraSocial(data: { nombre: string; codigo?: string; planes?: string }) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const { error } = await supabase.from('obras_sociales').insert({ tenant_id: tenantId, ...data })
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function toggleObraSocial(id: string, activo: boolean) {
    const supabase = getAdmin()
    const { error } = await supabase.from('obras_sociales').update({ activo }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function actualizarObraSocial(id: string, data: { nombre?: string; codigo?: string; planes?: string }) {
    const supabase = getAdmin()
    const { error } = await supabase.from('obras_sociales').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function eliminarObraSocial(id: string) {
    const supabase = getAdmin()
    const { error } = await supabase.from('obras_sociales').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function crearTipoTratamiento(data: {
    nombre: string; duracion_minutos: number; precio_referencia?: number;
    color?: string; descripcion?: string
}) {
    const supabase = getAdmin()
    const tenantId = await getTenantId()
    if (!tenantId) return { error: 'Tenant no encontrado' }

    const { error } = await supabase.from('tipos_tratamiento').insert({
        tenant_id: tenantId, ...data,
        color: data.color || '#3b82f6',
    })

    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function toggleTipoTratamiento(id: string, activo: boolean) {
    const supabase = getAdmin()
    const { error } = await supabase.from('tipos_tratamiento').update({ activo }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function actualizarTipoTratamiento(id: string, data: {
    nombre?: string; duracion_minutos?: number; precio_referencia?: number;
    color?: string; descripcion?: string
}) {
    const supabase = getAdmin()
    const { error } = await supabase.from('tipos_tratamiento').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function eliminarTipoTratamiento(id: string) {
    const supabase = getAdmin()
    const { error } = await supabase.from('tipos_tratamiento').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}
