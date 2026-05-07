'use client'

import { useState, useTransition, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import {
    GlassDialog,
    GlassDialogContent,
    GlassDialogHeader,
    GlassDialogTitle,
    GlassDialogFooter,
} from '@/components/ui/glass-dialog'
import { GlassButton } from '@/components/ui/glass-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GlassDatePicker } from '@/components/ui/glass-date-picker'
import { glassAlert } from '@/components/ui/glass-alert'
import { format } from 'date-fns'
import { crearPresupuesto } from '@/lib/actions/presupuestos'

/* ──────────── Custom Glass Select ──────────── */
function GlassSelect({
    value,
    onChange,
    options,
    placeholder
}: {
    value: string;
    onChange: (val: string) => void;
    options: { value: string, label: string }[];
    placeholder: string
}) {
    const [open, setOpen] = useState(false)
    const selected = options.find(o => o.value === value)

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between rounded-lg border border-input px-3 py-2 text-sm bg-background hover:bg-accent focus:ring-2 focus:ring-ring/50 transition-all outline-none"
            >
                <span className="truncate">{selected ? selected.label : placeholder}</span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -5, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute top-full left-0 w-full mt-1.5 z-[99999] bg-background/95 supports-[backdrop-filter]:bg-background/95 backdrop-blur-3xl shadow-glass-xl rounded-xl p-1.5 overflow-y-auto max-h-[250px] border border-border custom-scrollbar"
                        >
                            {options.map(o => (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => { onChange(o.value); setOpen(false) }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-start gap-2 ${value === o.value
                                        ? 'bg-primary text-primary-foreground font-medium'
                                        : 'hover:bg-accent hover:text-accent-foreground text-foreground'
                                        }`}
                                >
                                    <span className="flex-1 leading-snug">{o.label}</span>
                                    {value === o.value && <span className="text-primary-foreground text-xs mt-0.5 shrink-0">✓</span>}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

interface ModalCrearPresupuestoProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    pacienteId: string
    profesionales: any[]
    tiposTratamiento: any[]
}

interface ItemPresupuesto {
    id: string
    tipo_tratamiento_id: string
    pieza_dental: string
    cantidad: number
    precio_unitario: number
}

export function ModalCrearPresupuesto({
    open,
    onOpenChange,
    pacienteId,
    profesionales,
    tiposTratamiento
}: ModalCrearPresupuestoProps) {
    const [isPending, startTransition] = useTransition()
    
    // Form state
    const [profId, setProfId] = useState(profesionales[0]?.id ?? '')
    const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [vigencia, setVigencia] = useState(30)
    const [notas, setNotas] = useState('')
    const [estado, setEstado] = useState('PRESENTADO')
    const [items, setItems] = useState<ItemPresupuesto[]>([])

    // Derived states
    const montoTotal = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0)
    }, [items])

    function handleAddItem() {
        setItems(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                tipo_tratamiento_id: '',
                pieza_dental: '',
                cantidad: 1,
                precio_unitario: 0
            }
        ])
    }

    function handleRemoveItem(id: string) {
        setItems(prev => prev.filter(i => i.id !== id))
    }

    function handleChangeItem(id: string, field: keyof ItemPresupuesto, value: any) {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item
            
            const updatedItem = { ...item, [field]: value }
            
            // Auto-fill price when treatment changes
            if (field === 'tipo_tratamiento_id') {
                const trat = tiposTratamiento.find(t => t.id === value)
                if (trat && trat.precio_referencia) {
                    updatedItem.precio_unitario = Number(trat.precio_referencia)
                }
            }
            
            return updatedItem
        }))
    }

    function handleSave() {
        if (!profId) {
            glassAlert.warning({ title: 'Seleccioná un profesional' })
            return
        }
        if (items.length === 0) {
            glassAlert.warning({ title: 'Agregá al menos un tratamiento' })
            return
        }
        
        // Validate items
        for (const item of items) {
            if (!item.tipo_tratamiento_id) {
                glassAlert.warning({ title: 'Todos los ítems deben tener un tratamiento seleccionado' })
                return
            }
            if (item.cantidad <= 0 || item.precio_unitario < 0) {
                glassAlert.warning({ title: 'Cantidad y precio unitario deben ser válidos' })
                return
            }
        }

        startTransition(async () => {
            const dataToSave = {
                paciente_id: pacienteId,
                profesional_id: profId,
                estado: estado,
                notas: notas || undefined,
                fecha_presentacion: fecha,
                vigencia_dias: vigencia,
                items: items.map(item => ({
                    tipo_tratamiento_id: item.tipo_tratamiento_id,
                    pieza_dental: item.pieza_dental || undefined,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    subtotal: item.cantidad * item.precio_unitario
                }))
            }

            const result = await crearPresupuesto(dataToSave)

            if (result.error) {
                glassAlert.error({ title: 'Error al crear presupuesto', description: result.error })
            } else {
                glassAlert.success({ title: 'Presupuesto creado con éxito' })
                // Reset form
                setItems([])
                setNotas('')
                onOpenChange(false)
            }
        })
    }

    return (
        <GlassDialog open={open} onOpenChange={onOpenChange}>
            <GlassDialogContent className="max-w-2xl">
                <GlassDialogHeader>
                    <GlassDialogTitle>Crear Presupuesto</GlassDialogTitle>
                </GlassDialogHeader>

                <div className="space-y-4 py-2 custom-scrollbar max-h-[70vh] overflow-y-auto px-1">
                    {/* General info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Profesional a cargo *</Label>
                            <GlassSelect
                                value={profId}
                                onChange={setProfId}
                                placeholder="Seleccionar..."
                                options={profesionales.map(p => ({ value: p.id, label: `Dr. ${p.nombre} ${p.apellido}` }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Estado</Label>
                            <GlassSelect
                                value={estado}
                                onChange={setEstado}
                                placeholder="Seleccionar..."
                                options={[
                                    { value: 'BORRADOR', label: 'Borrador' },
                                    { value: 'PRESENTADO', label: 'Presentado' },
                                    { value: 'APROBADO', label: 'Aprobado' }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Fecha Presentación</Label>
                            <GlassDatePicker fecha={fecha} onChange={setFecha} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Vigencia (Días)</Label>
                            <Input 
                                type="number" 
                                min={1} 
                                value={vigencia} 
                                onChange={(e) => setVigencia(Number(e.target.value))} 
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-3 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Tratamientos a presupuestar</Label>
                            <GlassButton type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                                <Plus className="h-4 w-4 mr-1.5" />
                                Agregar Ítem
                            </GlassButton>
                        </div>

                        {items.length === 0 ? (
                            <div className="p-6 text-center border-2 border-dashed border-border/50 rounded-xl glass-subtle text-muted-foreground text-sm">
                                No agregaste ningún tratamiento.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={item.id} className="p-3.5 glass-subtle rounded-xl border border-border/50 flex flex-col gap-3 relative">
                                        <div className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-glass">
                                            {index + 1}
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Tratamiento *</Label>
                                                <GlassSelect
                                                    value={item.tipo_tratamiento_id}
                                                    onChange={(val) => handleChangeItem(item.id, 'tipo_tratamiento_id', val)}
                                                    placeholder="Seleccionar..."
                                                    options={tiposTratamiento.map(t => ({ value: t.id, label: t.nombre }))}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Pieza Dental (Opcional)</Label>
                                                <Input 
                                                    placeholder="Ej: 11, 48" 
                                                    value={item.pieza_dental}
                                                    onChange={(e) => handleChangeItem(item.id, 'pieza_dental', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Cantidad</Label>
                                                <Input 
                                                    type="number" 
                                                    min={1} 
                                                    value={item.cantidad}
                                                    onChange={(e) => handleChangeItem(item.id, 'cantidad', Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Precio Unitario ($)</Label>
                                                <Input 
                                                    type="number" 
                                                    min={0} 
                                                    value={item.precio_unitario}
                                                    onChange={(e) => handleChangeItem(item.id, 'precio_unitario', Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Subtotal</Label>
                                                <div className="h-10 flex items-center px-3 border border-transparent bg-muted/30 rounded-lg text-sm font-semibold tabular-nums text-foreground">
                                                    ${(item.cantidad * item.precio_unitario).toLocaleString('es-AR')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5 pt-2">
                        <Label>Notas</Label>
                        <Textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={2}
                            placeholder="Aclaraciones sobre materiales, formas de pago, etc."
                            className="resize-none"
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 glass-subtle rounded-xl border border-primary/20">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Monto Total Estimado</p>
                        <p className="text-2xl font-bold text-primary tabular-nums">
                            ${montoTotal.toLocaleString('es-AR')}
                        </p>
                    </div>
                    <div className="flex w-full sm:w-auto gap-3">
                        <GlassButton variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                            Cancelar
                        </GlassButton>
                        <GlassButton onClick={handleSave} loading={isPending} className="flex-1 sm:flex-none">
                            Guardar Presupuesto
                        </GlassButton>
                    </div>
                </div>
            </GlassDialogContent>
        </GlassDialog>
    )
}
