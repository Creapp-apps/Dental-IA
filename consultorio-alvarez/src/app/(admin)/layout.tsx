import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { resolveTenant } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

import { AdminBackground } from '@/components/ui/admin-background'
import { getLandingConfigAdmin } from '@/lib/actions/landing'
import { NotificationProvider } from '@/components/providers/NotificationProvider'
import { getCurrentUsuario, getTodayOperationalSummary } from '@/lib/supabase/queries'
import { getBillingConfig } from '@/lib/actions/billing'
import { BillingGuard } from '@/components/providers/BillingGuard'
import { NumpadTabProvider } from '@/components/providers/NumpadTabProvider'

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

    const [usuario, todaySummary, config] = await Promise.all([
        getCurrentUsuario(),
        getTodayOperationalSummary(),
        getLandingConfigAdmin()
    ])

    if (!usuario) {
        redirect(`/api/auth/logout?redirectTo=/login`)
    }

    // Obtener la configuración de cobros/abono para verificar suspensiones
    const billing = await getBillingConfig(usuario.tenant_id)
    const settings = billing?.settings

    let isBlocked = false
    let showSidebarAlert = false

    const headersList = await headers()
    const rawHost = headersList.get('x-tenant-host') || headersList.get('host')
    const cleanHost = rawHost ? rawHost.split(':')[0].toLowerCase() : ''
    const isLocalhost = cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost.endsWith('.vercel.app')

    const isSuperadmin = 
        usuario.rol === 'superadmin' || 
        user.email === 'creapp.ar@gmail.com' ||
        user.email === 'mazasebastian@hotmail.com' || 
        user.email?.endsWith('@creapp.com') || 
        user.email?.endsWith('@dental-ia.com')

    if (!isLocalhost && !isSuperadmin) {
        const requestedTenant = await resolveTenant(rawHost)
        if (requestedTenant && requestedTenant.custom_domain && usuario.tenant_id !== requestedTenant.id) {
            redirect(`/login?slug=${requestedTenant.slug}&error=${encodeURIComponent(`Tenés una sesión activa de otro consultorio. Iniciá sesión con tu cuenta de ${requestedTenant.nombre}.`)}`)
        }
    }

    if (settings?.fecha_vencimiento && !isSuperadmin) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const [year, month, day] = settings.fecha_vencimiento.split('-').map(Number)
        const expiry = new Date(year, month - 1, day)
        expiry.setHours(0, 0, 0, 0)

        const diffTime = expiry.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        const hasActivePayment = settings.estado === 'ACTIVO'

        // Bloqueo: si pasó la fecha y no pagó, o estado suspendido/vencido
        const expired = diffDays < 0 && !hasActivePayment
        const suspended = settings.estado === 'SUSPENDIDO' || settings.estado === 'VENCIDO'

        isBlocked = expired || suspended
        showSidebarAlert = diffDays <= 7 && !hasActivePayment
    }

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
            <div id="admin-layout-root" className="flex h-screen overflow-hidden bg-background relative selection:bg-primary/30 flex-col lg:flex-row">
                <AdminBackground colorHex={primaryStr} />
                <div className="relative z-10 flex w-full h-full flex-col lg:flex-row">
                    <NotificationProvider tenantId={usuario.tenant_id}>
                        <Sidebar 
                            userEmail={user.email} 
                            userRole={usuario.rol}
                            themeColor={primaryStr} 
                            logoConfig={config?.logo_config} 
                            showBillingAlert={showSidebarAlert}
                            todaySummary={todaySummary}
                        />
                        <main className="flex-1 overflow-y-auto">
                            <div className="min-h-full p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                                <BillingGuard isBlocked={isBlocked}>
                                    <NumpadTabProvider>
                                        {children}
                                    </NumpadTabProvider>
                                </BillingGuard>
                            </div>
                        </main>
                    </NotificationProvider>
                </div>
            </div>
        </>
    )
}

