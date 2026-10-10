import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { esEmailSuperadmin } from '@/lib/auth/superadmins'
import type { Rol } from '@/types'

// ============================================================
// EL ACTOR — único origen de identidad del lado servidor.
// Diseño: docs/plans/2026-10-08-roles-y-permisos-design.md §6 y §12
//
// Toda server action que exija un permiso abre con uno de los require*()
// de este archivo. La capa da errores claros y permite que la interfaz
// esconda lo que no corresponde; a partir de la migración 021 la base de
// datos es la que realmente frena.
// ============================================================

export interface Actor {
    userId: string
    email: string
    tenantId: string | null
    rol: Rol
    profesionalId: string | null
    esSuperadmin: boolean
}

/** Actor del que ya se sabe que pertenece a un consultorio. */
export interface ActorConTenant extends Actor {
    tenantId: string
}

export const ERROR_SIN_SESION = 'No autorizado. Sesión no encontrada.'
export const ERROR_SIN_TENANT = 'Tenant no encontrado'
export const ERROR_SOLO_ADMIN = 'Acceso denegado. Esta operación es sólo para administradores del consultorio.'
export const ERROR_SOLO_SUPERADMIN = 'Acceso denegado. Se requieren permisos de Superadmin.'

// Superadmins de la plataforma reconocidos por email, independientemente de
// lo que diga public.usuarios.
export { esEmailSuperadmin }

/**
 * Identidad del usuario autenticado, cacheada por request.
 * Devuelve null si no hay sesión, o si hay sesión pero no pertenece al equipo
 * de ningún consultorio ni es superadmin por email (caso típico: un paciente
 * del portal, que es `authenticated` sin fila en public.usuarios).
 */
export const getActor = cache(async (): Promise<Actor | null> => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const email = user.email || ''

    const admin = createAdminClient()
    const { data: usuario } = await admin
        .from('usuarios')
        .select('tenant_id, rol, profesional_id')
        .eq('id', user.id)
        .maybeSingle()

    if (!usuario) {
        // Sin fila en public.usuarios sólo sobrevive el superadmin por email,
        // que opera cruzando consultorios y no pertenece a ninguno.
        if (!esEmailSuperadmin(email)) return null
        return {
            userId: user.id,
            email,
            tenantId: null,
            rol: 'superadmin',
            profesionalId: null,
            esSuperadmin: true,
        }
    }

    return {
        userId: user.id,
        email,
        tenantId: usuario.tenant_id ?? null,
        rol: usuario.rol as Rol,
        profesionalId: usuario.profesional_id ?? null,
        esSuperadmin: usuario.rol === 'superadmin' || esEmailSuperadmin(email),
    }
})

/**
 * Resultado de un guard. El llamador hace:
 *   const { ok, actor, error: denied } = await requireAdmin()
 *   if (!ok) return { error: denied }
 * El campo `ok` es lo que le permite a TypeScript saber que, pasado ese if,
 * `actor` existe.
 */
export type Guard<T extends Actor = Actor> =
    | { ok: true; actor: T; error?: undefined }
    | { ok: false; actor?: undefined; error: string }

/** Exige sesión y pertenencia a un consultorio, sin mirar el rol. */
export async function requireActor(): Promise<Guard<ActorConTenant>> {
    const actor = await getActor()
    if (!actor) return { ok: false, error: ERROR_SIN_SESION }
    if (!actor.tenantId) return { ok: false, error: ERROR_SIN_TENANT }
    return { ok: true, actor: actor as ActorConTenant }
}

/** Exige uno de los roles indicados, dentro de un consultorio. */
export async function requireRol(...roles: Rol[]): Promise<Guard<ActorConTenant>> {
    const guard = await requireActor()
    if (!guard.ok) return guard
    const { actor } = guard
    if (!roles.includes(actor.rol) && !actor.esSuperadmin) {
        return { ok: false, error: roles.includes('admin') ? ERROR_SOLO_ADMIN : 'Acceso denegado.' }
    }
    return { ok: true, actor }
}

/**
 * Exige administrador del consultorio. El superadmin de la plataforma pasa,
 * porque opera los consultorios desde el panel de Dental-IA.
 */
export async function requireAdmin(): Promise<Guard<ActorConTenant>> {
    return requireRol('admin')
}

/** Exige superadmin de la plataforma. Puede no tener consultorio propio. */
export async function requireSuperadmin(): Promise<Guard<Actor>> {
    const actor = await getActor()
    if (!actor) return { ok: false, error: ERROR_SIN_SESION }
    if (!actor.esSuperadmin) return { ok: false, error: ERROR_SOLO_SUPERADMIN }
    return { ok: true, actor }
}

/**
 * Variante que lanza, para los caminos que ya manejaban el permiso con throw
 * (superadmin.ts) o donde no hay un objeto de error que devolver.
 */
export async function assertSuperadmin(): Promise<Actor> {
    const guard = await requireSuperadmin()
    if (!guard.ok) throw new Error(guard.error)
    return guard.actor
}

/** Igual que assertSuperadmin, para operaciones de administración del consultorio. */
export async function assertAdmin(): Promise<ActorConTenant> {
    const guard = await requireAdmin()
    if (!guard.ok) throw new Error(guard.error)
    return guard.actor
}
