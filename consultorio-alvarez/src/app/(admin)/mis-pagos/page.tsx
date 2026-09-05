import { createClient } from '@/lib/supabase/server'
import { getBillingConfig, getTenants } from '@/lib/actions/billing'
import { MisPagosView } from '@/components/billing/MisPagosView'
import { redirect } from 'next/navigation'

export default async function MisPagosPage() {
    const supabase = await createClient()
    
    // 1. Obtener sesión del usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return <p className="text-muted-foreground p-4">Debe iniciar sesión para ver esta página.</p>
    }

    // 2. Obtener tenant_id y rol del usuario
    const { data: profile } = await supabase
        .from('usuarios')
        .select('tenant_id, rol')
        .eq('id', user.id)
        .single()

    if (profile?.rol === 'profesional') {
        redirect('/agenda')
    }

    const tenantId = profile?.tenant_id
    if (!tenantId) {
        return <p className="text-muted-foreground p-4">No se encontró el consultorio asociado a su usuario.</p>
    }

    // 3. Obtener configuración de facturación y lista de tenants
    const [billingData, tenants] = await Promise.all([
        getBillingConfig(tenantId),
        getTenants()
    ])
    return (
        <div className="space-y-6">
            <MisPagosView
                initialSettings={billingData.settings}
                initialPaymentsList={billingData.paymentsList}
                tenants={tenants}
                currentTenantId={tenantId}
                userEmail={user.email || ''}
                userRole={profile?.rol || ''}
            />
        </div>
    )
}
