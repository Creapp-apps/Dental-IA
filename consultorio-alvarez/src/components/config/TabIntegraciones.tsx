'use client'

import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MessageCircle, CreditCard, Receipt, AlertCircle, Save,
    CheckCircle2, ExternalLink, BellRing, Send, RefreshCw, Loader2
} from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { glassAlert } from '@/components/ui/glass-alert'
import { guardarIntegracion } from '@/lib/actions/integrations'
import { registrarSuscripcionPush, removerSuscripcionPush, verificarSuscripcionBD, enviarPruebaPush } from '@/lib/actions/push'
import { getActiveSubscription, registerServiceWorker, subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/push-notifications/push-subscription'

interface TabIntegracionesProps {
    integrations: any[]
}

type Provider = 'whatsapp' | 'mercadopago' | 'arca' | 'push_notifications'

export function TabIntegraciones({ integrations }: TabIntegracionesProps) {
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
    const [pushActive, setPushActive] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            import('@/lib/push-notifications/push-subscription').then(({ getActiveSubscription }) => {
                getActiveSubscription().then(sub => {
                    setPushActive(!!sub)
                })
            })
        }
    }, [selectedProvider])

    const whatsapp = integrations.find(i => i.provider === 'whatsapp')
    const mp = integrations.find(i => i.provider === 'mercadopago')
    const arca = integrations.find(i => i.provider === 'arca')

    return (
        <div className="space-y-6">
            {!selectedProvider ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <IntegrationCard
                        title="WhatsApp Business (n8n)"
                        description="Enviá recordatorios de turnos automáticos a tus pacientes."
                        icon={MessageCircle}
                        isActive={whatsapp?.is_active}
                        onClick={() => setSelectedProvider('whatsapp')}
                    />
                    <IntegrationCard
                        title="Mercado Pago"
                        description="Cobrá señas y pagos con tarjeta o dinero en cuenta."
                        icon={CreditCard}
                        isActive={mp?.is_active}
                        onClick={() => setSelectedProvider('mercadopago')}
                    />
                    <IntegrationCard
                        title="Facturación ARCA"
                        description="Emití comprobantes electrónicos C o B automáticamente."
                        icon={Receipt}
                        isActive={arca?.is_active}
                        onClick={() => setSelectedProvider('arca')}
                    />
                    <IntegrationCard
                        title="Notificaciones Push"
                        description="Activá o desactivá las alertas push en este navegador."
                        icon={BellRing}
                        isActive={pushActive}
                        onClick={() => setSelectedProvider('push_notifications')}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <button
                        onClick={() => setSelectedProvider(null)}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        &larr; Volver a integraciones
                    </button>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedProvider}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            {selectedProvider === 'whatsapp' && <WizardWhatsApp currentConfig={whatsapp} />}
                            {selectedProvider === 'mercadopago' && <WizardMercadoPago currentConfig={mp} />}
                            {selectedProvider === 'arca' && <WizardArca currentConfig={arca} />}
                            {selectedProvider === 'push_notifications' && <WizardPushNotifications />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}

function IntegrationCard({ title, description, icon: Icon, isActive, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className="glass rounded-2xl p-5 hover:scale-[1.02] transition-transform cursor-pointer border border-transparent hover:border-primary/20 shadow-glass"
        >
            <div className="flex items-start justify-between">
                <div className="flex bg-primary/10 p-3 rounded-xl">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5",
                    isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                )}>
                    {isActive ? (
                        <><CheckCircle2 className="h-3.5 w-3.5" /> Activo</>
                    ) : (
                        <><AlertCircle className="h-3.5 w-3.5" /> Faltan datos</>
                    )}
                </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mt-4 mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Wizards Individuales
// ─────────────────────────────────────────────────────────

function WizardWhatsApp({ currentConfig }: { currentConfig: any }) {
    const [isPending, startTransition] = useTransition()
    const [webhookUrl, setWebhookUrl] = useState(currentConfig?.credentials?.webhook_url || '')
    const [whatsappNumber, setWhatsappNumber] = useState(currentConfig?.credentials?.whatsapp_number || '')
    const [domainUrl, setDomainUrl] = useState(currentConfig?.credentials?.domain_url || '')

    function guardar() {
        startTransition(async () => {
            const data = await guardarIntegracion('whatsapp', {
                webhook_url: webhookUrl,
                whatsapp_number: whatsappNumber,
                domain_url: domainUrl
            })
            if (data.error) glassAlert.error({ title: 'Error', description: data.error })
            else glassAlert.success({ title: '¡WhatsApp conectado!', description: 'Credenciales guardadas con éxito.' })
        })
    }

    return (
        <div className="glass rounded-2xl p-6 shadow-glass space-y-6 max-w-2xl">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="p-2.5 bg-emerald-100 rounded-xl">
                    <MessageCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground">Conectar Automatización WhatsApp</h2>
                    <p className="text-sm text-muted-foreground">Envío automático (n8n o API de Meta) para confirmación de turnos.</p>
                </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className="bg-primary text-white h-5 w-5 rounded-full flex items-center justify-center text-xs">1</span>
                    Configuración de Meta / n8n
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2 ml-7 list-decimal">
                    <li>El robot enviará un mensaje al paciente al crearse un turno, y recordatorios 48hs antes.</li>
                    <li>Ingresá el dominio configurado y el número de línea telefónica autorizada por Meta.</li>
                    <li>Agregá la URL del Webhook (n8n o Meta) para enviar el payload de turnos.</li>
                </ul>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Dominio Registrado</Label>
                        <Input
                            value={domainUrl}
                            onChange={e => setDomainUrl(e.target.value)}
                            placeholder="https://consultorio.com"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Línea Oficial WhatsApp</Label>
                        <Input
                            value={whatsappNumber}
                            onChange={e => setWhatsappNumber(e.target.value)}
                            placeholder="+54 9 11 1234 5678"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label>URL del Webhook / API</Label>
                    <Input
                        value={webhookUrl}
                        onChange={e => setWebhookUrl(e.target.value)}
                        placeholder="https://n8n.tu-dominio.com/webhook/..."
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/50">
                <GlassButton onClick={guardar} loading={isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Guardar Configuración
                </GlassButton>
            </div>
        </div>
    )
}

function WizardMercadoPago({ currentConfig }: { currentConfig: any }) {
    const [isPending, startTransition] = useTransition()
    const [publicKey, setPublicKey] = useState(currentConfig?.credentials?.public_key || '')
    const [accessToken, setAccessToken] = useState(currentConfig?.credentials?.access_token || '')

    function guardar() {
        startTransition(async () => {
            const data = await guardarIntegracion('mercadopago', { public_key: publicKey, access_token: accessToken })
            if (data.error) glassAlert.error({ title: 'Error', description: data.error })
            else glassAlert.success({ title: '¡Mercado Pago conectado!', description: 'Credenciales guardadas con éxito.' })
        })
    }

    return (
        <div className="glass rounded-2xl p-6 shadow-glass space-y-6 max-w-2xl">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="p-2.5 bg-blue-100 rounded-xl">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground">Conectar Mercado Pago</h2>
                    <p className="text-sm text-muted-foreground">Recibí pagos online directamente a tu cuenta</p>
                </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className="bg-primary text-white h-5 w-5 rounded-full flex items-center justify-center text-xs">1</span>
                    Instrucciones paso a paso
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2 ml-7 list-decimal">
                    <li>Ingresá a <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Mercado Pago Developers <ExternalLink className="h-3 w-3" /></a> con tu cuenta de venta.</li>
                    <li>Creá una nueva aplicación. Omití los datos que no tengas.</li>
                    <li>Navegá a <strong>Credenciales de Producción</strong> en el menú lateral.</li>
                    <li>Copiá tu <code>Public Key</code> y <code>Access Token</code> de producción y pegalos abajo.</li>
                </ul>
            </div>

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label>Public Key (Producción)</Label>
                    <Input
                        value={publicKey}
                        onChange={e => setPublicKey(e.target.value)}
                        placeholder="APP_USR-..."
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Access Token (Producción)</Label>
                    <Input
                        value={accessToken}
                        onChange={e => setAccessToken(e.target.value)}
                        placeholder="APP_USR-..."
                        type="password"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/50">
                <GlassButton onClick={guardar} loading={isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Verificar y Guardar
                </GlassButton>
            </div>
        </div>
    )
}

function WizardArca({ currentConfig }: { currentConfig: any }) {
    return (
        <div className="glass rounded-2xl p-6 shadow-glass space-y-6 max-w-2xl text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <div>
                <h2 className="text-lg font-bold text-foreground">Facturación Electrónica (ARCA)</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    El sistema de facturación electrónica se encuentra en fase beta privada. Próximamente vas a poder habilitarlo subiendo tu certificado .CRT digital.
                </p>
            </div>
            <GlassButton disabled>
                Próximamente
            </GlassButton>
        </div>
    )
}

function WizardPushNotifications() {
    const [isPending, startTransition] = useTransition()
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default')
    const [checking, setChecking] = useState(true)
    const [dbSyncState, setDbSyncState] = useState<'unchecked' | 'checking' | 'synced' | 'missing' | 'error'>('unchecked')
    const [dbError, setDbError] = useState<string | null>(null)
    const [isTestingPush, setIsTestingPush] = useState(false)

    async function verificarVinculacion() {
        setDbSyncState('checking')
        setDbError(null)
        try {
            const sub = await getActiveSubscription()
            if (!sub) {
                setDbSyncState('missing')
                glassAlert.warning({ 
                    title: 'Token no activo', 
                    description: 'No hay ninguna suscripción activa en este navegador. Activa las notificaciones primero.' 
                })
                return
            }

            const res = await verificarSuscripcionBD(sub.endpoint)
            if (res.success) {
                if (res.exists) {
                    setDbSyncState('synced')
                    glassAlert.success({ 
                        title: 'Conexión verificada', 
                        description: 'La suscripción está activa en este navegador y registrada correctamente en el servidor.' 
                    })
                } else {
                    setDbSyncState('missing')
                    glassAlert.warning({ 
                        title: 'Token no registrado', 
                        description: 'El token de este navegador no figura en el servidor. Desactiva y vuelve a activar para re-vincular.' 
                    })
                }
            } else {
                setDbSyncState('error')
                setDbError(res.error || 'No se pudo verificar el token en la base de datos.')
                glassAlert.error({ 
                    title: 'Error de verificación', 
                    description: res.error || 'No se pudo verificar el token en el servidor.' 
                })
            }
        } catch (err: any) {
            console.error('Error al verificar vinculación:', err)
            setDbSyncState('error')
            setDbError(err.message || 'Error al conectar con la base de datos.')
            glassAlert.error({ 
                title: 'Error', 
                description: err.message || 'Error al conectar con la base de datos.' 
            })
        }
    }

    async function enviarNotificacionPrueba() {
        setIsTestingPush(true)
        try {
            const sub = await getActiveSubscription()
            if (!sub) {
                glassAlert.error({ title: 'Error', description: 'No hay ninguna suscripción activa en este navegador.' })
                return
            }

            const res = await enviarPruebaPush(sub.endpoint)
            if (res.success) {
                glassAlert.success({ title: 'Notificación enviada', description: 'Se disparó la notificación de prueba a este dispositivo.' })
            } else {
                glassAlert.error({ title: 'Error al enviar', description: res.error || 'No se pudo enviar la prueba.' })
            }
        } catch (err: any) {
            glassAlert.error({ title: 'Error', description: err.message || 'Error al enviar la prueba.' })
        } finally {
            setIsTestingPush(false)
        }
    }

    useEffect(() => {
        async function checkStatus() {
            if (typeof window === 'undefined') return
            if (!('Notification' in window) || !('serviceWorker' in navigator)) {
                setPermissionState('unsupported')
                setChecking(false)
                return
            }
            setPermissionState(Notification.permission)
            try {
                // Asegurar registro del SW primero
                await registerServiceWorker()
                const sub = await getActiveSubscription()
                const subscribed = !!sub
                setIsSubscribed(subscribed)
                
                if (subscribed && sub) {
                    setDbSyncState('checking')
                    const res = await verificarSuscripcionBD(sub.endpoint)
                    if (res.success && res.exists) {
                        setDbSyncState('synced')
                    } else {
                        setDbSyncState('missing')
                        setDbError(res.error || null)
                    }
                }
            } catch (err) {
                console.error('Error al inicializar notificaciones push en UI:', err)
            } finally {
                setChecking(false)
            }
        }
        checkStatus()
    }, [])

    function togglePush() {
        startTransition(async () => {
            if (isSubscribed) {
                // Desactivar
                const sub = await getActiveSubscription()
                if (sub) {
                    const res = await removerSuscripcionPush(sub.endpoint)
                    if (res.error) {
                        glassAlert.error({ title: 'Error', description: res.error })
                        return
                    }
                }
                const success = await unsubscribeFromPushNotifications()
                if (success) {
                    setIsSubscribed(false)
                    setDbSyncState('unchecked')
                    glassAlert.success({ title: 'Notificaciones desactivadas', description: 'Se desactivaron las alertas en este dispositivo.' })
                } else {
                    glassAlert.error({ title: 'Error', description: 'No se pudo dar de baja la suscripción push.' })
                }
            } else {
                // Activar
                try {
                    const sub = await subscribeToPushNotifications()
                    if (sub) {
                        const res = await registrarSuscripcionPush(sub.toJSON())
                        if (res.error) {
                            glassAlert.error({ title: 'Error al registrar', description: res.error })
                            return
                        }
                        setIsSubscribed(true)
                        setPermissionState(Notification.permission)
                        setDbSyncState('synced')
                        glassAlert.success({ title: '¡Notificaciones activadas!', description: 'Este dispositivo recibirá alertas del consultorio.' })
                    }
                } catch (err: any) {
                    setPermissionState(Notification.permission)
                    glassAlert.error({ title: 'Error de activación', description: err.message || 'No se pudieron activar las notificaciones.' })
                }
            }
        })
    }

    if (checking) {
        return (
            <div className="glass rounded-2xl p-6 shadow-glass flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    const unsupported = permissionState === 'unsupported'
    const denied = permissionState === 'denied'

    return (
        <div className="glass rounded-2xl p-6 shadow-glass space-y-6 max-w-2xl">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/50 rounded-xl">
                    <BellRing className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground">Notificaciones Push del Personal</h2>
                    <p className="text-sm text-muted-foreground">Recibí alertas en tiempo real de nuevos turnos en este navegador.</p>
                </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className="bg-primary text-white h-5 w-5 rounded-full flex items-center justify-center text-xs">i</span>
                    ¿Cómo funcionan las alertas push?
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2 ml-7 list-disc">
                    <li>Te permiten recibir alertas instantáneas incluso si tenés el navegador cerrado o en segundo plano.</li>
                    <li>La configuración es individual y afecta únicamente al navegador y dispositivo que estás usando actualmente.</li>
                    <li>Podés activarlo en tu computadora de recepción y en tu celular personal para estar siempre al tanto.</li>
                </ul>
            </div>

            {unsupported && (
                <div className="bg-destructive/10 text-destructive dark:bg-destructive/20 p-4 rounded-xl text-sm flex gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold">Navegador no compatible</p>
                        <p className="mt-1 text-xs opacity-90">Este navegador no soporta la API de Web Push nativa. Si estás en iOS, asegurate de agregar esta web a tu pantalla de inicio (PWA) usando Safari.</p>
                    </div>
                </div>
            )}

            {denied && (
                <div className="bg-destructive/10 text-destructive dark:bg-destructive/20 p-4 rounded-xl text-sm flex gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold">Permisos bloqueados</p>
                        <p className="mt-1 text-xs opacity-90">Bloqueaste los permisos de notificación para este sitio. Habilitá las notificaciones en la barra de direcciones (ícono de candado/configuración del navegador) y recargá la página.</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between p-4 glass-subtle rounded-xl">
                <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Notificaciones en este navegador</p>
                    <p className="text-xs text-muted-foreground">
                        {isSubscribed ? 'Las notificaciones push están activas.' : 'Las notificaciones push están desactivadas.'}
                    </p>
                </div>
                <button
                    onClick={togglePush}
                    disabled={unsupported || denied || isPending}
                    className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
                        isSubscribed ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                >
                    <span
                        className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            isSubscribed ? "translate-x-5" : "translate-x-0"
                        )}
                    />
                </button>
            </div>

            {isSubscribed && (
                <div className="border-t border-border/40 pt-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl border border-white/5">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado de Vinculación</span>
                            <div className="flex items-center gap-2">
                                {dbSyncState === 'checking' && (
                                    <>
                                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                                        <span className="text-sm font-medium text-foreground">Verificando en el servidor...</span>
                                    </>
                                )}
                                {dbSyncState === 'synced' && (
                                    <>
                                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-sm font-medium text-emerald-500 flex items-center gap-1.5">
                                            ✓ Token Vinculado y Activo
                                        </span>
                                    </>
                                )}
                                {dbSyncState === 'missing' && (
                                    <>
                                        <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                                        <span className="text-sm font-medium text-destructive">
                                            ⚠️ Desvinculado en el servidor
                                        </span>
                                    </>
                                )}
                                {dbSyncState === 'error' && (
                                    <>
                                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                                        <span className="text-sm font-medium text-amber-500">
                                            Error de sincronización
                                        </span>
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground max-w-[360px]">
                                {dbSyncState === 'synced' && 'El token se encuentra registrado correctamente en la base de datos de alertas.'}
                                {dbSyncState === 'missing' && 'El token no figura en el servidor (pudo haber expirado o sido eliminado). Por favor desactiva y vuelve a activar para re-vincular.'}
                                {dbSyncState === 'error' && (dbError || 'No se pudo verificar el estado en el servidor.')}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <GlassButton
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={verificarVinculacion}
                                disabled={dbSyncState === 'checking'}
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", dbSyncState === 'checking' && "animate-spin")} />
                                Verificar
                            </GlassButton>

                            <GlassButton
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={enviarNotificacionPrueba}
                                disabled={dbSyncState !== 'synced' || isTestingPush}
                            >
                                {isTestingPush ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-3.5 w-3.5 mr-1.5" />
                                        Probar
                                    </>
                                )}
                            </GlassButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
