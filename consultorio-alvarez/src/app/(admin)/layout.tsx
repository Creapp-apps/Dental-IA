import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

import { AdminBackground } from '@/components/ui/admin-background'
import { getLandingConfigAdmin } from '@/lib/actions/landing'
import { NotificationProvider } from '@/components/providers/NotificationProvider'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Segunda línea de defensa (el middleware es la primera)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const config = await getLandingConfigAdmin()

    // En Tailwind v4 inyectamos una etiqueta <style> global para asegurar que los componentes
    // renderizados a través de Portals (como los Modales, Selects y Toasts) también hereden
    // el color primario de la marca y no queden con el azul por defecto en el <body>.
    const primaryStr = config?.color_primary || '#2563eb'
    const customStyle = `
        html, body, :root, .dark {
            --sidebar-primary: ${primaryStr} !important;
            --primary: ${primaryStr} !important;
            --ring: ${primaryStr} !important;
        }
    `

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: customStyle }} />
            <div className="flex h-screen overflow-hidden bg-background relative selection:bg-primary/30">
                <AdminBackground colorHex={primaryStr} />
                <div className="relative z-10 flex w-full h-full">
                    <NotificationProvider>
                        <Sidebar userEmail={user.email} themeColor={primaryStr} logoConfig={config?.logo_config} />
                        <main className="flex-1 overflow-y-auto">
                            <div className="min-h-full p-6 lg:p-8">
                                {children}
                            </div>
                        </main>
                    </NotificationProvider>
                </div>
            </div>
        </>
    )
}
