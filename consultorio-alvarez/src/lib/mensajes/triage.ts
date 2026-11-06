// Lógica pura de triage de la bandeja de mensajes (sin dependencias).

export type Carril = 'rojo' | 'amarillo' | 'azul' | 'verde'
export type Prioridad = 'rojo' | 'amarillo' | 'verde'

export const MOTIVOS: Record<string, { carril: Prioridad; etiqueta: string }> = {
    urgencia: { carril: 'rojo', etiqueta: '🚨 Dolor / urgencia' },
    guardia: { carril: 'rojo', etiqueta: '🚨 Guardia a validar' },
    queja: { carril: 'rojo', etiqueta: '😠 Reclamo / queja' },
    pide_recepcion: { carril: 'amarillo', etiqueta: '💬 Pide recepción' },
    adjunto_foto: { carril: 'amarillo', etiqueta: '📎 Mandó una foto' },
    adjunto_audio: { carril: 'amarillo', etiqueta: '🎤 Mandó un audio' },
    adjunto_documento: { carril: 'amarillo', etiqueta: '📄 Mandó un documento' },
    dato_clinico: { carril: 'amarillo', etiqueta: '🩺 Dato clínico' },
    turno_especial: { carril: 'amarillo', etiqueta: '🦷 Turno especial' },
    cambio_cancelacion: { carril: 'amarillo', etiqueta: '📅 Quiere cambiar/cancelar' },
    reprogramar: { carril: 'amarillo', etiqueta: '📅 Quiere reprogramar' },
    numero_equivocado: { carril: 'amarillo', etiqueta: '⚠️ Número equivocado' },
    bot_no_entendio: { carril: 'amarillo', etiqueta: '🤖 El bot no entendió' },
    revisar: { carril: 'amarillo', etiqueta: '📋 Revisar' },
    turno_confirmado: { carril: 'verde', etiqueta: '✅ Turno confirmado' },
}

export function carrilDe(input: {
    estado: string
    prioridad: Prioridad | null
    motivo: string | null
    asignadoNombre?: string | null
}): { carril: Carril; etiqueta: string } {
    const { estado, prioridad, motivo, asignadoNombre } = input

    if (estado === 'HUMANO_ATENDIENDO') {
        return { carril: 'azul', etiqueta: '👤 Atiende: ' + (asignadoNombre || 'operador') }
    }
    if (estado === 'BOT') {
        return {
            carril: 'verde',
            etiqueta: motivo === 'turno_confirmado' ? MOTIVOS.turno_confirmado.etiqueta : '🤖 Bot gestionando',
        }
    }
    // HUMANO_PENDIENTE (y cualquier otro estado no cerrado): nunca se oculta
    return {
        carril: prioridad ?? 'amarillo',
        etiqueta: (motivo && MOTIVOS[motivo]?.etiqueta) || MOTIVOS.revisar.etiqueta,
    }
}

export function rango(p: Prioridad | null): number {
    return p === 'rojo' ? 3 : p === 'amarillo' ? 2 : p === 'verde' ? 1 : 0
}

/** Regla de no-degradar: sólo estampa si la nueva prioridad es >= a la actual. */
export function debeEstampar(actual: Prioridad | null, nueva: Prioridad): boolean {
    return rango(nueva) >= rango(actual)
}
