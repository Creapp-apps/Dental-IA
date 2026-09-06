import { getTenantConfig } from '@/lib/actions/config'
import { getProfesionales, getObrasSociales, getTiposTratamiento, getCurrentUsuario } from '@/lib/supabase/queries'
import { getLandingConfigAdmin } from '@/lib/actions/landing'
import { ConfigView } from '@/components/config/ConfigView'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ConfiguracionPage() {
    const usuario = await getCurrentUsuario()
    if (usuario?.rol === 'profesional') {
        redirect('/agenda')
    }

    // Para simplificar la inyección de integraciones, las traemos directamente usando la session del usuario
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('usuarios').select('tenant_id').eq('id', user?.id).single()
    const tenantId = profile?.tenant_id

    const [tenant, profesionales, obrasSociales, tiposTratamiento, landingConfig, { data: integrations }] = await Promise.all([
        getTenantConfig(tenantId),
        getProfesionales(false),
        getObrasSociales(false),
        getTiposTratamiento(false),
        getLandingConfigAdmin(),
        tenantId ? supabase.from('tenant_integrations').select('*').eq('tenant_id', tenantId) : Promise.resolve({ data: [] }),
    ])

    if (!tenant) return <p className="text-muted-foreground">Tenant no encontrado</p>

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración General</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Administrá la identidad del consultorio, equipo médico, horarios y servicios
                    </p>
                </div>
            </div>
            <ConfigView
                tenant={tenant}
                profesionales={profesionales}
                obrasSociales={obrasSociales}
                tiposTratamiento={tiposTratamiento}
                integrations={integrations || []}
                landingConfig={landingConfig}
                slug={tenant.slug ?? 'alvarez'}
            />
        </div>
    )
}
