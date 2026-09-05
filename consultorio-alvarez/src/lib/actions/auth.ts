'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── LOGIN ──────────────────────────────────────────────────────
export async function loginAction(formData: FormData): Promise<{
    success?: boolean
    redirectTo?: string
    error?: string
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

    const isSuperadmin = 
        profile?.rol === 'superadmin' || 
        userEmail === 'creapp.ar@gmail.com' ||
        userEmail === 'mazasebastian@hotmail.com' || 
        userEmail.endsWith('@creapp.com') || 
        userEmail.endsWith('@dental-ia.com')

    revalidatePath('/', 'layout')

    return {
        success: true,
        redirectTo: isSuperadmin ? '/superadmin' : '/admin'
    }
}

// ── LOGOUT ─────────────────────────────────────────────────────
export async function logoutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
