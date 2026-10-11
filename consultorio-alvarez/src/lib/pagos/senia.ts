// ============================================================
// Cálculo de la seña — fuente ÚNICA de verdad (DT-004).
// El monto SIEMPRE sale de las credenciales guardadas del tenant, nunca de
// un parámetro del cliente. Lo usan crearPreferenciaPagoSenia (lo que se cobra)
// y getConfiguracionSeniaPublica (lo que se muestra), para que no puedan divergir.
// ============================================================

export interface SeniaCredentials {
    cobrar_senia?: boolean
    monto_senia?: number | string
}

export function calcularSenia(input: {
    isActive: boolean | null | undefined
    credentials: SeniaCredentials | null | undefined
}): { requiereSenia: boolean; monto: number } {
    const monto = Number(input.credentials?.monto_senia)
    const requiereSenia = Boolean(input.isActive) && Boolean(input.credentials?.cobrar_senia) && Number.isFinite(monto) && monto > 0
    return { requiereSenia, monto: requiereSenia ? monto : 0 }
}
