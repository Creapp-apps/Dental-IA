import { describe, test, expect } from 'vitest'
import { grupoNotificacion, etiquetaNotificacion, rutaNotificacion } from './notificaciones'

describe('grupoNotificacion', () => {
    test('rojo -> urgente', () => {
        expect(grupoNotificacion('rojo', 'urgencia')).toBe('urgente')
    })
    test('amarillo -> requiere_respuesta', () => {
        expect(grupoNotificacion('amarillo', 'adjunto_foto')).toBe('requiere_respuesta')
    })
    test('verde operativo -> agenda', () => {
        expect(grupoNotificacion('verde', 'turno_confirmado')).toBe('agenda')
    })
    test('verde con motivo de pago -> sistema (motivo manda sobre verde)', () => {
        expect(grupoNotificacion('verde', 'pago_senia')).toBe('sistema')
    })
    test('sin prioridad ni motivo -> sistema', () => {
        expect(grupoNotificacion(null, null)).toBe('sistema')
    })
    test('motivo operativo sin prioridad -> agenda', () => {
        expect(grupoNotificacion(null, 'reserva_web')).toBe('agenda')
    })
})

describe('rutaNotificacion', () => {
    test('urgente va a mensajes', () => {
        expect(rutaNotificacion('urgente', 'abc')).toBe('/mensajes')
    })
    test('requiere_respuesta va a mensajes', () => {
        expect(rutaNotificacion('requiere_respuesta', 'abc')).toBe('/mensajes')
    })
    test('agenda va a agenda con turno', () => {
        expect(rutaNotificacion('agenda', 't1')).toBe('/agenda?turno=t1')
    })
    test('agenda sin referencia va a agenda', () => {
        expect(rutaNotificacion('agenda', null)).toBe('/agenda')
    })
})

describe('etiquetaNotificacion', () => {
    test('adjunto_foto reusa la etiqueta de triage', () => {
        expect(etiquetaNotificacion('amarillo', 'adjunto_foto')).toContain('foto')
    })
    test('turno_confirmado usa la etiqueta operativa', () => {
        expect(etiquetaNotificacion('verde', 'turno_confirmado')).toBe('✅ Confirmación')
    })
    test('sin motivo cae en rótulo por grupo', () => {
        expect(etiquetaNotificacion('rojo', null)).toBe('🚨 Urgente')
    })
})
