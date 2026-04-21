'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MessageCircle, CreditCard, Receipt, AlertCircle, Save,
    CheckCircle2, ExternalLink
} from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { glassAlert } from '@/components/ui/glass-alert'
import { guardarIntegracion } from '@/lib/actions/integrations'

interface TabIntegracionesProps {
    integrations: any[]
}

type Provider = 'whatsapp' | 'mercadopago' | 'arca'

export function TabIntegraciones({ integrations }: TabIntegracionesProps) {
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

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
