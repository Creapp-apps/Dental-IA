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

/**
 * Verifica si una suscripción con un endpoint específico está registrada en la BD para el usuario logueado.
 */
export async function verificarSuscripcionBD(endpoint: string): Promise<{ success: boolean; exists: boolean; error?: string }> {
    try {
        if (!endpoint) {
            return { success: false, exists: false, error: 'Endpoint no provisto' }
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, exists: false, error: 'No autenticado' }
        }

        const { data, error } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('profile_id', user.id)
            .eq('subscription->>endpoint', endpoint)

        if (error) {
            console.error('Error al verificar suscripción push en BD:', error)
            return { success: false, exists: false, error: 'Error al consultar la base de datos.' }
        }

        return { success: true, exists: data && data.length > 0 }
    } catch (e: any) {
        console.error('Error en verificarSuscripcionBD:', e)
        return { success: false, exists: false, error: e.message || 'Error interno.' }
    }
}

/**
 * Envía una notificación push de prueba a un endpoint de suscripción específico del usuario.
 */
export async function enviarPruebaPush(endpoint: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!endpoint) {
            return { success: false, error: 'Endpoint no provisto' }
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        // Buscar la suscripción completa en la BD
        const { data, error } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('profile_id', user.id)
            .eq('subscription->>endpoint', endpoint)
            .single()

        if (error || !data) {
            return { success: false, error: 'Suscripción no encontrada en el servidor. Activá nuevamente las notificaciones.' }
        }

        const { sendPushNotification } = await import('@/lib/push-notifications/send-push')
        const sent = await sendPushNotification(
            data.subscription,
            '🔔 Prueba de Notificación',
            '¡Excelente! Las notificaciones push están configuradas y funcionando correctamente en este dispositivo.',
            '/agenda'
        )

        if (!sent) {
            return { success: false, error: 'No se pudo enviar la notificación. Es posible que el token haya expirado.' }
        }

        return { success: true }
    } catch (e: any) {
        console.error('Error en enviarPruebaPush:', e)
        return { success: false, error: e.message || 'Error interno al enviar la prueba.' }
    }
}
