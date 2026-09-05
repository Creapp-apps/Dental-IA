'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── LOGIN ──────────────────────────────────────────────────────
export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        // Encodeamos el error en la URL para mostrarlo en la UI
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
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

    if (isSuperadmin) {
        redirect('/superadmin')
    }

    redirect('/admin')
}

// ── LOGOUT ─────────────────────────────────────────────────────
export async function logoutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
