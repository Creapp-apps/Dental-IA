import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuperadminHeader } from '@/components/superadmin/SuperadminHeader'

export default async function SuperadminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Verificar perfil y rol en public.usuarios
    const { data: profile } = await supabase
        .from('usuarios')
        .select('id, email, rol, tenant_id')
        .eq('id', user.id)
        .maybeSingle()

    const userEmail = user.email || ''
    const isSuperadmin = 
        profile?.rol === 'superadmin' || 
        userEmail === 'creapp.ar@gmail.com' ||
        userEmail === 'mazasebastian@hotmail.com' || 
        userEmail.endsWith('@creapp.com') || 
        userEmail.endsWith('@dental-ia.com')

    if (!isSuperadmin) {
        // Redirigir a usuarios normales a su backoffice del consultorio
        redirect('/admin')
    }

    // Obtener lista básica de tenants para el switcher del header
    const { data: tenantsList } = await supabase
        .from('tenants')
        .select('id, slug, nombre')
        .order('nombre', { ascending: true })

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30 font-sans antialiased">
            {/* Fondo ambiental SaaS */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent blur-3xl" />
                <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-violet-600/5 blur-3xl rounded-full" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <SuperadminHeader 
                    userEmail={userEmail} 
                    tenants={tenantsList || []} 
                />
                
                <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
