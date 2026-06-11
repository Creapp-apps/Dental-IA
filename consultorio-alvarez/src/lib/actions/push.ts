'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Registra o actualiza una suscripción push en la base de datos para el usuario logueado.
 */
export async function registrarSuscripcionPush(subscription: any): Promise<{ success: boolean; error?: string }> {
    try {
        if (!subscription || !subscription.endpoint) {
            return { success: false, error: 'Suscripción inválida' }
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        const endpoint = subscription.endpoint

        // Intentamos borrar suscripciones duplicadas con el mismo endpoint para este usuario antes de insertar
        await supabase
            .from('push_subscriptions')
            .delete()
            .eq('profile_id', user.id)
            .eq('subscription->>endpoint', endpoint)

        // Insertar la nueva suscripción
        const { error } = await supabase
            .from('push_subscriptions')
            .insert({
                profile_id: user.id,
                subscription: subscription
            })

        if (error) {
            console.error('Error registrando suscripción push en BD:', error)
            return { success: false, error: 'Error al registrar la suscripción en la base de datos.' }
        }

        return { success: true }
    } catch (e: any) {
        console.error('Error en registrarSuscripcionPush Server Action:', e)
        return { success: false, error: e.message || 'Error interno del servidor.' }
    }
}

/**
 * Remueve una suscripción push del usuario basándose en el endpoint.
 */
export async function removerSuscripcionPush(endpoint: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!endpoint) {
            return { success: false, error: 'Endpoint no provisto' }
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('profile_id', user.id)
            .eq('subscription->>endpoint', endpoint)

        if (error) {
            console.error('Error removiendo suscripción push de la BD:', error)
            return { success: false, error: 'Error al eliminar la suscripción de la base de datos.' }
        }

        return { success: true }
    } catch (e: any) {
        console.error('Error en removerSuscripcionPush Server Action:', e)
        return { success: false, error: e.message || 'Error interno del servidor.' }
    }
}
