'use client'

import { useState } from 'react'
import {
    format, startOfWeek, endOfWeek, addWeeks, subWeeks,
    addDays, isSameDay, parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
    type Profesional, type TipoTratamiento, type Turno, type EstadoTurno, type PrioridadTratamiento,
    ESTADO_TURNO_LABEL, ESTADO_TURNO_COLOR, PRIORIDAD_LABEL,
} from '@/types'
import { MOCK_TURNOS, MOCK_PACIENTES } from '@/lib/mock-data'

interface FormState {
    paciente_nombre: string
    profesional_id: string
    tipo_tratamiento_id: string
    fecha: string
    hora: string
    notas: string
    prioridad_override: string
}

export function AgendaViewMock({
    profesionales,
    tiposTratamiento,
}: {
    profesionales: Profesional[]
    tiposTratamiento: TipoTratamiento[]
}) {
    const [semanaBase, setSemanaBase] = useState(new Date())
    const [turnos, setTurnos] = useState<Turno[]>(MOCK_TURNOS)
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date())
    const [modalOpen, setModalOpen] = useState(false)
    const [form, setForm] = useState<FormState>({
        paciente_nombre: '',
        profesional_id: profesionales[0]?.id ?? '',
        tipo_tratamiento_id: '',
        fecha: format(new Date(), 'yyyy-MM-dd'),
        hora: '09:00',
        notas: '',
        prioridad_override: '',
    })
    const [saving, setSaving] = useState(false)
    const [pacientesFiltrados, setPacientesFiltrados] = useState<typeof MOCK_PACIENTES>([])

    const inicio = startOfWeek(semanaBase, { weekStartsOn: 1 })
    const fin = endOfWeek(semanaBase, { weekStartsOn: 1 })
    const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(inicio, i))

    function getTurnosDia(dia: Date, profId: string) {
        return turnos
            .filter((t) => t.profesional_id === profId && isSameDay(parseISO(t.fecha_inicio), dia))
            .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
    }

    function cambiarEstado(turnoId: string, nuevoEstado: EstadoTurno) {
        setTurnos((prev) => prev.map((t) => (t.id === turnoId ? { ...t, estado: nuevoEstado } : t)))
        toast.success(`Estado → ${ESTADO_TURNO_LABEL[nuevoEstado]}`)
    }

    function buscarPaciente(q: string) {
        setForm((f) => ({ ...f, paciente_nombre: q }))
        if (q.length < 2) { setPacientesFiltrados([]); return }
        setPacientesFiltrados(
            MOCK_PACIENTES.filter(
                (p) =>
                    p.nombre.toLowerCase().includes(q.toLowerCase()) ||
                    p.apellido.toLowerCase().includes(q.toLowerCase())
            ).slice(0, 6)
        )
    }

    async function guardarTurno() {
        if (!form.tipo_tratamiento_id || !form.profesional_id || !form.fecha || !form.hora) {
            toast.error('Completá los campos obligatorios')
            return
        }
        const trat = tiposTratamiento.find((t) => t.id === form.tipo_tratamiento_id)!
        const prof = profesionales.find((p) => p.id === form.profesional_id)!
        const fechaInicio = new Date(`${form.fecha}T${form.hora}:00`)
        const fechaFin = new Date(fechaInicio.getTime() + trat.duracion_minutos * 60000)

        const partes = form.paciente_nombre.trim().split(' ')
        const nombre = partes[0] ?? 'Paciente'
        const apellido = partes.slice(1).join(' ') || '—'

        const pacienteExistente = MOCK_PACIENTES.find(
            (p) => `${p.nombre} ${p.apellido}`.toLowerCase() === form.paciente_nombre.toLowerCase()
        )

        setSaving(true)
        await new Promise((r) => setTimeout(r, 500))

        const pacienteMock = pacienteExistente ?? {
            id: 'pac-nuevo', nombre, apellido,
            nro_historia_clinica: 'HC-NUEVO',
            genero: null,
            dni: null, fecha_nacimiento: null, telefono: null, email: null,
            direccion: null, ciudad: null,
            obra_social_id: null, n_afiliado: null, alergias: null,
            medicacion_actual: null, antecedentes: null, notas_internas: null,
            motivo_consulta: null,
            created_at: new Date().toISOString(),
        }

        const nuevoTurno: Turno = {
            id: `turno-nuevo-${Date.now()}`,
            paciente_id: pacienteMock.id,
            profesional_id: prof.id,
            tipo_tratamiento_id: trat.id,
            fecha_inicio: fechaInicio.toISOString(),
            fecha_fin: fechaFin.toISOString(),
            estado: 'PENDIENTE',
            prioridad_override: form.prioridad_override ? (form.prioridad_override as PrioridadTratamiento) : null,
            notas: form.notas || null,
            origen: 'SECRETARIA',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            paciente: pacienteMock,
            profesional: prof,
            tipo_tratamiento: trat,
        }

        setTurnos((prev) => [...prev, nuevoTurno])
        toast.success('Turno creado correctamente')
        setModalOpen(false)
        setSaving(false)
        setDiaSeleccionado(fechaInicio)
        setSemanaBase(fechaInicio)
    }

    function abrirModalConProf(profId: string) {
        setForm((f) => ({
            ...f,
            profesional_id: profId,
            fecha: format(diaSeleccionado, 'yyyy-MM-dd'),
        }))
        setModalOpen(true)
    }

    return (
        <div className="space-y-4">
            {/* Controles semana */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setSemanaBase((p) => subWeeks(p, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSemanaBase(new Date()); setDiaSeleccionado(new Date()) }}>
                        Hoy
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setSemanaBase((p) => addWeeks(p, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-foreground ml-1">
                        {format(inicio, "d MMM", { locale: es })} — {format(fin, "d MMM yyyy", { locale: es })}
                    </span>
                </div>
                <Button onClick={() => { setForm((f) => ({ ...f, fecha: format(diaSeleccionado, 'yyyy-MM-dd') })); setModalOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo turno
                </Button>
            </div>

            {/* Selector de día */}
            <div className="grid grid-cols-7 gap-1.5">
                {diasSemana.map((dia) => {
                    const totalDia = turnos.filter((t) => isSameDay(parseISO(t.fecha_inicio), dia)).length
                    const isHoy = isSameDay(dia, new Date())
                    const isSelected = isSameDay(dia, diaSeleccionado)
                    return (
                        <button
                            key={dia.toISOString()}
                            onClick={() => setDiaSeleccionado(dia)}
                            className={`rounded-xl p-2 text-center transition-all cursor-pointer ${isSelected && isHoy
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : isSelected
                                    ? 'bg-accent text-accent-foreground ring-2 ring-primary/30'
                                    : isHoy
                                        ? 'bg-primary/10 text-primary font-semibold'
                                        : 'bg-muted/50 hover:bg-muted text-foreground'
                                }`}
                        >
                            <p className="text-xs uppercase tracking-wide opacity-70">{format(dia, 'EEE', { locale: es })}</p>
                            <p className="text-xl font-bold leading-tight">{format(dia, 'd')}</p>
                            {totalDia > 0 && (
                                <p className="text-xs mt-0.5 opacity-70">{totalDia} turno{totalDia > 1 ? 's' : ''}</p>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Columnas por profesional */}
            <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${profesionales.length}, 1fr)` }}>
                {profesionales.map((prof) => {
                    const turnosDia = getTurnosDia(diaSeleccionado, prof.id)
                    return (
                        <div key={prof.id}>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: prof.color_agenda }} />
                                <span className="text-sm font-semibold text-foreground">{prof.nombre} {prof.apellido}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{turnosDia.length} turnos</span>
                            </div>

                            {turnosDia.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                                    <p className="text-xs text-muted-foreground mb-2">Sin turnos este día</p>
                                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => abrirModalConProf(prof.id)}>
                                        + Agregar turno
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {turnosDia.map((turno) => (
                                        <div
                                            key={turno.id}
                                            className="rounded-xl border border-border bg-card p-3.5 transition-shadow hover:shadow-sm"
                                            style={{ borderLeftWidth: 3, borderLeftColor: turno.tipo_tratamiento?.color ?? prof.color_agenda }}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">
                                                        {turno.paciente?.apellido}, {turno.paciente?.nombre}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{turno.tipo_tratamiento?.nombre}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                        <Clock className="h-3 w-3" />
                                                        {format(parseISO(turno.fecha_inicio), 'HH:mm')} — {format(parseISO(turno.fecha_fin), 'HH:mm')}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className={`text-xs shrink-0 ${ESTADO_TURNO_COLOR[turno.estado]}`}>
                                                    {ESTADO_TURNO_LABEL[turno.estado]}
                                                </Badge>
                                            </div>

                                            <div className="flex gap-1.5 mt-2.5 flex-wrap">
                                                {turno.estado === 'PENDIENTE' && (
                                                    <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                                        onClick={() => cambiarEstado(turno.id, 'CONFIRMADO')}>
                                                        ✓ Confirmar
                                                    </Button>
                                                )}
                                                {turno.estado === 'CONFIRMADO' && (
                                                    <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-purple-300 text-purple-700"
                                                        onClick={() => cambiarEstado(turno.id, 'EN_SALA')}>
                                                        🪑 En sala
                                                    </Button>
                                                )}
                                                {turno.estado === 'EN_SALA' && (
                                                    <Button size="sm" className="h-6 text-xs px-2 bg-green-600 hover:bg-green-700"
                                                        onClick={() => cambiarEstado(turno.id, 'ATENDIDO')}>
                                                        ✓ Atendido
                                                    </Button>
                                                )}
                                                {!['ATENDIDO', 'CANCELADO', 'AUSENTE'].includes(turno.estado) && (
                                                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-destructive hover:bg-red-50"
                                                        onClick={() => cambiarEstado(turno.id, 'CANCELADO')}>
                                                        Cancelar
                                                    </Button>
                                                )}
                                                {turno.estado === 'PENDIENTE' && (
                                                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-amber-700 hover:bg-amber-50"
                                                        onClick={() => cambiarEstado(turno.id, 'AUSENTE')}>
                                                        No asistió
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Modal nuevo turno */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo turno</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Paciente *</Label>
                            <Input
                                placeholder="Buscar por nombre..."
                                value={form.paciente_nombre}
                                onChange={(e) => buscarPaciente(e.target.value)}
                            />
                            {pacientesFiltrados.length > 0 && (
                                <div className="rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
                                    {pacientesFiltrados.map((p) => (
                                        <button key={p.id} type="button"
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                            onClick={() => {
                                                setForm((f) => ({ ...f, paciente_nombre: `${p.nombre} ${p.apellido}` }))
                                                setPacientesFiltrados([])
                                            }}>
                                            {p.apellido}, {p.nombre}
                                            {p.dni && <span className="text-muted-foreground ml-1">— DNI {p.dni}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Profesional *</Label>
                                <Select value={form.profesional_id} onValueChange={(v) => setForm((f) => ({ ...f, profesional_id: v || f.profesional_id }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {profesionales.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.nombre} {p.apellido}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tratamiento *</Label>
                                <Select value={form.tipo_tratamiento_id} onValueChange={(v) => setForm((f) => ({ ...f, tipo_tratamiento_id: String(v) }))}>

                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>
                                        {tiposTratamiento.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.nombre} ({t.duracion_minutos}min)</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Fecha *</Label>
                                <Input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Hora *</Label>
                                <Input type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} step={300} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Prioridad override</Label>
                            <Select value={form.prioridad_override} onValueChange={(v) => setForm((f) => ({ ...f, prioridad_override: String(v ?? '') }))}>
                                <SelectTrigger><SelectValue placeholder="Automática (según tratamiento)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Automática</SelectItem>
                                    {(['URGENTE', 'ALTA', 'NORMAL', 'BAJA'] as PrioridadTratamiento[]).map((p) => (
                                        <SelectItem key={p} value={p}>{PRIORIDAD_LABEL[p]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Notas</Label>
                            <Textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} rows={2} placeholder="Observaciones..." />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button onClick={guardarTurno} disabled={saving}>{saving ? 'Guardando...' : 'Crear turno'}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
