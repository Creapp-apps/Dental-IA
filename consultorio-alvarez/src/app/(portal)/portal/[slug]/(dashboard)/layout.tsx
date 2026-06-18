import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLandingConfigPublica } from '@/lib/actions/landing'
import { PortalNavbar } from '@/components/portal/PortalNavbar'

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
        await supabase.auth.signOut()
        redirect(`/portal/${slug}/login`)
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
