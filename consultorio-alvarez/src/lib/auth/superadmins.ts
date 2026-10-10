// Única lista de superadmins de la plataforma, reconocidos por email aunque
// public.usuarios diga otra cosa. Vive en un módulo puro, sin dependencias de
// Supabase ni de React, para que puedan importarla también el middleware
// (proxy.ts, runtime edge) y los componentes de cliente.
//
// El actor del servidor la usa desde @/lib/auth/actor.

const EMAILS_SUPERADMIN = ['creapp.ar@gmail.com', 'mazasebastian@hotmail.com']
const DOMINIOS_SUPERADMIN = ['@creapp.com', '@dental-ia.com']

export function esEmailSuperadmin(email?: string | null): boolean {
    const e = (email || '').trim().toLowerCase()
    if (!e) return false
    return EMAILS_SUPERADMIN.includes(e) || DOMINIOS_SUPERADMIN.some(d => e.endsWith(d))
}
