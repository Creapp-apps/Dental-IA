'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function getAdmin() {
    return createAdminClient()
}

/**
 * Obtiene la configuración de facturación y el historial de pagos de un tenant.
 */
export async function getBillingConfig(tenantId: string) {
    const supabase = getAdmin()

    // 1. Obtener settings
    const { data: settingsData, error: sErr } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('provider', 'billing_settings')
        .maybeSingle()

    // 2. Obtener pagos
    const { data: paymentsData, error: pErr } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('provider', 'billing_payments')
        .maybeSingle()

    const defaultSettings = {
        monto_abono: 0,
        fecha_vencimiento: '',
        alias_transferencia: '',
        cbu_transferencia: '',
        banco_transferencia: '',
        mp_link: '',
        estado: 'PENDIENTE_PAGO',
    }

    const defaultPayments = {
        payments: []
    }

    return {
        settings: settingsData ? { ...defaultSettings, ...settingsData.credentials } : defaultSettings,
        paymentsList: paymentsData ? (paymentsData.credentials?.payments || []) : [],
    }
}

/**
 * Actualiza los ajustes de facturación de un tenant.
 */
export async function updateBillingSettings(tenantId: string, settings: any) {
    const supabase = getAdmin()

    const { error } = await supabase
        .from('tenant_integrations')
        .upsert({
            tenant_id: tenantId,
            provider: 'billing_settings',
            credentials: {
                monto_abono: Number(settings.monto_abono) || 0,
                fecha_vencimiento: settings.fecha_vencimiento || '',
                alias_transferencia: settings.alias_transferencia || '',
                cbu_transferencia: settings.cbu_transferencia || '',
                banco_transferencia: settings.banco_transferencia || '',
                mp_link: settings.mp_link || '',
                estado: settings.estado || 'PENDIENTE_PAGO',
                updated_at: new Date().toISOString()
            },
            is_active: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'tenant_id,provider'
        })

    if (error) {
        console.error('Error updating billing settings:', error)
        return { error: error.message }
    }

    revalidatePath('/mis-pagos')
    return { success: true }
}

/**
 * Registra un nuevo pago en el historial de un tenant.
 */
export async function registrarPago(
    tenantId: string, 
    payment: { monto: number; metodo: string; periodo: string; fecha_pago: string }
) {
    const supabase = getAdmin()

    // 1. Obtener la lista actual de pagos
    const { data: paymentsData } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('provider', 'billing_payments')
        .maybeSingle()

    const currentPayments = paymentsData?.credentials?.payments || []
    
    // 2. Agregar el nuevo pago
    const newPayment = {
        id: crypto.randomUUID(),
        monto: Number(payment.monto) || 0,
        metodo: payment.metodo || 'TRANSFERENCIA',
        periodo: payment.periodo || '',
        fecha_pago: payment.fecha_pago || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
    }

    const updatedPayments = [newPayment, ...currentPayments]

    // 3. Guardar en la base de datos
    const { error } = await supabase
        .from('tenant_integrations')
        .upsert({
            tenant_id: tenantId,
            provider: 'billing_payments',
            credentials: {
                payments: updatedPayments
            },
            is_active: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'tenant_id,provider'
        })

    if (error) {
        console.error('Error registering billing payment:', error)
        return { error: error.message }
    }

    revalidatePath('/mis-pagos')
    return { success: true }
}

/**
 * Elimina un pago del historial de un tenant.
 */
export async function eliminarPago(tenantId: string, paymentId: string) {
    const supabase = getAdmin()

    // 1. Obtener la lista actual de pagos
    const { data: paymentsData } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('provider', 'billing_payments')
        .maybeSingle()

    const currentPayments: any[] = paymentsData?.credentials?.payments || []
    const updatedPayments = currentPayments.filter(p => p.id !== paymentId)

    // 2. Guardar en la base de datos
    const { error } = await supabase
        .from('tenant_integrations')
        .upsert({
            tenant_id: tenantId,
            provider: 'billing_payments',
            credentials: {
                payments: updatedPayments
            },
            is_active: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'tenant_id,provider'
        })

    if (error) {
        console.error('Error deleting payment:', error)
        return { error: error.message }
    }

    revalidatePath('/mis-pagos')
    return { success: true }
}

/**
 * Obtiene la lista de todos los tenants para el selector de Superadmin.
 */
export async function getTenants() {
    const supabase = getAdmin()
    const { data, error } = await supabase
        .from('tenants')
        .select('id, nombre, slug')
        .order('nombre')

    if (error) {
        console.error('Error fetching tenants list:', error)
        return []
    }

    return data || []
}
