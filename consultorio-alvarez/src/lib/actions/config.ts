'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedTenantId } from '@/lib/supabase/queries'
import { requireAdmin } from '@/lib/auth/actor'
import { revalidatePath } from 'next/cache'

// Configurar el consultorio es sólo de admin, y cada operación por id se acota
// al consultorio del actor, para que un id ajeno no sea alcanzable aunque se
// invoque a mano.
// Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §7 y §12
//
// El equipo del consultorio tiene dos roles: admin, que administra y ve los
// datos de contacto y los cobros, y profesional, que atiende.
// Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §4 y §5
export type RolConsultorio = 'admin' | 'profesional'

function rolValido(rol?: string): RolConsultorio {
    return rol === 'admin' ? 'admin' : 'profesional'
}

// Obras sociales, tipos de tratamiento y los datos del consultorio pasan al
// cliente con sesión: ahí las políticas de la migración 021 se evalúan de
// verdad y requireAdmin() queda como segunda línea, la que da el error claro.
// El alta y la baja de profesionales siguen con el cliente admin porque tocan
// la API de auth (crear y borrar credenciales), que exige service_role.

function getAdmin() {
    return createAdminClient()
}

async function getTenantId() {
    return await getAuthenticatedTenantId()
}

export async function getTenantConfig(explicitTenantId?: string) {
    const supabase = getAdmin()
    const tenantId = explicitTenantId || (await getTenantId())
    if (!tenantId) return null

    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle()
    return data
}

export async function actualizarTenant(updates: Record<string, any>) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const tenantId = actor.tenantId

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
    rol?: RolConsultorio;
}) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = getAdmin()
    const tenantId = actor.tenantId

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
                rol: rolValido(data.rol),
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
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = getAdmin()

    // El rol no vive en `profesionales` sino en la cuenta vinculada, así que
    // sale del payload antes de tocar la tabla.
    const { rol: rolPedido, ...datosProfesional } = data

    // Obtenemos los valores antes de limpiarlos para actualizar la tabla correspondiente
    const clean = Object.fromEntries(Object.entries(datosProfesional).map(([k, v]) => [k, v === '' ? null : v]))
    if (clean.avatar_url !== undefined) {
        clean.foto_url = clean.avatar_url;
        clean.avatar_url = clean.avatar_url;
    }
    
    // 1. Actualizar tabla de profesionales
    const { error: profError } = await supabase.from('profesionales').update(clean).eq('id', id).eq('tenant_id', actor.tenantId)
    if (profError) return { error: profError.message }

    // 2. Buscar si tiene un usuario vinculado en public.usuarios
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, rol')
        .eq('profesional_id', id)
        .eq('tenant_id', actor.tenantId)
        .maybeSingle()

    // 2.b Cambio de rol, con las dos guardas que importan: nadie se cambia el
    // rol a sí mismo, y el consultorio no puede quedarse sin ningún admin.
    if (rolPedido !== undefined && usuario?.id) {
        const nuevoRol = rolValido(rolPedido)

        if (usuario.rol !== 'superadmin' && nuevoRol !== usuario.rol) {
            if (usuario.id === actor.userId) {
                return { error: 'No podés cambiar tu propio rol. Pedíselo a otro administrador.' }
            }

            if (usuario.rol === 'admin') {
                const { count } = await supabase
                    .from('usuarios')
                    .select('id', { count: 'exact', head: true })
                    .eq('tenant_id', actor.tenantId)
                    .in('rol', ['admin', 'superadmin'])
                    .neq('id', usuario.id)

                if (!count || count === 0) {
                    return { error: 'Es el único administrador del consultorio. Nombrá otro antes de cambiarle el rol.' }
                }
            }

            const { error: rolError } = await supabase
                .from('usuarios')
                .update({ rol: nuevoRol })
                .eq('id', usuario.id)
                .eq('tenant_id', actor.tenantId)

            if (rolError) return { error: `Error al cambiar el rol: ${rolError.message}` }
        }
    }

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
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = getAdmin()
    
    // 1. Actualizar estado del profesional
    const { error: profError } = await supabase.from('profesionales').update({ activo }).eq('id', id).eq('tenant_id', actor.tenantId)
    if (profError) return { error: profError.message }

    // 2. Sincronizar estado en public.usuarios
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('profesional_id', id)
        .eq('tenant_id', actor.tenantId)
        .maybeSingle()

    if (usuario?.id) {
        const { error: userError } = await supabase.from('usuarios').update({ activo }).eq('id', usuario.id)
        if (userError) return { error: `Error al sincronizar estado de acceso: ${userError.message}` }
    }

    revalidatePath('/configuracion')
    return { success: true }
}

export async function eliminarProfesional(id: string) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = getAdmin()

    // 1. Obtener el usuario vinculado en public.usuarios (si existe)
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('profesional_id', id)
        .eq('tenant_id', actor.tenantId)
        .maybeSingle()

    // 2. Intentar eliminar el profesional primero (para validar restricciones de clave foránea)
    const { error: profError } = await supabase.from('profesionales').delete().eq('id', id).eq('tenant_id', actor.tenantId)
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
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const tenantId = actor.tenantId

    const { error } = await supabase.from('obras_sociales').insert({ tenant_id: tenantId, ...data })
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function toggleObraSocial(id: string, activo: boolean) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const { error } = await supabase.from('obras_sociales').update({ activo }).eq('id', id).eq('tenant_id', actor.tenantId)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function actualizarObraSocial(id: string, data: { nombre?: string; codigo?: string; planes?: string }) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const { error } = await supabase.from('obras_sociales').update(data).eq('id', id).eq('tenant_id', actor.tenantId)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function eliminarObraSocial(id: string) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const { error } = await supabase.from('obras_sociales').delete().eq('id', id).eq('tenant_id', actor.tenantId)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function crearTipoTratamiento(data: {
    nombre: string; duracion_minutos: number; precio_referencia?: number;
    color?: string; descripcion?: string
}) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const tenantId = actor.tenantId

    const { error } = await supabase.from('tipos_tratamiento').insert({
        tenant_id: tenantId, ...data,
        color: data.color || '#3b82f6',
    })

    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function toggleTipoTratamiento(id: string, activo: boolean) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const { error } = await supabase.from('tipos_tratamiento').update({ activo }).eq('id', id).eq('tenant_id', actor.tenantId)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function actualizarTipoTratamiento(id: string, data: {
    nombre?: string; duracion_minutos?: number; precio_referencia?: number;
    color?: string; descripcion?: string
}) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const { error } = await supabase.from('tipos_tratamiento').update(data).eq('id', id).eq('tenant_id', actor.tenantId)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}

export async function eliminarTipoTratamiento(id: string) {
    const { ok, actor, error: denied } = await requireAdmin()
    if (!ok) return { error: denied }
    const supabase = await createClient()
    const { error } = await supabase.from('tipos_tratamiento').delete().eq('id', id).eq('tenant_id', actor.tenantId)
    if (error) return { error: error.message }
    revalidatePath('/configuracion')
    return { success: true }
}
