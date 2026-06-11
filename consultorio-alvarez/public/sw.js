// ============================================================
// SERVICE WORKER — Notificaciones Push Nativa
// ============================================================

self.addEventListener('push', function (event) {
    if (!event.data) {
        console.warn('Push event received with no data.');
        return;
    }

    try {
        const payload = event.data.json();
        const title = payload.title || 'Consultorio Álvarez';
        const options = {
            body: payload.body || '',
            icon: payload.icon || '/LOGO-ALVAREZ.png',
            badge: payload.badge || '/favicon.ico',
            data: {
                url: payload.url || '/agenda'
            },
            vibrate: [100, 50, 100],
            actions: payload.actions || []
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (err) {
        console.error('Error parsing push data:', err);
        // Fallback to plain text if JSON parsing fails
        const text = event.data.text();
        event.waitUntil(
            self.registration.showNotification('Consultorio Álvarez', {
                body: text,
                icon: '/LOGO-ALVAREZ.png',
                data: { url: '/agenda' }
            })
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/agenda';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Check if there is already a window open with the same domain
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.postMessage({ type: 'NAVIGATE', url: targetUrl });
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
