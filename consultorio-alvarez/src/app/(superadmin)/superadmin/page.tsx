import { getSaasOverview } from '@/lib/actions/superadmin'
import { SuperadminDashboardClient } from '@/components/superadmin/SuperadminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function SuperadminPage() {
    const { tenants, metrics } = await getSaasOverview()

    return (
        <SuperadminDashboardClient
            initialTenants={tenants}
            initialMetrics={metrics}
        />
    )
}
