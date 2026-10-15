import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActor } from '@/lib/auth/actor'
import { pacienteEnAlcance } from '@/lib/supabase/queries'
import { PresupuestoImprimible } from '@/components/pacientes/PresupuestoImprimible'

// Vista imprimible de un presupuesto (print -> Guardar como PDF). Protegida por
// el mismo alcance que la ficha: admin siempre, profesional según su scope.
export default async function ImprimirPresupuestoPage({
    params,
}: {
    params: Promise<{ id: string; presupuestoId: string }>
}) {
    const { id: pacienteId, presupuestoId } = await params

    const actor = await getActor()
    if (!actor?.tenantId) notFound()
    if (!(await pacienteEnAlcance(pacienteId))) notFound()

    const admin = createAdminClient()

    const { data: presupuesto } = await admin
        .from('presupuestos')
        .select('*, profesional:profesionales(nombre, apellido), items:presupuesto_items(*, tipo_tratamiento:tipos_tratamiento(nombre))')
        .eq('id', presupuestoId)
        .eq('tenant_id', actor.tenantId)
        .eq('paciente_id', pacienteId)
        .single()
    if (!presupuesto) notFound()

    const { data: paciente } = await admin
        .from('pacientes')
        .select('nombre, apellido, nro_historia_clinica')
        .eq('id', pacienteId)
        .eq('tenant_id', actor.tenantId)
        .single()

    const { data: tenant } = await admin
        .from('tenants')
        .select('nombre, direccion, ciudad, telefono, email_contacto')
        .eq('id', actor.tenantId)
        .single()

    return <PresupuestoImprimible presupuesto={presupuesto} paciente={paciente} tenant={tenant} />
}
