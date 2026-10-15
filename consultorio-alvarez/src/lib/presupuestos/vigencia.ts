// Vigencia de presupuestos. Los precios cambian seguido, así que un presupuesto
// vale sólo unos días. El vencimiento se calcula al leer (no hay cron): un
// presupuesto PRESENTADO cuya vigencia ya pasó se muestra como VENCIDO.

export const VIGENCIA_DIAS_DEFAULT = 7

/** Suma `vigenciaDias` a `fechaPresentacion` (YYYY-MM-DD). Null si no hay fecha válida. */
export function fechaVencimiento(
    fechaPresentacion: string | null | undefined,
    vigenciaDias: number | null | undefined,
): string | null {
    if (!fechaPresentacion) return null
    const base = new Date(`${fechaPresentacion}T00:00:00`)
    if (isNaN(base.getTime())) return null
    const dias = typeof vigenciaDias === 'number' && vigenciaDias > 0 ? vigenciaDias : VIGENCIA_DIAS_DEFAULT
    base.setDate(base.getDate() + dias)
    return base.toISOString().split('T')[0]
}

interface PresupuestoVigencia {
    estado: string
    fecha_presentacion?: string | null
    vigencia_dias?: number | null
}

/**
 * Estado a MOSTRAR. Sólo un presupuesto PRESENTADO (pendiente de respuesta) pasa
 * a VENCIDO cuando su vigencia terminó; vale el día del vencimiento inclusive.
 * Los demás estados (BORRADOR/APROBADO/RECHAZADO/VENCIDO) se muestran tal cual.
 */
export function estadoEfectivo(p: PresupuestoVigencia, hoy: Date = new Date()): string {
    if (p.estado !== 'PRESENTADO') return p.estado
    const venc = fechaVencimiento(p.fecha_presentacion, p.vigencia_dias)
    if (!venc) return p.estado
    const hoyStr = hoy.toISOString().split('T')[0]
    return hoyStr > venc ? 'VENCIDO' : p.estado
}
