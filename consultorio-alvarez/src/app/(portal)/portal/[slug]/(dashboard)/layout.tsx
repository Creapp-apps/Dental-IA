import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { resolveTenant } from '@/lib/tenant'
import { PortalNavbar } from '@/components/portal/PortalNavbar'

// Igual que en el panel: la pestaña lleva el nombre del consultorio del portal,
// no el título fijo de la raíz.
export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}): Promise<Metadata> {
    const { slug } = await params
    const tenant = await resolveTenant(slug)
    const nombre = tenant?.nombre?.trim()

    return {
        title: nombre ? `${nombre} - Portal del Paciente` : 'Portal del Paciente | Dental-IA',
    }
}

export default async function PortalLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
        redirect(`/portal/${slug}/login`)
    }

    // Buscar el paciente vinculado a este email en este tenant
    const config = await getLandingConfigPublica(slug)
    if (!config) {
        redirect(`/portal/${slug}/login`)
    }

    const { data: paciente } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido, telefono, email')
        .eq('tenant_id', config.tenant_id)
        .eq('email', user.email.toLowerCase())
        .single()

    if (!paciente) {
        // El email autenticado no corresponde a un paciente de este tenant
        // Redirigir a la API de logout para limpiar la sesión en el cliente
        redirect(`/api/auth/logout?redirectTo=/portal/${slug}/login`)
    }

    const primaryStr = config?.color_primary || '#2563eb'
    const customStyle = `
        html, body, :root, .dark {
            --primary: ${primaryStr} !important;
            --ring: ${primaryStr} !important;
        }
    `

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: customStyle }} />
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <PortalNavbar
                    slug={slug}
                    patientName={`${paciente.nombre} ${paciente.apellido}`}
                    themeColor={primaryStr}
                    logoConfig={config?.logo_config}
                />
                <main className="max-w-5xl mx-auto px-4 py-6">
                    {children}
                </main>
            </div>
        </>
    )
}
