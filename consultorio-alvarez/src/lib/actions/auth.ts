'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { esEmailSuperadmin } from '@/lib/auth/superadmins'

// ── LOGIN ──────────────────────────────────────────────────────
export interface MarcaTenant {
    nombre: string
    slug: string
    logo_url: string | null
    color_primario: string | null
}

export async function loginAction(formData: FormData): Promise<{
    success?: boolean
    redirectTo?: string
    error?: string
    /** Marca del consultorio del usuario, para la pantalla de ingreso. */
    tenant?: MarcaTenant | null
}> {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Por favor completá todos los campos requeridos.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return { error: error.message }
    }

    if (!data.user) {
        return { error: 'No se pudo verificar la sesión.' }
    }

    // Verificar si el usuario autenticado tiene rol de superadmin o es email propietario
    const userEmail = data.user?.email || email
    const { data: profile } = await supabase
        .from('usuarios')
        .select('rol, tenant_id')
        .eq('id', data.user.id)
        .maybeSingle()

    const isSuperadmin = profile?.rol === 'superadmin' || esEmailSuperadmin(userEmail)

    // La marca que corresponde mostrar mientras se entra sólo se conoce acá:
    // en el dominio de la plataforma el formulario no sabe de qué consultorio
    // es quien está escribiendo su email.
    let tenant: MarcaTenant | null = null
    if (profile?.tenant_id) {
        const { data } = await supabase
            .from('tenants')
            .select('nombre, slug, logo_url, color_primario')
            .eq('id', profile.tenant_id)
            .maybeSingle()
        tenant = (data as MarcaTenant | null) ?? null
    }

    revalidatePath('/', 'layout')

    return {
        success: true,
        redirectTo: isSuperadmin ? '/superadmin' : '/admin',
        tenant
    }
}

// ── LOGOUT ─────────────────────────────────────────────────────
export async function logoutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
