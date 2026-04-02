import { getTenantConfig } from '@/lib/actions/config'
import { getProfesionales, getObrasSociales, getTiposTratamiento } from '@/lib/supabase/queries'
import { getLandingConfigAdmin } from '@/lib/actions/landing'
import { ConfigView } from '@/components/config/ConfigView'
import { createClient } from '@/lib/supabase/server'

export default async function ConfiguracionPage() {
    // Para simplificar la inyección de integraciones, las traemos directamente usando la session del usuario
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single()
    const tenantId = profile?.tenant_id

    const [tenant, profesionales, obrasSociales, tiposTratamiento, landingConfig, { data: integrations }] = await Promise.all([
        getTenantConfig(),
        getProfesionales(false),
        getObrasSociales(false),
        getTiposTratamiento(false),
        getLandingConfigAdmin(),
        tenantId ? supabase.from('tenant_integrations').select('*').eq('tenant_id', tenantId) : Promise.resolve({ data: [] }),
    ])

    if (!tenant) return <p className="text-muted-foreground">Tenant no encontrado</p>

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Administrá los datos del consultorio, profesionales y horarios
                </p>
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
