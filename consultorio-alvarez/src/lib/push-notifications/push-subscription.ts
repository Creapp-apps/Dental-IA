// ============================================================
// CLIENT PUSH NOTIFICATIONS MANAGER
// ============================================================

// Helper to convert VAPID Key to Uint8Array for browser push manager subscription
function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Registra el Service Worker de notificaciones y devuelve el registro activo.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.warn('Service Workers are not supported in this browser.');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Obtiene la suscripción push actual si existe en el navegador.
 */
export async function getActiveSubscription(): Promise<PushSubscription | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) return null;

    try {
        const subscription = await registration.pushManager.getSubscription();
        return subscription;
    } catch (error) {
        console.error('Error getting active push subscription:', error);
        return null;
    }
}

/**
 * Solicita permisos de notificación y suscribe el navegador a notificaciones push.
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        throw new Error('Notificaciones push no soportadas en este navegador.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado por el usuario.');
    }

    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
        throw new Error('El Administrador de Push no está disponible en este navegador.');
    }

    const publicKeyB64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKeyB64) {
        throw new Error('La clave pública VAPID no está configurada.');
    }

    const applicationServerKey = urlB64ToUint8Array(publicKeyB64);

    try {
        // Suscribir al usuario (si ya existe, devuelve la existente)
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });
        return subscription;
    } catch (error) {
        console.error('Error subscribing to push notifications:', error);
        throw error;
    }
}

/**
 * Elimina la suscripción push del navegador.
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

    try {
        const subscription = await getActiveSubscription();
        if (subscription) {
            const unsubscribed = await subscription.unsubscribe();
            return unsubscribed;
        }
        return false;
    } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        return false;
    }
}
