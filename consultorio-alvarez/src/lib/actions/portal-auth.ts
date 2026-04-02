'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ── MAGIC LINK ─────────────────────────────────────────────────
export async function sendMagicLink(email: string, slug: string) {
    const supabase = await createClient()

    // 1. Verificar que el email existe como paciente de este tenant
    const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .single()

    if (!tenant) return { error: 'Consultorio no encontrado' }

    const { data: paciente } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido')
        .eq('tenant_id', tenant.id)
        .eq('email', email.toLowerCase().trim())
        .single()

    if (!paciente) {
        return { error: 'No encontramos una cuenta con ese email. Contactá a tu consultorio.' }
    }

    // 2. Enviar Magic Link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
            emailRedirectTo: `${baseUrl}/portal/${slug}`,
        },
    })

    if (error) return { error: error.message }

    return { success: true, nombre: `${paciente.nombre} ${paciente.apellido}` }
}

// ── GET PATIENT BY AUTH ────────────────────────────────────────
export async function getPatientByAuth(slug: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return null

    const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .single()

    if (!tenant) return null

    const { data: paciente } = await supabase
        .from('pacientes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('email', user.email.toLowerCase())
        .single()

    return paciente ?? null
}

// ── LOGOUT ─────────────────────────────────────────────────────
export async function logoutPatient(slug: string) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect(`/portal/${slug}/login`)
}
