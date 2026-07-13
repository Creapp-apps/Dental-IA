'use client'

import { useState, useTransition } from 'react'
import { 
    CreditCard, 
    Calendar, 
    DollarSign, 
    CheckCircle, 
    AlertTriangle, 
    Copy, 
    Check, 
    ExternalLink, 
    Shield, 
    Plus, 
    Trash2, 
    HelpCircle,
    Info,
    ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { updateBillingSettings, registrarPago, eliminarPago, getBillingConfig } from '@/lib/actions/billing'

interface MisPagosViewProps {
    initialSettings: any
    initialPaymentsList: any[]
    tenants: any[]
    currentTenantId: string
    userEmail: string
    userRole: string
}

export function MisPagosView({
    initialSettings,
    initialPaymentsList,
    tenants,
    currentTenantId,
    userEmail,
    userRole
}: MisPagosViewProps) {
    // Acceso exclusivo: Rol 'superadmin' en base de datos, emails del desarrollador y soporte oficial
    const isSuperadmin = 
        userRole === 'superadmin' || 
        userEmail === 'creapp.ar@gmail.com' ||
        userEmail === 'mazasebastian@hotmail.com' || 
        userEmail.endsWith('@creapp.com') || 
        userEmail.endsWith('@dental-ia.com')

    const showSuperadmin = isSuperadmin

    // Tenant seleccionado para gestión (Superadmin)
    const [selectedTenantId, setSelectedTenantId] = useState(currentTenantId)
    const [loadingTenant, setLoadingTenant] = useState(false)

    // Datos activos que se muestran (pueden cambiar si el superadmin selecciona otro tenant)
    const [settings, setSettings] = useState(initialSettings)
    const [paymentsList, setPaymentsList] = useState(initialPaymentsList)

    // Copied states
    const [copiedAlias, setCopiedAlias] = useState(false)
    const [copiedCbu, setCopiedCbu] = useState(false)

    // Form states (Ajustes de Abono)
    const [montoAbono, setMontoAbono] = useState(settings.monto_abono)
    const [fechaVencimiento, setFechaVencimiento] = useState(settings.fecha_vencimiento || '')
    const [aliasTransferencia, setAliasTransferencia] = useState(settings.alias_transferencia || '')
    const [cbuTransferencia, setCbuTransferencia] = useState(settings.cbu_transferencia || '')
    const [bancoTransferencia, setBancoTransferencia] = useState(settings.banco_transferencia || '')
    const [mpLink, setMpLink] = useState(settings.mp_link || '')
    const [estado, setEstado] = useState(settings.estado || 'PENDIENTE_PAGO')

    // Form states (Registrar Pago)
    const [pagoMonto, setPagoMonto] = useState('')
    const [pagoPeriodo, setPagoPeriodo] = useState('')
    const [pagoMetodo, setPagoMetodo] = useState('TRANSFERENCIA')
    const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().split('T')[0])

    const [isPending, startTransition] = useTransition()

    // Manejar cambio de tenant (Superadmin)
    const handleTenantChange = async (tenantId: string) => {
        setSelectedTenantId(tenantId)
        setLoadingTenant(true)
        try {
            const data = await getBillingConfig(tenantId)
            setSettings(data.settings)
            setPaymentsList(data.paymentsList)
            
            // Sincronizar campos de edición
            setMontoAbono(data.settings.monto_abono)
            setFechaVencimiento(data.settings.fecha_vencimiento || '')
            setAliasTransferencia(data.settings.alias_transferencia || '')
            setCbuTransferencia(data.settings.cbu_transferencia || '')
            setBancoTransferencia(data.settings.banco_transferencia || '')
            setMpLink(data.settings.mp_link || '')
            setEstado(data.settings.estado || 'PENDIENTE_PAGO')
        } catch (err) {
            toast.error("Error al cargar configuración de facturación")
        } finally {
            setLoadingTenant(false)
        }
    }

    const handleCopy = (text: string, type: 'alias' | 'cbu') => {
        if (!text) return
        navigator.clipboard.writeText(text)
        if (type === 'alias') {
            setCopiedAlias(true)
            setTimeout(() => setCopiedAlias(false), 2000)
        } else {
            setCopiedCbu(true)
            setTimeout(() => setCopiedCbu(false), 2000)
        }
        toast.success(`${type === 'alias' ? 'Alias' : 'CBU'} copiado al portapapeles`)
    }

    // Guardar ajustes de facturación (Superadmin)
    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            const res = await updateBillingSettings(selectedTenantId, {
                monto_abono: montoAbono,
                fecha_vencimiento: fechaVencimiento,
                alias_transferencia: aliasTransferencia,
                cbu_transferencia: cbuTransferencia,
                banco_transferencia: bancoTransferencia,
                mp_link: mpLink,
                estado
            })

            if (res.error) {
                toast.error(`Error al guardar: ${res.error}`)
            } else {
                toast.success("Ajustes de facturación actualizados correctamente")
                // Refrescar estado local
                const data = await getBillingConfig(selectedTenantId)
                setSettings(data.settings)
            }
        })
    }

    // Registrar nuevo pago (Superadmin)
    const handleRegisterPayment = (e: React.FormEvent) => {
        e.preventDefault()
        if (!pagoMonto || !pagoPeriodo) {
            toast.error("Por favor completa los campos obligatorios del pago")
            return
        }

        startTransition(async () => {
            const res = await registrarPago(selectedTenantId, {
                monto: Number(pagoMonto),
                metodo: pagoMetodo,
                periodo: pagoPeriodo,
                fecha_pago: pagoFecha
            })

            if (res.error) {
                toast.error(`Error al registrar pago: ${res.error}`)
            } else {
                toast.success("Pago registrado con éxito")
                setPagoMonto('')
                setPagoPeriodo('')
                
                // Refrescar pagos
                const data = await getBillingConfig(selectedTenantId)
                setPaymentsList(data.paymentsList)
                setSettings(data.settings)
            }
        })
    }

    // Eliminar pago de historial (Superadmin)
    const handleDeletePayment = (paymentId: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este registro de pago?")) return

        startTransition(async () => {
            const res = await eliminarPago(selectedTenantId, paymentId)
            if (res.error) {
                toast.error(`Error al eliminar: ${res.error}`)
            } else {
                toast.success("Registro de pago eliminado")
                
                // Refrescar pagos
                const data = await getBillingConfig(selectedTenantId)
                setPaymentsList(data.paymentsList)
            }
        })
    }

    // Cálculos de vencimiento
    let daysDiff: number | null = null
    let isExpired = false
    let isWarning = false
    let formattedVencDate = 'No definida'

    if (settings.fecha_vencimiento) {
        const parts = settings.fecha_vencimiento.split('-')
        const vencDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const diffTime = vencDate.getTime() - today.getTime()
        daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        isExpired = daysDiff < 0
        isWarning = daysDiff >= 0 && daysDiff <= 5
        formattedVencDate = format(vencDate, "dd 'de' MMMM, yyyy", { locale: es })
    }

    // Obtener estado traducido y badge color
    const getStatusConfig = (estadoSub: string) => {
        switch (estadoSub) {
            case 'ACTIVO':
                return { label: 'Al día', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25', icon: CheckCircle }
            case 'PENDIENTE_PAGO':
                return { label: 'Pendiente de pago', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/25', icon: Info }
            case 'VENCIDO':
                return { label: 'Impago / Vencido', bg: 'bg-rose-500/10 text-rose-500 border-rose-500/25', icon: AlertTriangle }
            case 'SUSPENDIDO':
                return { label: 'Suspendido', bg: 'bg-destructive/10 text-destructive border-destructive/25', icon: AlertTriangle }
            default:
                return { label: 'Pendiente', bg: 'bg-muted text-muted-foreground border-border', icon: HelpCircle }
        }
    }

    const currentStatus = getStatusConfig(settings.estado)
    const StatusIcon = currentStatus.icon

    return (
        <div className="space-y-6 pb-12">

            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Mis Pagos</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Control de abono mensual del servicio de la plataforma CreAPP
                    </p>
                </div>
                {loadingTenant && (
                    <span className="text-xs text-muted-foreground flex items-center gap-2 animate-pulse bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full border border-border">
                        <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                        Cargando datos de facturación...
                    </span>
                )}
            </div>

            {/* Grid metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Status Card */}
                <GlassCard className="flex flex-col justify-between">
                    <GlassCardHeader className="pb-2">
                        <GlassCardDescription className="text-xs font-semibold tracking-wider uppercase">
                            Estado del Servicio
                        </GlassCardDescription>
                    </GlassCardHeader>
                    <GlassCardContent className="flex-1 flex flex-col justify-center py-4">
                        <div className="flex items-center gap-3">
                            <div className={cn("flex items-center justify-center h-12 w-12 rounded-2xl border", currentStatus.bg)}>
                                <StatusIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                    {currentStatus.label}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {settings.estado === 'ACTIVO' ? 'Servicio activo sin restricciones' : 'Comuníquese para regularizar'}
                                </p>
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                {/* Abono Card */}
                <GlassCard className="flex flex-col justify-between">
                    <GlassCardHeader className="pb-2">
                        <GlassCardDescription className="text-xs font-semibold tracking-wider uppercase">
                            Abono Mensual
                        </GlassCardDescription>
                    </GlassCardHeader>
                    <GlassCardContent className="flex-1 flex flex-col justify-center py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                    ${Number(settings.monto_abono || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Monto fijado por abono contratado
                                </p>
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                {/* Vencimiento Card */}
                <GlassCard className="flex flex-col justify-between">
                    <GlassCardHeader className="pb-2">
                        <GlassCardDescription className="text-xs font-semibold tracking-wider uppercase">
                            Próximo Vencimiento
                        </GlassCardDescription>
                    </GlassCardHeader>
                    <GlassCardContent className="flex-1 flex flex-col justify-center py-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "flex items-center justify-center h-12 w-12 rounded-2xl border",
                                isExpired 
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/25" 
                                    : isWarning 
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/25" 
                                        : "bg-indigo-500/10 text-indigo-500 border-indigo-500/25"
                            )}>
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-md font-bold tracking-tight text-foreground truncate">
                                    {formattedVencDate}
                                </h3>
                                <p className="text-xs mt-1">
                                    {daysDiff !== null ? (
                                        daysDiff === 0 ? (
                                            <span className="text-amber-500 font-semibold">Vence hoy</span>
                                        ) : daysDiff === 1 ? (
                                            <span className="text-amber-500 font-semibold">Vence mañana</span>
                                        ) : daysDiff < 0 ? (
                                            <span className="text-rose-500 font-semibold">Vencido hace {Math.abs(daysDiff)} días</span>
                                        ) : (
                                            <span className="text-muted-foreground">Faltan {daysDiff} días para el vencimiento</span>
                                        )
                                    ) : (
                                        <span className="text-muted-foreground">Sin fecha definida</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </div>

            {/* Warn notice */}
            {isExpired && (
                <div className="flex gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-sm">Tu abono de la plataforma ha vencido</h4>
                        <p className="text-xs mt-1 leading-relaxed opacity-90">
                            Por favor, realiza el pago a la brevedad para evitar suspensiones temporales en la agenda de turnos y envíos de notificaciones. Registraremos tu pago inmediatamente tras verificar el comprobante.
                        </p>
                    </div>
                </div>
            )}

            {/* Body contents */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Medios de Pago */}
                <GlassCard className="lg:col-span-5 h-fit">
                    <GlassCardHeader className="border-b border-border/40 pb-4">
                        <GlassCardTitle className="text-md flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Medios de Pago Disponibles
                        </GlassCardTitle>
                        <GlassCardDescription>
                            Elige la opción más conveniente para abonar tu cuota mensual
                        </GlassCardDescription>
                    </GlassCardHeader>
                    <GlassCardContent className="pt-5 space-y-6">
                        {/* Transferencia */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-foreground">1. Transferencia Bancaria</h4>
                            <div className="rounded-xl border border-border/40 bg-black/5 dark:bg-white/5 p-4 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Banco</span>
                                    <span className="font-semibold text-foreground">{settings.banco_transferencia || 'No definido'}</span>
                                </div>
                                
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Alias</span>
                                    <div className="flex items-center gap-1.5 font-mono">
                                        <span className="font-semibold text-foreground select-all">{settings.alias_transferencia || 'No definido'}</span>
                                        {settings.alias_transferencia && (
                                            <button 
                                                onClick={() => handleCopy(settings.alias_transferencia, 'alias')}
                                                className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer rounded"
                                            >
                                                {copiedAlias ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">CBU</span>
                                    <div className="flex items-center gap-1.5 font-mono">
                                        <span className="font-semibold text-foreground select-all">{settings.cbu_transferencia || 'No definido'}</span>
                                        {settings.cbu_transferencia && (
                                            <button 
                                                onClick={() => handleCopy(settings.cbu_transferencia, 'cbu')}
                                                className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer rounded"
                                            >
                                                {copiedCbu ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 text-[10px] text-muted-foreground leading-normal p-1">
                                <Info className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                                <span>Una vez enviada la transferencia, por favor envía el comprobante por WhatsApp al soporte de la plataforma.</span>
                            </div>
                        </div>

                        {/* Mercado Pago */}
                        {settings.mp_link && (
                            <div className="space-y-3 pt-3 border-t border-border/40">
                                <h4 className="text-sm font-bold text-foreground">2. Pago con Tarjeta / Dinero en cuenta</h4>
                                <a 
                                    href={settings.mp_link}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="no-underline block"
                                >
                                    <GlassButton 
                                        className="w-full flex items-center justify-center gap-2 bg-[#009EE3] hover:bg-[#0087c2] border-none text-white font-bold h-11"
                                    >
                                        Pagar con Mercado Pago
                                        <ExternalLink className="h-4 w-4" />
                                    </GlassButton>
                                </a>
                                <p className="text-[10px] text-muted-foreground text-center">
                                    Acreditación inmediata de la cuota
                                </p>
                            </div>
                        )}
                    </GlassCardContent>
                </GlassCard>

                {/* Historial de Pagos */}
                <GlassCard className="lg:col-span-7 h-fit">
                    <GlassCardHeader className="border-b border-border/40 pb-4">
                        <GlassCardTitle className="text-md flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-indigo-500" />
                            Historial de Pagos de la Plataforma
                        </GlassCardTitle>
                        <GlassCardDescription>
                            Registro de cuotas mensuales abonadas
                        </GlassCardDescription>
                    </GlassCardHeader>
                    <GlassCardContent className="pt-4">
                        {paymentsList.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-sm text-muted-foreground">Aún no se han registrado pagos en el historial.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/40 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                                            <th className="py-3 px-2">Período</th>
                                            <th className="py-3 px-2">Fecha Pago</th>
                                            <th className="py-3 px-2">Método</th>
                                            <th className="py-3 px-2 text-right">Monto</th>
                                            {showSuperadmin && <th className="py-3 px-2 text-center w-12">Acciones</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        {paymentsList.map((p) => (
                                            <tr key={p.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-2 font-bold text-foreground">{p.periodo}</td>
                                                <td className="py-3 px-2 text-muted-foreground">
                                                    {p.fecha_pago ? format(new Date(p.fecha_pago + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className={cn(
                                                        "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        p.metodo === 'MERCADOPAGO' 
                                                            ? "bg-[#009EE3]/15 text-[#009EE3] border border-[#009EE3]/25" 
                                                            : "bg-indigo-500/15 text-indigo-500 border border-indigo-500/25"
                                                    )}>
                                                        {p.metodo}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-right font-bold text-foreground">
                                                    ${Number(p.monto || 0).toLocaleString('es-AR')}
                                                </td>
                                                {showSuperadmin && (
                                                    <td className="py-3 px-2 text-center">
                                                        <button
                                                            onClick={() => handleDeletePayment(p.id)}
                                                            className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                            title="Eliminar registro"
                                                            disabled={isPending}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </GlassCardContent>
                </GlassCard>
            </div>

            {/* Panel de Superadmin */}
            {showSuperadmin && (
                <GlassCard className="border border-indigo-500/30 shadow-indigo-500/5 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent">
                    <GlassCardHeader className="border-b border-border/40 pb-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-indigo-500 animate-pulse" />
                            <GlassCardTitle className="text-md">Panel de Control Superadmin (CreAPP)</GlassCardTitle>
                        </div>
                        <GlassCardDescription>
                            Administración exclusiva de cuotas mensuales, vencimientos e historial de pagos del cliente.
                        </GlassCardDescription>
                    </GlassCardHeader>
                    <GlassCardContent className="pt-5 space-y-6">
                        {/* Selector de Tenant */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="tenant-select" className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Cliente a gestionar</Label>
                                <select
                                    id="tenant-select"
                                    value={selectedTenantId}
                                    onChange={(e) => handleTenantChange(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                    disabled={isPending}
                                >
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.nombre} ({t.slug})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-xs text-muted-foreground py-2 italic flex items-center gap-1.5">
                                <ArrowRight className="h-3.5 w-3.5 text-indigo-500" />
                                Gestionando tenant ID: <span className="font-mono text-[10px] select-all bg-black/10 dark:bg-white/10 px-1 rounded">{selectedTenantId}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-border/40">
                            {/* Editar Ajustes */}
                            <form onSubmit={handleSaveSettings} className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                                    <span>⚙️</span> Ajustes de Abono
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="monto_abono">Monto Abono ($)</Label>
                                        <Input
                                            id="monto_abono"
                                            type="number"
                                            value={montoAbono}
                                            onChange={(e) => setMontoAbono(e.target.value)}
                                            placeholder="25000"
                                            className="h-9"
                                            disabled={isPending}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="fecha_vencimiento">Fecha Vencimiento</Label>
                                        <Input
                                            id="fecha_vencimiento"
                                            type="date"
                                            value={fechaVencimiento}
                                            onChange={(e) => setFechaVencimiento(e.target.value)}
                                            className="h-9"
                                            disabled={isPending}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="banco_transferencia">Banco Transferencia</Label>
                                    <Input
                                        id="banco_transferencia"
                                        type="text"
                                        value={bancoTransferencia}
                                        onChange={(e) => setBancoTransferencia(e.target.value)}
                                        placeholder="Banco Galicia"
                                        className="h-9"
                                        disabled={isPending}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="alias_transferencia">Alias Transferencia</Label>
                                        <Input
                                            id="alias_transferencia"
                                            type="text"
                                            value={aliasTransferencia}
                                            onChange={(e) => setAliasTransferencia(e.target.value)}
                                            placeholder="alias.alvarez"
                                            className="h-9"
                                            disabled={isPending}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="cbu_transferencia">CBU Transferencia</Label>
                                        <Input
                                            id="cbu_transferencia"
                                            type="text"
                                            value={cbuTransferencia}
                                            onChange={(e) => setCbuTransferencia(e.target.value)}
                                            placeholder="017..."
                                            className="h-9"
                                            disabled={isPending}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="mp_link">Link Mercado Pago</Label>
                                        <Input
                                            id="mp_link"
                                            type="text"
                                            value={mpLink}
                                            onChange={(e) => setMpLink(e.target.value)}
                                            placeholder="https://mpago.la/..."
                                            className="h-9"
                                            disabled={isPending}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="estado-select">Estado Suscripción</Label>
                                        <select
                                            id="estado-select"
                                            value={estado}
                                            onChange={(e) => setEstado(e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                            disabled={isPending}
                                        >
                                            <option value="ACTIVO">Al día (ACTIVO)</option>
                                            <option value="PENDIENTE_PAGO">Pendiente de pago</option>
                                            <option value="VENCIDO">Impago / Vencido</option>
                                            <option value="SUSPENDIDO">SUSPENDIDO</option>
                                        </select>
                                    </div>
                                </div>

                                <GlassButton 
                                    type="submit" 
                                    variant="default" 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 w-full mt-2"
                                    loading={isPending}
                                >
                                    Guardar Ajustes
                                </GlassButton>
                            </form>

                            {/* Registrar Pago */}
                            <form onSubmit={handleRegisterPayment} className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                                    <Plus className="h-4 w-4" /> Registrar Cobro / Pago
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pago_monto">Monto Recibido ($) *</Label>
                                        <Input
                                            id="pago_monto"
                                            type="number"
                                            value={pagoMonto}
                                            onChange={(e) => setPagoMonto(e.target.value)}
                                            placeholder="25000"
                                            className="h-9"
                                            disabled={isPending}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pago_periodo">Período Abonado (Mes/Año) *</Label>
                                        <Input
                                            id="pago_periodo"
                                            type="text"
                                            value={pagoPeriodo}
                                            onChange={(e) => setPagoPeriodo(e.target.value)}
                                            placeholder="Julio 2026"
                                            className="h-9"
                                            disabled={isPending}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pago_metodo">Método de Cobro</Label>
                                        <select
                                            id="pago_metodo"
                                            value={pagoMetodo}
                                            onChange={(e) => setPagoMetodo(e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                            disabled={isPending}
                                        >
                                            <option value="TRANSFERENCIA">Transferencia</option>
                                            <option value="MERCADOPAGO">Mercado Pago</option>
                                            <option value="EFECTIVO">Efectivo</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pago_fecha">Fecha de Pago</Label>
                                        <Input
                                            id="pago_fecha"
                                            type="date"
                                            value={pagoFecha}
                                            onChange={(e) => setPagoFecha(e.target.value)}
                                            className="h-9"
                                            disabled={isPending}
                                        />
                                    </div>
                                </div>

                                <GlassButton 
                                    type="submit" 
                                    variant="success" 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 w-full mt-2"
                                    loading={isPending}
                                >
                                    Registrar Pago
                                </GlassButton>
                            </form>
                        </div>
                    </GlassCardContent>
                </GlassCard>
            )}
        </div>
    )
}
