import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@dental-ia.com'

if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
}

/**
 * Envía una notificación push a una suscripción específica y maneja la expiración del endpoint.
 */
export async function sendPushNotification(
    subscription: any,
    title: string,
    body: string,
    url: string
): Promise<boolean> {
    if (!publicKey || !privateKey) {
        console.error('VAPID keys not configured. Cannot send push notification.')
        return false
    }

    const payload = JSON.stringify({
        title,
        body,
        url,
        icon: '/LOGO-NOTIF.png'
    })

    try {
        await webpush.sendNotification(subscription, payload)
        return true
    } catch (error: any) {
        console.error(`Error sending web push notification to ${subscription?.endpoint}:`, error)
        
        // Status 410 (Gone) o 404 (Not Found) significa que la suscripción ya no es válida
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Push subscription expired or deleted by user. Removing from database: ${subscription?.endpoint}`)
            const supabase = createAdminClient()
            await supabase
                .from('push_subscriptions')
                .delete()
                .eq('subscription->>endpoint', subscription?.endpoint)
        }
        return false
    }
}

/**
 * Envía una notificación push a un usuario en particular en todos sus dispositivos registrados.
 */
export async function sendPushToUser(
    profileId: string,
    title: string,
    body: string,
    url: string
): Promise<void> {
    const supabase = createAdminClient()
    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('profile_id', profileId)

    if (error) {
        console.error(`Error fetching push subscriptions for user ${profileId}:`, error)
        return
    }

    if (!subs || subs.length === 0) return

    await Promise.all(
        subs.map(row => sendPushNotification(row.subscription, title, body, url))
    )
}

/**
 * Envía una notificación push a todos los usuarios con un rol y tenant_id específicos.
 */
export async function sendPushToRole(
    role: string,
    tenantId: string,
    title: string,
    body: string,
    url: string
): Promise<void> {
    const supabase = createAdminClient()
    
    // Buscar todos los usuarios activos con el rol y tenant_id dados
    const { data: users, error: userError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('rol', role)
        .eq('activo', true)

    if (userError) {
        console.error(`Error fetching users for role ${role} and tenant ${tenantId}:`, userError)
        return
    }

    if (!users || users.length === 0) return

    const userIds = users.map(u => u.id)

    // Obtener todas las suscripciones de esos usuarios
    const { data: subs, error: subError } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .in('profile_id', userIds)

    if (subError) {
        console.error('Error fetching push subscriptions for role:', subError)
        return
    }

    if (!subs || subs.length === 0) return

    await Promise.all(
        subs.map(row => sendPushNotification(row.subscription, title, body, url))
    )
}
